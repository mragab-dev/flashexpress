

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { mockUsers, mockShipments, mockNotifications, mockCourierStats, mockFinancialSettings } from '../data';
import type { User, Shipment, Toast, ClientTransaction, Notification, CourierStats, CourierTransaction, FinancialSettings, AdminFinancials, ClientFinancialSummary } from '../types';
import { UserRole, ShipmentStatus, PaymentMethod, TransactionType, NotificationChannel, CommissionType, CourierTransactionType, CourierTransactionStatus } from '../types';
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
    updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, details?: { courierId?: number; signature?: string; }) => Promise<void>;
    updateShipmentFees: (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => void;
    assignShipmentToCourier: (shipmentId: string, courierId: number) => Promise<boolean>;
    reassignCourier: (shipmentId: string, newCourierId: number) => Promise<void>;
    assignReturn: (shipmentId: string, courierId: number) => Promise<boolean>;
    addUser: (userData: Omit<User, 'id'>) => void;
    updateUser: (userId: number, userData: Partial<Omit<User, 'id'>>, silent?: boolean) => void;
    removeUser: (userId: number) => void;
    resetPassword: (userId: number, newPassword: string) => void;
    addToast: (message: string, type: Toast['type']) => void;
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
    calculateCommission: (shipment: Shipment, courier: CourierStats) => number;
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
    const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [notificationStatus, setNotificationStatus] = useState<Record<string, NotificationStatus>>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // New Financial State
    const [rawCourierStats, setRawCourierStats] = useState<CourierStats[]>(mockCourierStats);
    const [courierTransactions, setCourierTransactions] = useState<CourierTransaction[]>([]);
    const [financialSettings] = useState<FinancialSettings>(mockFinancialSettings);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    // --- Dynamic Balance Calculation ---
    const walletBalance = useMemo(() => {
        if (!currentUser) return 0;
        return clientTransactions
            .filter(t => t.userId === currentUser.id)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
    }, [clientTransactions, currentUser]);

    const currentUserWithBalance = useMemo(() => {
        if (!currentUser) return null;
        return {
            ...currentUser,
            walletBalance,
        };
    }, [currentUser, walletBalance]);
    
    // --- Financial Logic ---

    // --- Data Initialization Effect ---
    useEffect(() => {
        const initialClientTransactions: ClientTransaction[] = [];
        const initialCourierTransactions: CourierTransaction[] = [];

        // Loop through all shipments to generate initial transactions based on mock data
        for (const shipment of mockShipments) {
            // 1. Generate client transactions for DELIVERED COD shipments
            if (shipment.status === ShipmentStatus.DELIVERED && shipment.paymentMethod === PaymentMethod.COD && shipment.packageValue > 0) {
                initialClientTransactions.push({
                    id: `TXN-COD-${shipment.id}`,
                    userId: shipment.clientId,
                    type: TransactionType.DEPOSIT,
                    amount: shipment.packageValue,
                    date: shipment.deliveryDate || new Date().toISOString(),
                    description: `COD collection for shipment ${shipment.id}`
                });
            }

            // 2. Generate client transactions for WALLET payments
            if (shipment.paymentMethod === PaymentMethod.WALLET) {
                 initialClientTransactions.push({
                    id: `TXN-PAY-${shipment.id}`,
                    userId: shipment.clientId,
                    type: TransactionType.PAYMENT,
                    amount: -(shipment.clientFlatRateFee || 0), // Deduct only the shipping fee
                    date: shipment.creationDate,
                    description: `Payment for shipment ${shipment.id}`
                });
            }

            // 3. Generate courier commission transactions for completed (delivered/returned) shipments
            if ((shipment.status === ShipmentStatus.DELIVERED || shipment.status === ShipmentStatus.RETURNED) && shipment.courierId && typeof shipment.courierCommission === 'number') {
                initialCourierTransactions.push({
                    id: `txn-init-${shipment.id}`,
                    courierId: shipment.courierId,
                    type: CourierTransactionType.COMMISSION,
                    amount: shipment.courierCommission,
                    description: `Commission for ${shipment.id}`,
                    shipmentId: shipment.id,
                    timestamp: shipment.deliveryDate || new Date().toISOString(),
                    status: CourierTransactionStatus.PROCESSED
                });
            }
        }
        
        setClientTransactions(initialClientTransactions);
        setCourierTransactions(initialCourierTransactions);
    }, []); // Run only once on mount to seed data

    // Derive real-time courier stats from raw data
    const courierStats = useMemo((): CourierStats[] => {
        return rawCourierStats.map(statConfig => {
            const courierId = statConfig.courierId;
            const transactions = courierTransactions.filter(t => t.courierId === courierId);
            
            const deliveredCount = shipments.filter(s => s.courierId === courierId && (s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.RETURNED)).length;
            const failedCount = shipments.filter(s => s.courierId === courierId && s.status === ShipmentStatus.DELIVERY_FAILED).length;

            const totalEarnings = transactions
                .filter(t => (t.type === CourierTransactionType.COMMISSION || t.type === CourierTransactionType.BONUS) && t.status === CourierTransactionStatus.PROCESSED)
                .reduce((sum, t) => sum + t.amount, 0);

            const currentBalance = transactions
                .filter(t => t.status === CourierTransactionStatus.PROCESSED)
                .reduce((sum, t) => sum + t.amount, 0);
            
            const totalPayouts = transactions
                .filter(t => t.type === CourierTransactionType.WITHDRAWAL_REQUEST || t.type === CourierTransactionType.WITHDRAWAL_PROCESSED)
                .reduce((sum, t) => sum - t.amount, 0);

            const pendingEarnings = totalEarnings - totalPayouts;

            return {
                ...statConfig,
                deliveriesCompleted: deliveredCount,
                deliveriesFailed: failedCount,
                totalEarnings,
                currentBalance,
                pendingEarnings: Math.max(0, pendingEarnings),
            };
        });
    }, [rawCourierStats, courierTransactions, shipments]);

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
      
      return Math.round(baseCommission * 100) / 100;
    }, []);

    const handleDeliveryCompletion = useCallback((shipment: Shipment, success: boolean) => {
        if (!shipment.courierId) return;
        const courierId = shipment.courierId;
        
        if (success) {
            const commission = shipment.courierCommission;
            if (typeof commission !== 'number') {
                addToast(`Critical error: Missing commission snapshot for shipment ${shipment.id}. Payout cannot be processed.`, 'error');
                return;
            }
            const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.COMMISSION, amount: commission, description: `Commission for ${shipment.id}`, shipmentId: shipment.id, timestamp: new Date().toISOString(), status: CourierTransactionStatus.PROCESSED };
            setCourierTransactions(prev => [transaction, ...prev]);
        } else {
            const penalty = financialSettings.penaltyAmount;
            const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.PENALTY, amount: -penalty, description: `Penalty for ${shipment.id}`, shipmentId: shipment.id, timestamp: new Date().toISOString(), status: CourierTransactionStatus.PROCESSED };
            setCourierTransactions(prev => [transaction, ...prev]);
        }
        
        setRawCourierStats(prevStats => prevStats.map(courier => {
            if (courier.courierId === courierId) {
                const currentStats = courierStats.find(cs => cs.courierId === courierId) || courier;
                if (success) {
                    return { ...courier, consecutiveFailures: 0, lastDeliveryDate: new Date().toISOString(), performanceRating: calculatePerformanceRating(currentStats, true) };
                } else {
                    const newConsecutiveFailures = courier.consecutiveFailures + 1;
                    const newPerfRating = calculatePerformanceRating(currentStats, false);
                    const shouldRestrict = newConsecutiveFailures >= financialSettings.consecutiveFailureLimit || newPerfRating < financialSettings.performanceThreshold;
                    return { ...courier, consecutiveFailures: newConsecutiveFailures, isRestricted: shouldRestrict, restrictionReason: shouldRestrict ? `Performance rating below threshold` : undefined, performanceRating: newPerfRating };
                }
            }
            return courier;
        }));
        
        addToast( success ? 'Delivery completed! Commission processed.' : 'Delivery failed. Penalty applied.', success ? 'success' : 'error');
    }, [financialSettings, addToast, calculatePerformanceRating, courierStats]);

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
        if (newUserData.role === UserRole.CLIENT && newUserData.flatRateFee === undefined) {
            newUserData.flatRateFee = 75.0; // Default flat rate fee
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
            setRawCourierStats(prev => [...prev, newCourierStat]);
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
        
        const clientFeeSnapshot = currentUser.flatRateFee || 0;

        if(newShipmentData.paymentMethod === PaymentMethod.WALLET) {
            if(walletBalance < clientFeeSnapshot) {
                addToast(`Insufficient wallet balance to pay for shipping fee of ${clientFeeSnapshot.toFixed(2)} EGP.`, 'error'); 
                return;
            }
            const newTransaction: ClientTransaction = { 
                id: 'TXN' + Math.floor(Math.random() * 900000 + 100000), 
                userId: currentUser.id, 
                type: TransactionType.PAYMENT, 
                amount: -clientFeeSnapshot, 
                date: new Date().toISOString(), 
                description: `Shipping fee for shipment to ${newShipmentData.recipientName}` 
            };
            setClientTransactions(prev => [newTransaction, ...prev]);
        }
        
        const newShipment: Shipment = { ...newShipmentData, id: 'FLS' + Math.floor(Math.random() * 900000 + 100000), clientId: currentUser.id, clientName: currentUser.name, creationDate: new Date().toISOString(), status: ShipmentStatus.PENDING_ASSIGNMENT, clientFlatRateFee: clientFeeSnapshot };
        setShipments(prev => [newShipment, ...prev]);
        addToast(`New shipment ${newShipment.id} created!`, 'success');
    }, [currentUser, addToast, walletBalance]); // Keep walletBalance dependency to ensure check is up-to-date

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

    const updateShipmentStatus = useCallback(async (shipmentId: string, status: ShipmentStatus, details?: { courierId?: number; signature?: string; }) => {
        let updatedShipment: Shipment | undefined;
        setShipments(prev => prev.map(s => {
            if (s.id === shipmentId) {
                updatedShipment = { ...s, status, deliveryDate: (status === ShipmentStatus.DELIVERED || status === ShipmentStatus.RETURNED) ? new Date().toISOString() : s.deliveryDate, signature: details?.signature ?? s.signature, courierId: details?.courierId ?? s.courierId };
                return updatedShipment;
            }
            return s;
        }));
        
        addToast(`Shipment ${shipmentId} updated to "${status}".`, 'info');

        if (updatedShipment) {
            if (status === ShipmentStatus.DELIVERED) {
                handleDeliveryCompletion(updatedShipment, true);

                // Client wallet update logic for COD
                if (updatedShipment.paymentMethod === PaymentMethod.COD && updatedShipment.packageValue > 0) {
                    const client = users.find(u => u.id === updatedShipment!.clientId);
                    if(client) {
                        const newTransaction: ClientTransaction = {
                            id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
                            userId: client.id,
                            type: TransactionType.DEPOSIT,
                            amount: updatedShipment.packageValue,
                            date: new Date().toISOString(),
                            description: `COD collection for shipment ${updatedShipment.id}`
                        };
                        setClientTransactions(prev => [newTransaction, ...prev]);
                        addToast(`COD value of ${updatedShipment.packageValue.toFixed(2)} EGP credited to wallet.`, 'success');
                    }
                }
            }
            if (status === ShipmentStatus.DELIVERY_FAILED) {
                handleDeliveryCompletion(updatedShipment, false);
            }
            if (status === ShipmentStatus.RETURNED) {
                handleDeliveryCompletion(updatedShipment, true); // Courier gets paid for returns too
            }
            
            await createAndSendNotification(updatedShipment, status);
        }
    }, [addToast, createAndSendNotification, handleDeliveryCompletion, users]);

    const updateShipmentFees = useCallback((shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => {
        if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_USER)) {
            addToast('You do not have permission to edit shipment fees.', 'error');
            return;
        }

        setShipments(prev => prev.map(s => {
            if (s.id === shipmentId) {
                if ([ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED].includes(s.status)) {
                    addToast('Cannot edit fees for a completed shipment.', 'error');
                    return s;
                }
                addToast(`Fees for ${shipmentId} updated.`, 'success');
                return { ...s, ...fees };
            }
            return s;
        }));
    }, [currentUser, addToast]);
    
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

        const courierUser = users.find(u => u.id === courierId);
        const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
        const courierStat = courierStats.find(cs => cs.courierId === courierId);
        if (!courierUser || !shipmentToUpdate || !courierStat) {
            addToast('Could not find necessary data for assignment.', 'error');
            return false;
        }
        
        const commissionSnapshot = calculateCommission(shipmentToUpdate, courierStat);

        const updatedShipment = { ...shipmentToUpdate, status: ShipmentStatus.IN_TRANSIT, courierId, courierCommission: commissionSnapshot };
        
        setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
        await createAndSendNotification(updatedShipment, ShipmentStatus.IN_TRANSIT);
        
        addToast(`Shipment ${shipmentId} assigned to ${courierUser.name} and marked as in transit.`, 'success');
        return true;
    }, [users, shipments, courierStats, addToast, canCourierReceiveAssignment, calculateCommission, createAndSendNotification]);
    
    const reassignCourier = useCallback(async (shipmentId: string, newCourierId: number) => {
        if (!canCourierReceiveAssignment(newCourierId)) {
            addToast('Cannot assign to the selected courier due to restrictions.', 'error');
            return;
        }
        
        const courierUser = users.find(u => u.id === newCourierId);
        const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
        const courierStat = courierStats.find(cs => cs.courierId === newCourierId);
        if (!courierUser || !shipmentToUpdate || !courierStat) {
            addToast('Could not find necessary data for re-assignment.', 'error');
            return;
        }
        
        const commissionSnapshot = calculateCommission(shipmentToUpdate, courierStat);

        const updatedShipment = { ...shipmentToUpdate, status: ShipmentStatus.IN_TRANSIT, courierId: newCourierId, courierCommission: commissionSnapshot };
        
        setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
        await createAndSendNotification(updatedShipment, ShipmentStatus.IN_TRANSIT);
        
        addToast(`Shipment ${shipmentId} re-assigned to ${courierUser.name}.`, 'success');
    }, [users, shipments, courierStats, addToast, canCourierReceiveAssignment, calculateCommission, createAndSendNotification]);
    
    const assignReturn = useCallback(async (shipmentId: string, courierId: number): Promise<boolean> => {
        if (!canCourierReceiveAssignment(courierId)) {
            addToast(`Cannot assign return to the selected courier due to restrictions.`, 'error');
            return false;
        }
        
        const courierUser = users.find(u => u.id === courierId);
        const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
        const courierStat = courierStats.find(cs => cs.courierId === courierId);
        if (!courierUser || !shipmentToUpdate || !courierStat) {
            addToast('Could not find necessary data for return assignment.', 'error');
            return false;
        }
        
        const commissionSnapshot = calculateCommission(shipmentToUpdate, courierStat);

        const updatedShipment = { ...shipmentToUpdate, status: ShipmentStatus.RETURN_IN_PROGRESS, courierId, courierCommission: commissionSnapshot };
        
        setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
        await createAndSendNotification(updatedShipment, ShipmentStatus.RETURN_IN_PROGRESS);
        
        addToast(`Return for ${shipmentId} assigned to ${courierUser.name}.`, 'success');
        return true;
    }, [users, shipments, courierStats, addToast, canCourierReceiveAssignment, calculateCommission, createAndSendNotification]);

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
        setRawCourierStats(prev => prev.map(c => c.courierId === courierId ? { ...c, ...newSettings } : c));
        const courier = users.find(u => u.id === courierId);
        addToast(`Financial settings for ${courier?.name} have been updated.`, 'success');
    }, [users, addToast]);

    const applyManualPenalty = useCallback((courierId: number, amount: number, description: string) => {
        const positiveAmount = Math.abs(amount);
        const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.PENALTY, amount: -positiveAmount, description, timestamp: new Date().toISOString(), status: CourierTransactionStatus.PROCESSED };
        setCourierTransactions(prev => [transaction, ...prev]);
        const courier = users.find(u => u.id === courierId);
        addToast(`Penalty of ${positiveAmount} EGP applied to ${courier?.name}.`, 'success');
    }, [users, addToast]);
    
    const requestCourierPayout = useCallback((courierId: number, amount: number) => {
        const transaction: CourierTransaction = { id: `txn-${Date.now()}`, courierId, type: CourierTransactionType.WITHDRAWAL_REQUEST, amount: -amount, description: 'Payout requested', timestamp: new Date().toISOString(), status: CourierTransactionStatus.PENDING };
        setCourierTransactions(prev => [transaction, ...prev]);
        addToast(`Payout of ${amount} EGP requested.`, 'success');
    }, [addToast]);

    const processCourierPayout = useCallback((transactionId: string) => {
        const transaction = courierTransactions.find(t => t.id === transactionId);
        if (!transaction) return;
        setCourierTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: CourierTransactionStatus.PROCESSED, description: 'Payout processed by admin' } : t));
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
        if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_USER)) {
            addToast('Only admins and super users can update client tax card numbers.', 'error');
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
        const totalClientFees = deliveredShipments.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
        const totalCourierPayouts = deliveredShipments.reduce((sum, s) => sum + (s.courierCommission || 0), 0);
        
        const netRevenue = totalClientFees - totalCourierPayouts;
        const totalOrders = deliveredShipments.length;
        
        return {
            grossRevenue,
            netRevenue,
            totalClientFees,
            totalCourierPayouts,
            totalOrders,
            taxCarNumber: '' // No longer applicable since tax cards are per client
        };
    }, [shipments]);

    const getClientFinancials = useCallback((): ClientFinancialSummary[] => {
        const clientUsers = users.filter(u => u.role === UserRole.CLIENT);
        return clientUsers.map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id && s.status === ShipmentStatus.DELIVERED);
            const totalOrders = clientShipments.length;
            const orderSum = clientShipments.reduce((sum, s) => sum + s.packageValue, 0); // Use packageValue for client's earnings
            
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
        currentUser: currentUserWithBalance, 
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
        updateShipmentFees,
        assignShipmentToCourier, 
        addUser, 
        updateUser, 
        removeUser, 
        resetPassword, 
        addToast, 
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
        canCreateUsers,
        calculateCommission
    }), [
        currentUserWithBalance, 
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
        updateShipmentFees,
        assignShipmentToCourier, 
        addUser, 
        updateUser, 
        removeUser, 
        resetPassword, 
        addToast, 
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
        canCreateUsers,
        calculateCommission
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};