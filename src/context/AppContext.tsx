


import React, { useState, useCallback, useMemo } from 'react';
import { mockUsers, mockShipments, mockClientTransactions, mockNotifications, mockCourierStats, mockCourierTransactions, mockFinancialSettings } from '../data';
import type { User, Shipment, Toast, ClientTransaction, Notification, CourierStats, CourierTransaction, FinancialSettings, AdminFinancials, ClientFinancialSummary } from '../types';
import { UserRole, ShipmentStatus, PaymentMethod, TransactionType, NotificationChannel, CommissionType, CourierTransactionType, CourierTransactionStatus, ShipmentPriority } from '../types';
import { sendEmailNotification } from '../api/email';

// --- App State Context ---
type NotificationStatus = 'sending' | 'sent' | 'failed';

export type AppContextType = {
    currentUser: User | null;
    users: User[];
    shipments: Shipment[];
    clientTransactions: ClientTransaction[];
    toasts: Toast[];
    notifications: Notification[];
    notificationStatus: Record<string, NotificationStatus>;
    courierStats: CourierStats[];
    courierTransactions: CourierTransaction[];
    financialSettings: FinancialSettings;
    login: (email: string, password: string) => boolean;
    logout: () => void;
    addShipment: (shipment: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate' | 'status'>) => void;
    updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, details?: { courierId?: number; signature?: string }) => Promise<void>;
    assignShipmentToCourier: (shipmentId: string, courierId: number) => Promise<boolean>;
    reassignCourier: (shipmentId: string, newCourierId: number) => Promise<void>;
    assignReturn: (shipmentId: string, courierId: number) => Promise<boolean>;
    addUser: (userData: Omit<User, 'id'>) => void;
    updateUser: (userId: number, userData: Partial<Omit<User, 'id'>>, silent?: boolean) => void;
    removeUser: (userId: number) => void;
    resetPassword: (userId: number, newPassword: string) => void;
    addToast: (message: string, type: Toast['type']) => void;
    topUpWallet: (userId: number, amount: number) => void;
    resendNotification: (notificationId: string) => Promise<void>;
    canCourierReceiveAssignment: (courierId: number) => boolean;
    updateCourierSettings: (courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) => void;
    applyManualPenalty: (courierId: number, amount: number, description: string) => void;
    processCourierPayout: (transactionId: string) => void;
    requestCourierPayout: (courierId: number, amount: number) => void;
    trackShipment: (trackingId: string, phone: string) => Shipment | null;
    updateClientFlatRate: (clientId: number, flatRate: number) => void;
    updateClientTaxCard: (clientId: number, taxCardNumber: string) => void;
    getTaxCardNumber: (clientId: number) => string;
    getAdminFinancials: () => AdminFinancials;
    getClientFinancials: () => ClientFinancialSummary[];
    canAccessAdminFinancials: (user: User) => boolean;
    canCreateUsers: (user: User) => boolean;
};

