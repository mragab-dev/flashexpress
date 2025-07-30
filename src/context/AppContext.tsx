import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Shipment, Toast, ClientTransaction, Notification, CourierStats, CourierTransaction, FinancialSettings, AdminFinancials, ClientFinancialSummary, Address, CustomRole, Permission } from '../types';
import { UserRole, ShipmentStatus, CommissionType, CourierTransactionType, CourierTransactionStatus, ShipmentPriority } from '../types';
import { apiFetch } from '../api/client';

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
    customRoles: CustomRole[];
    financialSettings: FinancialSettings | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    addShipment: (shipment: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate' | 'status'>) => Promise<void>;
    updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, details?: { failureReason?: string; }) => Promise<boolean>;
    updateShipmentFees: (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => Promise<void>;
    assignShipmentToCourier: (shipmentId: string, courierId: number) => Promise<boolean>;
    reassignCourier: (shipmentId: string, newCourierId: number) => Promise<void>;
    assignReturn: (shipmentId: string, courierId: number) => Promise<boolean>;
    addUser: (userData: Omit<User, 'id'>) => Promise<void>;
    updateUser: (userId: number, userData: Partial<User>, silent?: boolean) => Promise<void>;
    removeUser: (userId: number) => Promise<void>;
    resetPassword: (userId: number, newPassword: string) => Promise<void>;
    addToast: (message: string, type: Toast['type'], duration?: number) => void;
    removeToast: (toastId: number) => void;
    resendNotification: (notificationId: string) => Promise<void>;
    canCourierReceiveAssignment: (courierId: number) => boolean;
    updateCourierSettings: (courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) => Promise<void>;
    applyManualPenalty: (courierId: number, amount: number, description: string) => Promise<void>;
    processCourierPayout: (transactionId: string) => Promise<void>;
    requestCourierPayout: (courierId: number, amount: number) => Promise<void>;
    updateClientFlatRate: (clientId: number, flatRate: number) => Promise<void>;
    updateClientTaxCard: (clientId: number, taxCardNumber: string) => Promise<void>;
    getTaxCardNumber: (clientId: number) => string;
    getAdminFinancials: () => AdminFinancials;
    getClientFinancials: () => ClientFinancialSummary[];
    hasPermission: (permission: Permission) => boolean;
    calculateCommission: (shipment: Shipment, courier: CourierStats) => number;
    calculatePriorityPrice: (baseRate: number, priority: ShipmentPriority, client: User) => number;
    getCourierName: (courierId?: number) => string;
    addRole: (role: Omit<CustomRole, 'id'>) => Promise<void>;
    updateRole: (roleId: string, roleData: Partial<CustomRole>) => Promise<void>;
    deleteRole: (roleId: string) => Promise<void>;
    sendDeliveryVerificationCode: (shipmentId: string) => Promise<boolean>;
    verifyDelivery: (shipmentId: string, code: string) => Promise<boolean>;
};

