
import React, { useState, useCallback, useMemo } from 'react';
import { mockUsers, mockShipments, mockTransactions, mockNotifications } from '../data';
import type { User, Shipment, Toast, Transaction, Notification } from '../types';
import { UserRole, ShipmentStatus, PaymentMethod, TransactionType, NotificationChannel } from '../types';
import { sendEmailNotification } from '../api/email';

// --- App State Context ---
type NotificationStatus = 'sending' | 'sent' | 'failed';

export type AppContextType = {
    currentUser: User | null;
    users: User[];
    shipments: Shipment[];
    transactions: Transaction[];
    toasts: Toast[];
    notifications: Notification[];
    notificationStatus: Record<string, NotificationStatus>;
    login: (email: string, password: string) => boolean;
    logout: () => void;
    addShipment: (shipment: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate'>) => void;
    updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, details?: { courierId?: number; signature?: string }) => Promise<void>;
    assignCourier: (shipmentId: string, courierId: number) => Promise<void>;
    reassignCourier: (shipmentId: string, newCourierId: number) => Promise<void>;
    assignReturn: (shipmentId: string, courierId: number) => Promise<void>;
    addUser: (userData: Omit<User, 'id'>) => void;
    updateUser: (userId: number, userData: Partial<Omit<User, 'id'>>, silent?: boolean) => void;
    removeUser: (userId: number) => void;
    resetPassword: (userId: number, newPassword: string) => void;
    addToast: (message: string, type: Toast['type']) => void;
    topUpWallet: (userId: number, amount: number) => void;
    resendNotification: (notificationId: string) => Promise<void>;
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
    const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [notificationStatus, setNotificationStatus] = useState<Record<string, NotificationStatus>>({});
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000); // Remove after 5 seconds
    }, []);
    
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
    
    const addUser = useCallback((userData: Omit<User, 'id'>) => {
        const newUser: User = {
            ...userData,
            id: Math.max(...users.map(u => u.id), 0) + 1,
        };
        setUsers(prev => [...prev, newUser]);
        addToast(`User "${newUser.name}" created successfully.`, 'success');
    }, [users, addToast]);

    const updateUser = useCallback((userId: number, userData: Partial<Omit<User, 'id'>>, silent = false) => {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...userData } : u)));
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, ...userData } : null);
        }
        if (!silent) {
            addToast(`User details updated.`, 'success');
        }
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

    const addShipment = useCallback((newShipmentData: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate'>) => {
        if (!currentUser || currentUser.role !== UserRole.CLIENT) return;
        
        if(newShipmentData.paymentMethod === PaymentMethod.WALLET) {
            if((currentUser.walletBalance ?? 0) < newShipmentData.price) {
                addToast('Insufficient wallet balance.', 'error');
                return;
            }
            const newBalance = (currentUser.walletBalance ?? 0) - newShipmentData.price;
            updateUser(currentUser.id, { walletBalance: newBalance });
            
            const newTransaction: Transaction = {
                id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
                userId: currentUser.id,
                type: TransactionType.PAYMENT,
                amount: -newShipmentData.price,
                date: new Date().toISOString(),
                description: `Payment for shipment to ${newShipmentData.recipientName}`
            };
            setTransactions(prev => [newTransaction, ...prev]);
        }

        const newShipment: Shipment = {
            ...newShipmentData,
            id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
            clientId: currentUser.id,
            clientName: currentUser.name,
            creationDate: new Date().toISOString(),
            status: ShipmentStatus.PENDING_ASSIGNMENT,
        };
        setShipments(prev => [newShipment, ...prev]);
        addToast(`New shipment ${newShipment.id} created!`, 'success');
    }, [currentUser, addToast, updateUser]);

    const createAndSendNotification = useCallback(async (shipment: Shipment, newStatus: ShipmentStatus) => {
        let recipientEmail: string | undefined;
        let message: string | undefined;
        let subject: string | undefined;
        const client = users.find(u => u.id === shipment.clientId);
        const adminUser = users.find(u => u.role === UserRole.ADMIN);

        switch (newStatus) {
            case ShipmentStatus.OUT_FOR_DELIVERY:
                recipientEmail = client?.email;
                subject = `Your Flash Shipment ${shipment.id} is Out for Delivery!`;
                message = `Hi ${client?.name},\n\nGreat news! Your shipment to ${shipment.recipientName} is now out for delivery.\n\nBest,\nThe Flash Express Team`;
                break;
            case ShipmentStatus.DELIVERED:
                recipientEmail = client?.email;
                subject = `Your Flash Shipment ${shipment.id} has been Delivered!`;
                message = `Hi ${client?.name},\n\nYour shipment to ${shipment.recipientName} has been successfully delivered. Thank you for using Flash Express!\n\nBest,\nThe Flash Express Team`;
                break;
            case ShipmentStatus.RETURN_REQUESTED:
                recipientEmail = adminUser?.email;
                subject = `Return Request for Shipment ${shipment.id}`;
                message = `Admin,\n\nClient ${shipment.clientName} (ID: ${shipment.clientId}) has requested a return for shipment ${shipment.id}.\n\nPlease review and assign a courier from the 'Manage Returns' portal.`;
                break;
            case ShipmentStatus.RETURN_IN_PROGRESS:
                recipientEmail = client?.email;
                subject = `Your Return for Shipment ${shipment.id} is In Progress`;
                message = `Hi ${client?.name},\n\nA courier has been assigned for the return of shipment ${shipment.id}. They will be in contact shortly.\n\nBest,\nThe Flash Express Team`;
                break;
            case ShipmentStatus.RETURNED:
                recipientEmail = client?.email;
                subject = `Your Return for Shipment ${shipment.id} is Complete`;
                message = `Hi ${client?.name},\n\nThe return for shipment ${shipment.id} has been successfully completed.\n\nBest,\nThe Flash Express Team`;
                break;
            default:
                return;
        }
        
        if (recipientEmail && message && subject) {
            const newNotification: Notification = {
                id: 'NOTIF' + Math.floor(Math.random() * 900000 + 100000),
                shipmentId: shipment.id,
                channel: NotificationChannel.EMAIL,
                recipient: recipientEmail,
                message: `${subject}\n\n${message}`,
                date: new Date().toISOString(),
                status: newStatus,
                sent: false,
            };
            setNotifications(prev => [newNotification, ...prev]);
            
            try {
                addToast(`Sending status update to ${client?.name || 'Admin'}...`, 'info');
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
    
    const updateShipmentStatus = useCallback(async (shipmentId: string, status: ShipmentStatus, details?: { courierId?: number; signature?: string }) => {
        let updatedShipment: Shipment | undefined;
        setShipments(prev => prev.map(s => {
            if (s.id === shipmentId) {
                updatedShipment = { 
                    ...s, 
                    status, 
                    deliveryDate: status === ShipmentStatus.DELIVERED ? new Date().toISOString() : s.deliveryDate,
                    signature: details?.signature ?? s.signature,
                    courierId: details?.courierId ?? s.courierId,
                  };
                return updatedShipment;
            }
            return s;
        }));
        
        addToast(`Shipment ${shipmentId} updated to "${status}".`, 'info');

        if (updatedShipment) {
            await createAndSendNotification(updatedShipment, status);
        }
    }, [addToast, createAndSendNotification]);
    
    const assignCourier = useCallback(async (shipmentId: string, courierId: number) => {
        await updateShipmentStatus(shipmentId, ShipmentStatus.ASSIGNED_TO_COURIER, { courierId });
        const courier = users.find(u => u.id === courierId);
        if(courier) {
           addToast(`Shipment ${shipmentId} assigned to ${courier.name}.`, 'success');
        }
    }, [updateShipmentStatus, users, addToast]);
    
    const reassignCourier = useCallback(async (shipmentId: string, newCourierId: number) => {
        await updateShipmentStatus(shipmentId, ShipmentStatus.ASSIGNED_TO_COURIER, { courierId: newCourierId });
        const courier = users.find(u => u.id === newCourierId);
        if(courier) {
           addToast(`Shipment ${shipmentId} re-assigned to ${courier.name}.`, 'success');
        }
    }, [updateShipmentStatus, users, addToast]);
    
    const assignReturn = useCallback(async (shipmentId: string, courierId: number) => {
        await updateShipmentStatus(shipmentId, ShipmentStatus.RETURN_IN_PROGRESS, { courierId });
        const courier = users.find(u => u.id === courierId);
        if(courier) {
           addToast(`Return for ${shipmentId} assigned to ${courier.name}.`, 'success');
        }
    }, [updateShipmentStatus, users, addToast]);

    const topUpWallet = useCallback((userId: number, amount: number) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const newBalance = (user.walletBalance ?? 0) + amount;
        updateUser(userId, { walletBalance: newBalance });

        const newTransaction: Transaction = {
            id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
            userId,
            type: TransactionType.DEPOSIT,
            amount,
            date: new Date().toISOString(),
            description: `Wallet top-up`
        };
        setTransactions(prev => [newTransaction, ...prev]);
        addToast(`Successfully added ${amount.toFixed(2)} EGP to your wallet.`, 'success');
    }, [users, updateUser, addToast]);
    
    const resendNotification = useCallback(async (notificationId: string) => {
        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;

        try {
            addToast(`Resending email for ${notification.shipmentId}...`, 'info');
            setNotificationStatus(prev => ({...prev, [notification.id]: 'sending'}));
            await sendEmailNotification(notification);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, sent: true } : n));
            setNotificationStatus(prev => ({...prev, [notification.id]: 'sent'}));
            addToast(`Email for ${notification.shipmentId} resent successfully.`, 'success');
        } catch (error) {
            console.error("Failed to resend notification:", error);
            setNotificationStatus(prev => ({...prev, [notification.id]: 'failed'}));
            addToast(`Failed to resend email for ${notification.shipmentId}.`, 'error');
        }
    }, [notifications, addToast]);

    const value = useMemo(() => ({ currentUser, users, shipments, transactions, toasts, notifications, notificationStatus, login, logout, addShipment, updateShipmentStatus, assignCourier, addUser, updateUser, removeUser, resetPassword, addToast, topUpWallet, assignReturn, reassignCourier, resendNotification }), [currentUser, users, shipments, transactions, toasts, notifications, notificationStatus, login, logout, addShipment, updateShipmentStatus, assignCourier, addUser, updateUser, removeUser, resetPassword, addToast, topUpWallet, assignReturn, reassignCourier, resendNotification]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