export const AppContext = React.createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [shipments, setShipments] = useState<Shipment[]>(mockShipments);
    const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>(mockClientTransactions);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [notificationStatus, setNotificationStatus] = useState<Record<string, NotificationStatus>>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // New Financial State
    const [courierStats, setCourierStats] = useState<CourierStats[]>(mockCourierStats);
    const [courierTransactions, setCourierTransactions] = useState<CourierTransaction[]>(mockCourierTransactions);
    const [financialSettings] = useState<FinancialSettings>(mockFinancialSettings);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);
    
    // --- Financial Logic ---

    const calculatePerformanceRating = useCallback((courier: CourierStats, latestDeliverySuccess: boolean): number => {
      const totalDeliveries = courier.deliveriesCompleted + courier.deliveriesFailed;
      if (totalDeliveries === 0) return 5.0;
      
      const completed = latestDeliverySuccess ? courier.deliveriesCompleted + 1 : courier.deliveriesCompleted;
      const failed = latestDeliverySuccess ? courier.deliveriesFailed : courier.deliveriesFailed + 1;
      
      const updatedTotal = completed + failed;
      const successRate = completed / updatedTotal;
      let rating = successRate * 5;
      
      const consecutiveFailures = latestDeliverySuccess ? 0 : courier.consecutiveFailures + 1;
      if (consecutiveFailures >= 3) rating -= 1.0;
      else if (consecutiveFailures >= 2) rating -= 0.5;
      
      if (successRate >= 0.95 && completed >= 10) rating += 0.2;
      
      return Math.max(1.0, Math.min(5.0, Math.round(rating * 10) / 10));
    }, []);

    const calculateCommission = useCallback((shipment: Shipment, courier: CourierStats): number => {
      let baseCommission: number;
      if (courier.commissionType === CommissionType.PERCENTAGE) {
          baseCommission = shipment.price * (courier.commissionValue / 100);
      } else {
          baseCommission = courier.commissionValue;
      }
      
      if (shipment.priority === ShipmentPriority.URGENT) baseCommission += financialSettings.urgentDeliveryBonus;
      else if (shipment.priority === ShipmentPriority.EXPRESS) baseCommission += financialSettings.expressDeliveryBonus;
      
      if (courier.performanceRating >= 4.5) baseCommission *= 1.1;
      else if (courier.performanceRating >= 4.0) baseCommission *= 1.05;
      
      if (shipment.packageValue > 1000) baseCommission += Math.min(shipment.packageValue * 0.001, 20);
      
      return Math.round(baseCommission * 100) / 100;
    }, [financialSettings]);

    const handleDeliveryCompletion = useCallback((shipment: Shipment, success: boolean) => {
        if (!shipment.courierId) return;
        const courierId = shipment.courierId;

        setCourierStats(prevStats => prevStats.map(courier => {
            if (courier.courierId === courierId) {
                if (success) {
                    const commission = calculateCommission(shipment, courier);
                    const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.COMMISSION, amount: commission, description: `Commission for ${shipment.id}`, shipmentId: shipment.id, timestamp: new Date().toISOString(), status: CourierTransactionStatus.PROCESSED };
                    setCourierTransactions(prev => [transaction, ...prev]);
                    
                    return { ...courier, deliveriesCompleted: courier.deliveriesCompleted + 1, totalEarnings: courier.totalEarnings + commission, pendingEarnings: courier.pendingEarnings + commission, currentBalance: courier.currentBalance + commission, consecutiveFailures: 0, lastDeliveryDate: new Date().toISOString(), performanceRating: calculatePerformanceRating(courier, true) };
                } else {
                    const penalty = financialSettings.penaltyAmount; // Use the global penalty setting
                    const newConsecutiveFailures = courier.consecutiveFailures + 1;
                    const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.PENALTY, amount: -penalty, description: `Penalty for ${shipment.id}`, shipmentId: shipment.id, timestamp: new Date().toISOString(), status: CourierTransactionStatus.PROCESSED };
                    setCourierTransactions(prev => [transaction, ...prev]);
                    
                    const newPerfRating = calculatePerformanceRating(courier, false);
                    const shouldRestrict = newConsecutiveFailures >= financialSettings.consecutiveFailureLimit || newPerfRating < financialSettings.performanceThreshold;
                    
                    return { ...courier, deliveriesFailed: courier.deliveriesFailed + 1, currentBalance: courier.currentBalance - penalty, consecutiveFailures: newConsecutiveFailures, isRestricted: shouldRestrict, restrictionReason: shouldRestrict ? `Performance rating below threshold` : undefined, performanceRating: newPerfRating };
                }
            }
            return courier;
        }));
        
        addToast( success ? 'Delivery completed! Commission added.' : 'Delivery failed. Penalty applied.', success ? 'success' : 'error');
    }, [calculateCommission, financialSettings, addToast, calculatePerformanceRating]);

    // --- User & Auth ---
    
    const login = useCallback((email: string, password: string): boolean => {
        const userToLogin = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (userToLogin) {
            setCurrentUser(userToLogin);
            addToast(`Welcome back, ${userToLogin.name}!`, 'success');
            return true;
        }
        addToast('Invalid email or password.', 'error');
        return false;
    }, [users, addToast]);

    const logout = useCallback(() => {
        addToast("You have been logged out.", 'info');
        setCurrentUser(null)
    }, [addToast]);

    // Role-based access control functions
    const canAccessAdminFinancials = useCallback((user: User): boolean => {
        return user.role === UserRole.ADMIN;
    }, []);

    const canCreateUsers = useCallback((user: User): boolean => {
        return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_USER;
    }, []);
    
    const addUser = useCallback((userData: Omit<User, 'id'>) => {
        if (!currentUser || !canCreateUsers(currentUser)) {
            addToast('You do not have permission to create users.', 'error');
            return;
        }
        
        const newUserData = { ...userData };
        
        // Set default flat rate fee for new clients
        if (newUserData.role === UserRole.CLIENT && !newUserData.flatRateFee) {
            newUserData.flatRateFee = 5.0; // Default flat rate fee
        }
        
        const newUser: User = { ...newUserData, id: Math.max(...users.map(u => u.id), 0) + 1 };
        setUsers(prev => [...prev, newUser]);
        
        if(newUser.role === UserRole.COURIER) {
            const newCourierStat: CourierStats = { 
                courierId: newUser.id, 
                deliveriesCompleted: 0, 
                deliveriesFailed: 0, 
                totalEarnings: 0, 
                pendingEarnings: 0, 
                currentBalance: 0, 
                commissionType: CommissionType.FLAT, 
                commissionValue: financialSettings.baseCommissionRate, 
                consecutiveFailures: 0, 
                isRestricted: false, 
                performanceRating: 5.0 
            };
            setCourierStats(prev => [...prev, newCourierStat]);
        }
        addToast(`User "${newUser.name}" created successfully.`, 'success');
    }, [users, addToast, financialSettings, currentUser, canCreateUsers]);

    const updateUser = useCallback((userId: number, userData: Partial<Omit<User, 'id'>>, silent = false) => {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...userData } : u)));
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, ...userData } : null);
        }
        if (!silent) addToast(`User details updated.`, 'success');
    }, [currentUser?.id, addToast]);

    const removeUser = useCallback((userId: number) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        addToast(`User removed from the system.`, 'success');
    }, [addToast]);

    const resetPassword = useCallback((userId: number, newPassword: string) => {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, password: newPassword } : u)));
        const user = users.find(u => u.id === userId);
        if (user) addToast(`Password for ${user.name} has been reset.`, 'success');
    }, [users, addToast]);

    // --- Shipment Logic ---

    const addShipment = useCallback((newShipmentData: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate' | 'status'>) => {
        if (!currentUser || currentUser.role !== UserRole.CLIENT) return;
        
        if(newShipmentData.paymentMethod === PaymentMethod.WALLET) {
            if((currentUser.walletBalance ?? 0) < newShipmentData.price) {
                addToast('Insufficient wallet balance.', 'error'); return;
            }
            const newBalance = (currentUser.walletBalance ?? 0) - newShipmentData.price;
            updateUser(currentUser.id, { walletBalance: newBalance });
            
            const newTransaction: ClientTransaction = { id: 'TXN' + Math.floor(Math.random() * 900000 + 100000), userId: currentUser.id, type: TransactionType.PAYMENT, amount: -newShipmentData.price, date: new Date().toISOString(), description: `Payment for shipment to ${newShipmentData.recipientName}` };
            setClientTransactions(prev => [newTransaction, ...prev]);
        }

        const newShipment: Shipment = { ...newShipmentData, id: 'FLS' + Math.floor(Math.random() * 900000 + 100000), clientId: currentUser.id, clientName: currentUser.name, creationDate: new Date().toISOString(), status: ShipmentStatus.PENDING_ASSIGNMENT, };
        setShipments(prev => [newShipment, ...prev]);
        addToast(`New shipment ${newShipment.id} created!`, 'success');
    }, [currentUser, addToast, updateUser]);

    // --- Notification Logic ---

    const createAndSendNotification = useCallback(async (shipment: Shipment, newStatus: ShipmentStatus) => {
        let recipientEmail: string | undefined, message: string | undefined, subject: string | undefined;
        const client = users.find(u => u.id === shipment.clientId), adminUser = users.find(u => u.role === UserRole.ADMIN);
        switch (newStatus) {
            case ShipmentStatus.OUT_FOR_DELIVERY: recipientEmail = client?.email; subject = `Your Flash Shipment ${shipment.id} is Out for Delivery!`; message = `Hi ${client?.name},\n\nGreat news! Your shipment to ${shipment.recipientName} is now out for delivery.\n\nBest,\nThe Flash Express Team`; break;
            case ShipmentStatus.DELIVERED: recipientEmail = client?.email; subject = `Your Flash Shipment ${shipment.id} has been Delivered!`; message = `Hi ${client?.name},\n\nYour shipment to ${shipment.recipientName} has been successfully delivered. Thank you for using Flash Express!\n\nBest,\nThe Flash Express Team`; break;
            case ShipmentStatus.RETURN_REQUESTED: recipientEmail = adminUser?.email; subject = `Return Request for Shipment ${shipment.id}`; message = `Admin,\n\nClient ${shipment.clientName} (ID: ${shipment.clientId}) has requested a return for shipment ${shipment.id}.\n\nPlease review and assign a courier from the 'Manage Returns' portal.`; break;
            case ShipmentStatus.RETURN_IN_PROGRESS: recipientEmail = client?.email; subject = `Your Return for Shipment ${shipment.id} is In Progress`; message = `Hi ${client?.name},\n\nA courier has been assigned for the return of shipment ${shipment.id}. They will be in contact shortly.\n\nBest,\nThe Flash Express Team`; break;
            case ShipmentStatus.RETURNED: recipientEmail = client?.email; subject = `Your Return for Shipment ${shipment.id} is Complete`; message = `Hi ${client?.name},\n\nThe return for shipment ${shipment.id} has been successfully completed.\n\nBest,\nThe Flash Express Team`; break;
            default: return;
        }
        if (recipientEmail && message && subject) {
            const newNotification: Notification = { id: 'NOTIF' + Math.floor(Math.random() * 900000 + 100000), shipmentId: shipment.id, channel: NotificationChannel.EMAIL, recipient: recipientEmail, message: `${subject}\n\n${message}`, date: new Date().toISOString(), status: newStatus, sent: false, };
            setNotifications(prev => [newNotification, ...prev]);
            try {
                addToast(`Sending status update...`, 'info');
                setNotificationStatus(prev => ({...prev, [newNotification.id]: 'sending'}));
                await sendEmailNotification(newNotification);
                setNotifications(prev => prev.map(n => n.id === newNotification.id ? { ...n, sent: true } : n));
                setNotificationStatus(prev => ({...prev, [newNotification.id]: 'sent'}));
                addToast(`Email for ${shipment.id} sent successfully.`, 'success');
            } catch (error) {
                console.error("Failed to send notification:", error);
                setNotificationStatus(prev => ({...prev, [newNotification.id]: 'failed'}));
                addToast(`Failed to send email for ${shipment.id}.`, 'error');
            }
        }
    }, [users, addToast]);
    
    // --- Core Actions ---

    const updateShipmentStatus = useCallback(async (shipmentId: string, status: ShipmentStatus, details?: { courierId?: number; signature?: string }) => {
        let updatedShipment: Shipment | undefined;
        setShipments(prev => prev.map(s => {
            if (s.id === shipmentId) {
                updatedShipment = { ...s, status, deliveryDate: status === ShipmentStatus.DELIVERED ? new Date().toISOString() : s.deliveryDate, signature: details?.signature ?? s.signature, courierId: details?.courierId ?? s.courierId, };
                return updatedShipment;
            }
            return s;
        }));
        
        addToast(`Shipment ${shipmentId} updated to "${status}".`, 'info');

        if (updatedShipment) {
            if (status === ShipmentStatus.DELIVERED) handleDeliveryCompletion(updatedShipment, true);
            if (status === ShipmentStatus.DELIVERY_FAILED) handleDeliveryCompletion(updatedShipment, false);
            await createAndSendNotification(updatedShipment, status);
        }
    }, [addToast, createAndSendNotification, handleDeliveryCompletion]);
    
    const canCourierReceiveAssignment = useCallback((courierId: number): boolean => {
        const courier = courierStats.find(c => c.courierId === courierId);
        if (!courier) return false;
        if (courier.isRestricted) return false;
        if (courier.performanceRating < financialSettings.performanceThreshold) return false;
        if (courier.consecutiveFailures >= financialSettings.consecutiveFailureLimit) return false;
        return true;
    }, [courierStats, financialSettings]);

    const assignShipmentToCourier = useCallback(async (shipmentId: string, courierId: number): Promise<boolean> => {
        if (!canCourierReceiveAssignment(courierId)) {
            const courierUser = users.find(u => u.id === courierId);
            const courierStat = courierStats.find(c => c.courierId === courierId);
            addToast(`Cannot assign to ${courierUser?.name}: ${courierStat?.restrictionReason || 'Performance restrictions'}`, 'error');
            return false;
        }
        // Automatically mark as IN_TRANSIT when assigned to courier (skip pickup step)
        await updateShipmentStatus(shipmentId, ShipmentStatus.IN_TRANSIT, { courierId });
        const courier = users.find(u => u.id === courierId);
        if(courier) addToast(`Shipment ${shipmentId} assigned to ${courier.name} and marked as in transit.`, 'success');
        return true;
    }, [updateShipmentStatus, users, addToast, canCourierReceiveAssignment, courierStats]);
    
    const reassignCourier = useCallback(async (shipmentId: string, newCourierId: number) => {
        await updateShipmentStatus(shipmentId, ShipmentStatus.IN_TRANSIT, { courierId: newCourierId });
        const courier = users.find(u => u.id === newCourierId);
        if(courier) addToast(`Shipment ${shipmentId} re-assigned to ${courier.name} and marked as in transit.`, 'success');
    }, [updateShipmentStatus, users, addToast]);
    
    const assignReturn = useCallback(async (shipmentId: string, courierId: number): Promise<boolean> => {
        if (!canCourierReceiveAssignment(courierId)) {
            const courierUser = users.find(u => u.id === courierId);
            addToast(`Cannot assign to ${courierUser?.name} due to restrictions.`, 'error');
            return false;
        }
        await updateShipmentStatus(shipmentId, ShipmentStatus.RETURN_IN_PROGRESS, { courierId });
        const courier = users.find(u => u.id === courierId);
        if(courier) addToast(`Return for ${shipmentId} assigned to ${courier.name}.`, 'success');
        return true;
    }, [updateShipmentStatus, users, addToast, canCourierReceiveAssignment]);

    const topUpWallet = useCallback((userId: number, amount: number) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const newBalance = (user.walletBalance ?? 0) + amount;
        updateUser(userId, { walletBalance: newBalance });

        const newTransaction: ClientTransaction = { id: 'TXN' + Math.floor(Math.random() * 900000 + 100000), userId, type: TransactionType.DEPOSIT, amount, date: new Date().toISOString(), description: `Wallet top-up` };
        setClientTransactions(prev => [newTransaction, ...prev]);
        addToast(`Successfully added ${amount.toFixed(2)} EGP to your wallet.`, 'success');
    }, [users, updateUser, addToast]);
    
    const resendNotification = useCallback(async (notificationId: string) => {
        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;
        try {
            addToast(`Resending email...`, 'info');
            setNotificationStatus(prev => ({...prev, [notification.id]: 'sending'}));
            await sendEmailNotification(notification);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, sent: true } : n));
            setNotificationStatus(prev => ({...prev, [notification.id]: 'sent'}));
            addToast(`Email for ${notification.shipmentId} resent successfully.`, 'success');
        } catch (error) {
            setNotificationStatus(prev => ({...prev, [notification.id]: 'failed'}));
            addToast(`Failed to resend email for ${notification.shipmentId}.`, 'error');
        }
    }, [notifications, addToast]);

    const updateCourierSettings = useCallback((courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) => {
        setCourierStats(prev => prev.map(c => c.courierId === courierId ? { ...c, ...newSettings } : c));
        const courier = users.find(u => u.id === courierId);
        addToast(`Financial settings for ${courier?.name} have been updated.`, 'success');
    }, [users, addToast]);

    const applyManualPenalty = useCallback((courierId: number, amount: number, description: string) => {
        const positiveAmount = Math.abs(amount);
        setCourierStats(prev => prev.map(c => c.courierId === courierId ? { ...c, currentBalance: c.currentBalance - positiveAmount, totalEarnings: c.totalEarnings - positiveAmount } : c));
        const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.PENALTY, amount: -positiveAmount, description, timestamp: new Date().toISOString(), status: CourierTransactionStatus.PROCESSED };
        setCourierTransactions(prev => [transaction, ...prev]);
        const courier = users.find(u => u.id === courierId);
        addToast(`Penalty of ${positiveAmount} EGP applied to ${courier?.name}.`, 'success');
    }, [users, addToast]);
    
    const requestCourierPayout = useCallback((courierId: number, amount: number) => {
        setCourierStats(prev => prev.map(c => c.courierId === courierId ? { ...c, pendingEarnings: c.pendingEarnings - amount } : c));
        const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.WITHDRAWAL_REQUEST, amount: -amount, description: 'Payout requested', timestamp: new Date().toISOString(), status: CourierTransactionStatus.PENDING };
        setCourierTransactions(prev => [transaction, ...prev]);
        addToast(`Payout of ${amount} EGP requested.`, 'success');
    }, [addToast]);

    const processCourierPayout = useCallback((transactionId: string) => {
        const transaction = courierTransactions.find(t => t.id === transactionId);
        if (!transaction) return;
        setCourierTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: CourierTransactionStatus.PROCESSED, description: 'Payout processed by admin' } : t));
        setCourierStats(prev => prev.map(c => c.courierId === transaction.courierId ? { ...c, currentBalance: c.currentBalance + transaction.amount } : c)); // amount is negative
        addToast(`Payout for transaction ${transactionId} processed.`, 'success');
    }, [courierTransactions, addToast]);
    
    const trackShipment = useCallback((trackingId: string, phone: string): Shipment | null => {
        const shipment = shipments.find(s => s.id.toLowerCase() === trackingId.toLowerCase());
        if (!shipment) return null;

        const client = users.find(u => u.id === shipment.clientId);
        
        if (shipment.recipientPhone === phone || client?.phone === phone) {
            return shipment;
        }
        
        return null;
    }, [shipments, users]);

    // New role-based access control functions
    const updateClientFlatRate = useCallback((clientId: number, flatRate: number) => {
        if (!currentUser || currentUser.role !== UserRole.ADMIN) {
            addToast('Only admins can update client flat rates.', 'error');
            return;
        }
        setUsers(prev => prev.map(u => u.id === clientId ? { ...u, flatRateFee: flatRate } : u));
        const client = users.find(u => u.id === clientId);
        addToast(`Flat rate for ${client?.name} updated to ${flatRate.toFixed(2)} EGP.`, 'success');
    }, [currentUser, users, addToast]);

    const updateClientTaxCard = useCallback((clientId: number, taxCardNumber: string) => {
        if (!currentUser || currentUser.role !== UserRole.ADMIN) {
            addToast('Only admins can update client tax card numbers.', 'error');
            return;
        }
        setUsers(prev => prev.map(u => u.id === clientId ? { ...u, taxCardNumber } : u));
        const client = users.find(u => u.id === clientId);
        addToast(`Tax card number for ${client?.name} updated successfully.`, 'success');
    }, [currentUser, users, addToast]);

    const getTaxCardNumber = useCallback((clientId: number): string => {
        const client = users.find(u => u.id === clientId);
        return client?.taxCardNumber || '';
    }, [users]);

    const getAdminFinancials = useCallback((): AdminFinancials => {
        const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED);
        const grossRevenue = deliveredShipments.reduce((sum, s) => sum + s.price, 0);
        
        let totalClientFees = 0;
        deliveredShipments.forEach(shipment => {
            const client = users.find(u => u.id === shipment.clientId);
            if (client?.flatRateFee) {
                totalClientFees += client.flatRateFee;
            }
        });
        
        const netRevenue = grossRevenue - totalClientFees;
        const totalOrders = deliveredShipments.length;
        
        return {
            grossRevenue,
            netRevenue,
            totalClientFees,
            totalOrders,
            taxCarNumber: '' // No longer applicable since tax cards are per client
        };
    }, [shipments, users]);

    const getClientFinancials = useCallback((): ClientFinancialSummary[] => {
        const clientUsers = users.filter(u => u.role === UserRole.CLIENT);
        return clientUsers.map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id && s.status === ShipmentStatus.DELIVERED);
            const totalOrders = clientShipments.length;
            const orderSum = clientShipments.reduce((sum, s) => sum + s.price, 0);
            
            return {
                clientId: client.id,
                clientName: client.name,
                totalOrders,
                orderSum,
                flatRateFee: client.flatRateFee || 0
            };
        });
    }, [users, shipments]);

    const value = useMemo(() => ({ 
        currentUser, 
        users, 
        shipments, 
        clientTransactions, 
        toasts, 
        notifications, 
        notificationStatus, 
        courierStats, 
        courierTransactions, 
        financialSettings, 
        login, 
        logout, 
        addShipment, 
        updateShipmentStatus, 
        assignShipmentToCourier, 
        addUser, 
        updateUser, 
        removeUser, 
        resetPassword, 
        addToast, 
        topUpWallet, 
        assignReturn, 
        reassignCourier, 
        resendNotification, 
        canCourierReceiveAssignment, 
        updateCourierSettings, 
        applyManualPenalty, 
        processCourierPayout, 
        requestCourierPayout, 
        trackShipment,
        updateClientFlatRate,
        updateClientTaxCard,
        getTaxCardNumber,
        getAdminFinancials,
        getClientFinancials,
        canAccessAdminFinancials,
        canCreateUsers
    }), [
        currentUser, 
        users, 
        shipments, 
        clientTransactions, 
        toasts, 
        notifications, 
        notificationStatus, 
        courierStats, 
        courierTransactions, 
        financialSettings, 
        login, 
        logout, 
        addShipment, 
        updateShipmentStatus, 
        assignShipmentToCourier, 
        addUser, 
        updateUser, 
        removeUser, 
        resetPassword, 
        addToast, 
        topUpWallet, 
        assignReturn, 
        reassignCourier, 
        resendNotification, 
        canCourierReceiveAssignment, 
        updateCourierSettings, 
        applyManualPenalty, 
        processCourierPayout, 
        requestCourierPayout, 
        trackShipment,
        updateClientFlatRate,
        updateClientTaxCard,
        getTaxCardNumber,
        getAdminFinancials,
        getClientFinancials,
        canAccessAdminFinancials,
        canCreateUsers
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};