export const AppContext = React.createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationStatus, setNotificationStatus] = useState<Record<string, NotificationStatus>>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [rawCourierStats, setRawCourierStats] = useState<CourierStats[]>([]);
    const [courierTransactions, setCourierTransactions] = useState<CourierTransaction[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
    
    const [financialSettings] = useState<FinancialSettings>({
        baseCommissionRate: 30, penaltyAmount: 10, consecutiveFailureLimit: 3, performanceThreshold: 2.0,
    });
    
    const [isLoading, setIsLoading] = useState(false);

    const addToast = useCallback((message: string, type: Toast['type'], duration?: number) => {
        const id = Date.now();
        const toastDuration = duration || 10000; // Default 10 seconds
        setToasts(prev => [...prev, { id, message, type, duration: toastDuration }]);
    }, []);

    const removeToast = useCallback((toastId: number) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
    }, []);

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/data');
            setUsers(data.users || []);
            setShipments(data.shipments || []);
            setClientTransactions(data.clientTransactions || []);
            setNotifications(data.notifications || []);
            setRawCourierStats(data.courierStats || []);
            setCourierTransactions(data.courierTransactions || []);
            setCustomRoles(data.customRoles || []);
        } catch (error: any) {
            addToast(`Failed to load data: ${error.message}`, 'error');
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [addToast, currentUser]);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const rolesData: CustomRole[] = await apiFetch('/api/roles'); // Fetch roles before login
            setCustomRoles(rolesData);
            
            const user: User = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            
            // Augment user with permissions
            const userRole = rolesData.find(r => r.name === user.role);
            user.permissions = userRole ? userRole.permissions : [];

            setCurrentUser(user);
            addToast(`Welcome back, ${user.name}!`, 'success');
            return true;
        } catch (error: any) {
            addToast(error.message, 'error');
            setCurrentUser(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);
    
    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    useEffect(() => {
        if (currentUser && users.length > 0) {
            const updatedUserFromList = users.find(u => u.id === currentUser.id);
            if (updatedUserFromList) {
                const userRole = customRoles.find(r => r.name === updatedUserFromList.role);
                const permissions = userRole ? userRole.permissions : [];
                const updatedUserWithPerms = { ...updatedUserFromList, permissions };
                if (JSON.stringify(updatedUserWithPerms) !== JSON.stringify(currentUser)) {
                    setCurrentUser(updatedUserWithPerms);
                }
            }
        }
    }, [users, currentUser, customRoles]);


    const logout = useCallback(() => {
        addToast("You have been logged out.", 'info');
        setCurrentUser(null);
        setUsers([]); setShipments([]); setClientTransactions([]); setNotifications([]); setRawCourierStats([]); setCourierTransactions([]); setCustomRoles([]);
    }, [addToast]);

    const executeApiAction = useCallback(async (action: Promise<any>, successMessage: string, errorMessagePrefix: string) => {
        try {
            await action;
            if(successMessage) addToast(successMessage, 'success');
            await fetchData();
            return true;
        } catch (error: any) {
            addToast(`${errorMessagePrefix}: ${error.message}`, 'error');
            return false;
        }
    }, [addToast, fetchData]);

    // Role Management
    const addRole = useCallback(async (roleData: Omit<CustomRole, 'id'>) => {
        await executeApiAction(apiFetch('/api/roles', { method: 'POST', body: JSON.stringify(roleData) }), 'Role created successfully.', 'Failed to create role');
    }, [executeApiAction]);

    const updateRole = useCallback(async (roleId: string, roleData: Partial<CustomRole>) => {
        await executeApiAction(apiFetch(`/api/roles/${roleId}`, { method: 'PUT', body: JSON.stringify(roleData) }), 'Role updated successfully.', 'Failed to update role');
    }, [executeApiAction]);

    const deleteRole = useCallback(async (roleId: string) => {
        await executeApiAction(apiFetch(`/api/roles/${roleId}`, { method: 'DELETE' }), 'Role deleted successfully.', 'Failed to delete role');
    }, [executeApiAction]);


    const addUser = useCallback(async (userData: Omit<User, 'id'>) => {
        await executeApiAction(apiFetch('/api/users', { method: 'POST', body: JSON.stringify(userData) }), `User "${userData.name}" created successfully.`, 'Failed to create user');
    }, [executeApiAction]);
    
    const updateUser = useCallback(async (userId: number, userData: Partial<User>, silent = false) => {
        try {
            await apiFetch(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(userData) });
            if (!silent) addToast('User updated successfully.', 'success');
            await fetchData();
        } catch (error: any) { if (!silent) addToast(`Update failed: ${error.message}`, 'error'); }
    }, [addToast, fetchData]);

    const removeUser = useCallback(async (userId: number) => {
        await executeApiAction(apiFetch(`/api/users/${userId}`, { method: 'DELETE' }), 'User removed successfully.', 'Failed to remove user');
    }, [executeApiAction]);

    const resetPassword = useCallback(async (userId: number, password: string) => {
        await executeApiAction(apiFetch(`/api/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }), 'Password reset successfully.', 'Failed to reset password');
    }, [executeApiAction]);
    
    const addShipment = useCallback(async (shipmentData: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate' | 'status'>) => {
        if (!currentUser) return;
        const payload = { ...shipmentData, clientId: currentUser.id, clientName: currentUser.name, clientFlatRateFee: currentUser.flatRateFee };
        await executeApiAction(apiFetch('/api/shipments', { method: 'POST', body: JSON.stringify(payload) }), 'Shipment created successfully!', 'Failed to create shipment');
    }, [currentUser, executeApiAction]);

    const updateShipmentStatus = useCallback((shipmentId: string, status: ShipmentStatus, details?: { failureReason?: string; }) =>
        executeApiAction(apiFetch(`/api/shipments/${shipmentId}/status`, { method: 'PUT', body: JSON.stringify({ status, ...details }) }), `Shipment ${shipmentId} updated to ${status}.`, 'Failed to update status'),
        [executeApiAction]);

    const assignShipmentToCourier = useCallback(async (shipmentId: string, courierId: number): Promise<boolean> => {
        return executeApiAction(apiFetch(`/api/shipments/${shipmentId}/assign`, { method: 'PUT', body: JSON.stringify({ courierId }) }), `Shipment ${shipmentId} assigned.`, 'Assignment failed');
    }, [executeApiAction]);

    const reassignCourier = useCallback(async (shipmentId: string, newCourierId: number) => {
        await assignShipmentToCourier(shipmentId, newCourierId);
    }, [assignShipmentToCourier]);

    const assignReturn = useCallback(async (shipmentId: string, courierId: number): Promise<boolean> => {
        try {
            await updateShipmentStatus(shipmentId, ShipmentStatus.RETURN_REQUESTED);
            return await assignShipmentToCourier(shipmentId, courierId);
        } catch (error: any) {
            addToast(`Failed to assign return: ${error.message}`, 'error');
            return false;
        }
    }, [updateShipmentStatus, assignShipmentToCourier, addToast]);

    const updateShipmentFees = useCallback(async (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => {
        await executeApiAction(apiFetch(`/api/shipments/${shipmentId}/fees`, { method: 'PUT', body: JSON.stringify(fees) }), 'Shipment fees updated.', 'Failed to update fees');
    }, [executeApiAction]);
    
    const resendNotification = useCallback(async (notificationId: string) => {
        setNotificationStatus(prev => ({...prev, [notificationId]: 'sending' }));
        try {
            await apiFetch(`/api/notifications/${notificationId}/resend`, { method: 'POST' });
            addToast('Notification resent successfully.', 'success');
            await fetchData(); 
            setNotificationStatus(prev => ({...prev, [notificationId]: 'sent' }));
        } catch (e: any) {
            addToast(e.message, 'error');
            setNotificationStatus(prev => ({...prev, [notificationId]: 'failed' }));
        }
    }, [addToast, fetchData]);
    
    const updateCourierSettings = useCallback(async (courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) => {
        await executeApiAction(apiFetch(`/api/couriers/${courierId}/settings`, { method: 'PUT', body: JSON.stringify(newSettings) }), "Courier settings updated.", 'Failed to update settings');
    }, [executeApiAction]);

    const applyManualPenalty = useCallback(async (courierId: number, amount: number, description: string) => {
        await executeApiAction(apiFetch(`/api/couriers/${courierId}/penalty`, { method: 'POST', body: JSON.stringify({ amount, description }) }), 'Penalty applied successfully.', 'Failed to apply penalty');
    }, [executeApiAction]);

    const requestCourierPayout = useCallback(async (courierId: number, amount: number) => {
        await executeApiAction(apiFetch(`/api/couriers/payouts`, { method: 'POST', body: JSON.stringify({ courierId, amount }) }), 'Payout request submitted.', 'Failed to submit payout request');
    }, [executeApiAction]);

    const processCourierPayout = useCallback(async (transactionId: string) => {
        await executeApiAction(apiFetch(`/api/payouts/${transactionId}/process`, { method: 'PUT' }), 'Payout processed successfully.', 'Failed to process payout');
    }, [executeApiAction]);
    
    const updateClientFlatRate = useCallback(async (clientId: number, flatRateFee: number) => {
        await executeApiAction(apiFetch(`/api/clients/${clientId}/flatrate`, { method: 'PUT', body: JSON.stringify({ flatRateFee }) }), "Client's flat rate updated.", 'Failed to update flat rate');
    }, [executeApiAction]);

    const updateClientTaxCard = useCallback(async (clientId: number, taxCardNumber: string) => {
        await executeApiAction(apiFetch(`/api/clients/${clientId}/taxcard`, { method: 'PUT', body: JSON.stringify({ taxCardNumber }) }), "Client's tax card number updated.", 'Failed to update tax card');
    }, [executeApiAction]);
    
    // --- New Delivery Verification Functions ---
    const sendDeliveryVerificationCode = useCallback(async (shipmentId: string) => {
        return executeApiAction(
            apiFetch(`/api/shipments/${shipmentId}/send-delivery-code`, { method: 'POST' }),
            'Delivery code sent to recipient (check server logs).',
            'Failed to send delivery code'
        );
    }, [executeApiAction]);

    const verifyDelivery = useCallback(async (shipmentId: string, code: string) => {
        return executeApiAction(
            apiFetch(`/api/shipments/${shipmentId}/verify-delivery`, { method: 'POST', body: JSON.stringify({ code }) }),
            'Shipment marked as Delivered!',
            'Delivery confirmation failed'
        );
    }, [executeApiAction]);


    const walletBalance = useMemo(() => {
        if (!currentUser) return 0;
        const balance = clientTransactions.filter(t => t.userId === currentUser.id).reduce((sum, t) => sum + t.amount, 0);
        return isNaN(balance) ? 0 : balance;
    }, [clientTransactions, currentUser]);
    
    const currentUserWithBalance = useMemo(() => currentUser ? { ...currentUser, walletBalance } : null, [currentUser, walletBalance]);

    const courierStats = useMemo((): CourierStats[] => {
        return rawCourierStats.map(statConfig => {
            const txs = courierTransactions.filter(t => t.courierId === statConfig.courierId);
            const deliveriesCompleted = shipments.filter(s => s.courierId === statConfig.courierId && (s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.RETURNED)).length;
            const deliveriesFailed = shipments.filter(s => s.courierId === statConfig.courierId && s.status === ShipmentStatus.DELIVERY_FAILED).length;
            const totalEarnings = txs.filter(t => (t.type === CourierTransactionType.COMMISSION || t.type === CourierTransactionType.BONUS) && t.status === CourierTransactionStatus.PROCESSED).reduce((s, t) => s + t.amount, 0);
            const pendingEarnings = txs.filter(t => t.type === CourierTransactionType.COMMISSION && t.status === CourierTransactionStatus.PENDING).reduce((s, t) => s + t.amount, 0);
            const currentBalance = txs.filter(t => t.status === CourierTransactionStatus.PROCESSED).reduce((s, t) => s + t.amount, 0);
            const lastDeliveryDate = shipments.filter(s => s.courierId === statConfig.courierId && s.deliveryDate).sort((a,b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime())[0]?.deliveryDate;
            
            return {
                ...statConfig,
                deliveriesCompleted,
                deliveriesFailed,
                totalEarnings,
                pendingEarnings,
                currentBalance,
                lastDeliveryDate,
            };
        });
    }, [rawCourierStats, courierTransactions, shipments]);
    
    const canCourierReceiveAssignment = useCallback((courierId: number): boolean => {
        const stats = courierStats.find(s => s.courierId === courierId);
        return !stats?.isRestricted;
    }, [courierStats]);
    
    const getCourierName = useCallback((courierId?: number) => {
        if (!courierId) return 'Unassigned';
        return users.find(u => u.id === courierId)?.name || 'Unknown Courier';
    }, [users]);
    
    const getTaxCardNumber = useCallback((clientId: number): string => {
        return users.find(u => u.id === clientId)?.taxCardNumber || '';
    }, [users]);
    
    const hasPermission = useCallback((permission: Permission): boolean => {
        return currentUser?.permissions?.includes(permission) || false;
    }, [currentUser]);
    
    const getAdminFinancials = useCallback((): AdminFinancials => {
        const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED);
        const undeliveredShipments = shipments.filter(s => ![ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
        const failedShipments = shipments.filter(s => [ShipmentStatus.DELIVERY_FAILED, ShipmentStatus.RETURNED].includes(s.status));
    
        const totalCollectedMoney = deliveredShipments.reduce((sum, s) => sum + s.price, 0);
        const undeliveredPackagesValue = undeliveredShipments.reduce((sum, s) => sum + s.price, 0);
        const failedDeliveriesValue = failedShipments.reduce((sum, s) => sum + s.price, 0);
        const totalFees = shipments.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
        const totalCommission = deliveredShipments.reduce((sum, s) => sum + (s.courierCommission || 0), 0);
        const totalRevenue = deliveredShipments.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
        const netRevenue = totalRevenue - totalCommission;
    
        return {
            totalCollectedMoney,
            undeliveredPackagesValue,
            failedDeliveriesValue,
            totalRevenue,
            totalFees,
            totalCommission,
            netRevenue,
            totalOrders: deliveredShipments.length,
            // Legacy properties
            grossRevenue: totalCollectedMoney,
            totalClientFees: totalFees,
            totalCourierPayouts: totalCommission,
            taxCarNumber: '', // This seems deprecated, should be per-client
        };
    }, [shipments]);

    const getClientFinancials = useCallback((): ClientFinancialSummary[] => {
        const clients = users.filter(u => u.role === 'Client');
        return clients.map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id);
            return {
                clientId: client.id,
                clientName: client.name,
                totalOrders: clientShipments.length,
                orderSum: clientShipments.reduce((sum, s) => sum + s.price, 0),
                flatRateFee: client.flatRateFee || 0,
            };
        });
    }, [users, shipments]);
    
    const calculateCommission = useCallback((shipment: Shipment, courier: CourierStats): number => {
        if (courier.commissionType === CommissionType.FLAT) {
            return courier.commissionValue;
        }
        return shipment.price * (courier.commissionValue / 100);
    }, []);
    
    const calculatePriorityPrice = useCallback((baseRate: number, priority: ShipmentPriority, client: User): number => {
        const multipliers = client.priorityMultipliers || {
            [ShipmentPriority.STANDARD]: 1.0,
            [ShipmentPriority.URGENT]: 1.5,
            [ShipmentPriority.EXPRESS]: 2.0,
        };
        return baseRate * (multipliers[priority] || 1.0);
    }, []);

    const value = {
        currentUser: currentUserWithBalance, users, shipments, clientTransactions, toasts, notifications, notificationStatus,
        courierStats, courierTransactions, customRoles, financialSettings, isLoading,
        login, logout, addShipment, updateShipmentStatus, updateShipmentFees, assignShipmentToCourier, reassignCourier, assignReturn,
        addUser, updateUser, removeUser, resetPassword, addToast, removeToast, resendNotification, canCourierReceiveAssignment,
        updateCourierSettings, applyManualPenalty, processCourierPayout, requestCourierPayout, updateClientFlatRate, updateClientTaxCard,
        getAdminFinancials, getClientFinancials, hasPermission, calculateCommission, calculatePriorityPrice, getCourierName, getTaxCardNumber,
        addRole, updateRole, deleteRole, sendDeliveryVerificationCode, verifyDelivery
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};