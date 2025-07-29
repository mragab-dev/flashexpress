import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Shipment, Toast, ClientTransaction, Notification, CourierStats, CourierTransaction, FinancialSettings, AdminFinancials, ClientFinancialSummary, Address } from '../types';
import { UserRole, ShipmentStatus, CommissionType, CourierTransactionType, CourierTransactionStatus } from '../types';

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
    financialSettings: FinancialSettings | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    addShipment: (shipment: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate' | 'status'>) => Promise<void>;
    updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, details?: { signature?: string; }) => Promise<void>;
    updateShipmentFees: (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => Promise<void>;
    assignShipmentToCourier: (shipmentId: string, courierId: number) => Promise<boolean>;
    reassignCourier: (shipmentId: string, newCourierId: number) => Promise<void>;
    assignReturn: (shipmentId: string, courierId: number) => Promise<boolean>;
    addUser: (userData: Omit<User, 'id'>) => Promise<void>;
    updateUser: (userId: number, userData: Partial<Omit<User, 'id' | 'address'> & {address?: Address}>, silent?: boolean) => Promise<void>;
    removeUser: (userId: number) => Promise<void>;
    resetPassword: (userId: number, newPassword: string) => Promise<void>;
    addToast: (message: string, type: Toast['type']) => void;
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

// --- API Helper ---
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    // Requests are now relative (e.g., '/api/login'). 
    // Vite's proxy will forward them to http://localhost:3001.
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    return; // For empty responses (e.g., 200 OK on a PUT/DELETE)
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
    
    const [financialSettings] = useState<FinancialSettings>({
        baseCommissionRate: 30, penaltyAmount: 10, consecutiveFailureLimit: 3, performanceThreshold: 2.0,
    });
    
    const [isLoading, setIsLoading] = useState(false);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }, []);

    const fetchData = useCallback(async () => {
        if (!currentUser) return; // Don't fetch if not logged in
        setIsLoading(true);
        try {
            const data = await apiCall('/api/data');
            setUsers(data.users || []);
            setShipments(data.shipments || []);
            setClientTransactions(data.clientTransactions || []);
            setNotifications(data.notifications || []);
            setRawCourierStats(data.courierStats || []);
            setCourierTransactions(data.courierTransactions || []);
        } catch (error: any) {
            addToast(`Failed to load data: ${error.message}`, 'error');
            // If data fetch fails, log the user out to prevent a broken state
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [addToast, currentUser]);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const user = await apiCall('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
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
    
    // Fetch data after a successful login
    React.useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    // This hook keeps the `currentUser` object in sync with the master `users` list.
    // This is crucial for reflecting profile updates without needing a re-login.
    useEffect(() => {
        if (currentUser && users.length > 0) {
            const updatedCurrentUser = users.find(u => u.id === currentUser.id);
            // Only update if the user is found and the data is actually different, to avoid render loops.
            if (updatedCurrentUser && JSON.stringify(updatedCurrentUser) !== JSON.stringify(currentUser)) {
                setCurrentUser(updatedCurrentUser);
            }
        }
    }, [users, currentUser]);


    const logout = useCallback(() => {
        addToast("You have been logged out.", 'info');
        setCurrentUser(null);
        setUsers([]); setShipments([]); setClientTransactions([]); setNotifications([]); setRawCourierStats([]); setCourierTransactions([]);
    }, [addToast]);

    const executeApiAction = useCallback(async (action: Promise<any>, successMessage: string, errorMessagePrefix: string) => {
        try {
            await action;
            addToast(successMessage, 'success');
            await fetchData();
        } catch (error: any) {
            addToast(`${errorMessagePrefix}: ${error.message}`, 'error');
        }
    }, [addToast, fetchData]);

    const addUser = useCallback((userData: Omit<User, 'id'>) =>
        executeApiAction(apiCall('/api/users', { method: 'POST', body: JSON.stringify(userData) }), `User "${userData.name}" created successfully.`, 'Failed to create user'),
        [executeApiAction]);
    
    const updateUser = useCallback(async (userId: number, userData: Partial<User>, silent = false) => {
        try {
            await apiCall(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(userData) });
            if (!silent) addToast('User updated successfully.', 'success');
            await fetchData();
        } catch (error: any) { if (!silent) addToast(`Update failed: ${error.message}`, 'error'); }
    }, [addToast, fetchData]);

    const removeUser = useCallback((userId: number) =>
        executeApiAction(apiCall(`/api/users/${userId}`, { method: 'DELETE' }), 'User removed successfully.', 'Failed to remove user'),
        [executeApiAction]);

    const resetPassword = useCallback((userId: number, password: string) =>
        executeApiAction(apiCall(`/api/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }), 'Password reset successfully.', 'Failed to reset password'),
        [executeApiAction]);
    
    const addShipment = useCallback(async (shipmentData: Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'creationDate' | 'status'>) => {
        if (!currentUser) return;
        const payload = { ...shipmentData, clientId: currentUser.id, clientName: currentUser.name, clientFlatRateFee: currentUser.flatRateFee };
        await executeApiAction(apiCall('/api/shipments', { method: 'POST', body: JSON.stringify(payload) }), 'Shipment created successfully!', 'Failed to create shipment');
    }, [currentUser, executeApiAction]);

    const updateShipmentStatus = useCallback((shipmentId: string, status: ShipmentStatus, details?: { signature?: string; }) =>
        executeApiAction(apiCall(`/api/shipments/${shipmentId}/status`, { method: 'PUT', body: JSON.stringify({ status, ...details }) }), `Shipment ${shipmentId} updated to ${status}.`, 'Failed to update status'),
        [executeApiAction]);

    const assignShipmentToCourier = useCallback(async (shipmentId: string, courierId: number): Promise<boolean> => {
        try {
            await apiCall(`/api/shipments/${shipmentId}/assign`, { method: 'PUT', body: JSON.stringify({ courierId }) });
            addToast(`Shipment ${shipmentId} assigned.`, 'success');
            await fetchData();
            return true;
        } catch (error: any) {
            addToast(error.message, 'error');
            return false;
        }
    }, [addToast, fetchData]);

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

    const updateShipmentFees = async (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) =>
        executeApiAction(apiCall(`/api/shipments/${shipmentId}/fees`, { method: 'PUT', body: JSON.stringify(fees) }), 'Shipment fees updated.', 'Failed to update fees');
    
    const resendNotification = useCallback(async (notificationId: string) => {
        setNotificationStatus(prev => ({...prev, [notificationId]: 'sending' }));
        try {
            await apiCall(`/api/notifications/${notificationId}/resend`, { method: 'POST' });
            addToast('Notification resent successfully.', 'success');
            await fetchData(); // This will update the 'sent' status from the DB
            setNotificationStatus(prev => ({...prev, [notificationId]: 'sent' }));
        } catch (e: any) {
            addToast(e.message, 'error');
            setNotificationStatus(prev => ({...prev, [notificationId]: 'failed' }));
        }
    }, [addToast, fetchData]);
    
    const updateCourierSettings = (courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) =>
        executeApiAction(apiCall(`/api/couriers/${courierId}/settings`, { method: 'PUT', body: JSON.stringify(newSettings) }), "Courier settings updated.", 'Failed to update settings');

    const applyManualPenalty = (courierId: number, amount: number, description: string) =>
        executeApiAction(apiCall(`/api/couriers/${courierId}/penalty`, { method: 'POST', body: JSON.stringify({ amount, description }) }), 'Penalty applied successfully.', 'Failed to apply penalty');

    const requestCourierPayout = (courierId: number, amount: number) =>
        executeApiAction(apiCall(`/api/couriers/payouts`, { method: 'POST', body: JSON.stringify({ courierId, amount }) }), 'Payout request submitted.', 'Failed to submit payout request');

    const processCourierPayout = (transactionId: string) =>
        executeApiAction(apiCall(`/api/payouts/${transactionId}/process`, { method: 'PUT' }), 'Payout processed successfully.', 'Failed to process payout');
    
    const updateClientFlatRate = (clientId: number, flatRateFee: number) =>
        executeApiAction(apiCall(`/api/clients/${clientId}/flatrate`, { method: 'PUT', body: JSON.stringify({ flatRateFee }) }), "Client's flat rate updated.", 'Failed to update flat rate');

    const updateClientTaxCard = (clientId: number, taxCardNumber: string) =>
        executeApiAction(apiCall(`/api/clients/${clientId}/taxcard`, { method: 'PUT', body: JSON.stringify({ taxCardNumber }) }), "Client's tax card number updated.", 'Failed to update tax card');

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
            const currentBalance = txs.filter(t => t.status === CourierTransactionStatus.PROCESSED).reduce((s, t) => s + t.amount, 0);
            const pendingPayouts = txs.filter(t => t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING).reduce((s, t) => s + t.amount, 0);
            return { ...statConfig, deliveriesCompleted, deliveriesFailed, totalEarnings, currentBalance, pendingEarnings: Math.max(0, currentBalance + pendingPayouts) };
        });
    }, [rawCourierStats, courierTransactions, shipments]);

    // Unchanged calculation and permission logic
    const canAccessAdminFinancials = useCallback((user: User): boolean => user.role === UserRole.ADMIN, []);
    const canCreateUsers = useCallback((user: User): boolean => user.role === UserRole.ADMIN || user.role === UserRole.SUPER_USER, []);
    const getTaxCardNumber = useCallback((clientId: number): string => users.find(u => u.id === clientId)?.taxCardNumber || '', [users]);
    const canCourierReceiveAssignment = useCallback((courierId: number): boolean => {
        const courier = courierStats.find(c => c.courierId === courierId);
        if (!courier || !financialSettings) return false;
        return !courier.isRestricted && courier.performanceRating >= financialSettings.performanceThreshold && courier.consecutiveFailures < financialSettings.consecutiveFailureLimit;
    }, [courierStats, financialSettings]);
    const calculateCommission = useCallback((shipment: Shipment, courier: CourierStats): number => {
      let baseCommission = courier.commissionType === CommissionType.PERCENTAGE ? shipment.price * (courier.commissionValue / 100) : courier.commissionValue;
      return Math.round(baseCommission * 100) / 100;
    }, []);
    const getAdminFinancials = useCallback((): AdminFinancials => {
        const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED);
        const grossRevenue = deliveredShipments.reduce((sum, s) => sum + s.price, 0);
        const totalClientFees = deliveredShipments.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
        const totalCourierPayouts = deliveredShipments.reduce((sum, s) => sum + (s.courierCommission || 0), 0);
        return { grossRevenue, netRevenue: totalClientFees - totalCourierPayouts, totalClientFees, totalCourierPayouts, totalOrders: deliveredShipments.length, taxCarNumber: '' };
    }, [shipments]);
    const getClientFinancials = useCallback((): ClientFinancialSummary[] => {
        return users.filter(u => u.role === UserRole.CLIENT).map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id && s.status === ShipmentStatus.DELIVERED);
            return { clientId: client.id, clientName: client.name, totalOrders: clientShipments.length, orderSum: clientShipments.reduce((sum, s) => sum + s.packageValue, 0), flatRateFee: client.flatRateFee || 0 };
        });
    }, [users, shipments]);

    const value = useMemo(() => ({ 
        currentUser: currentUserWithBalance, users, shipments, clientTransactions, toasts, notifications, notificationStatus, courierStats, courierTransactions, financialSettings, isLoading,
        login, logout, addShipment, updateShipmentStatus, updateShipmentFees, assignShipmentToCourier, addUser, updateUser, removeUser, resetPassword, addToast, assignReturn, reassignCourier, resendNotification, canCourierReceiveAssignment, updateCourierSettings, applyManualPenalty, processCourierPayout, requestCourierPayout, updateClientFlatRate, updateClientTaxCard, getTaxCardNumber, getAdminFinancials, getClientFinancials, canAccessAdminFinancials, canCreateUsers, calculateCommission
    }), [
        currentUserWithBalance, users, shipments, clientTransactions, toasts, notifications, notificationStatus, courierStats, courierTransactions, financialSettings, isLoading,
        login, logout, addShipment, updateShipmentStatus, updateShipmentFees, assignShipmentToCourier, addUser, updateUser, removeUser, resetPassword, addToast, assignReturn, reassignCourier, resendNotification, canCourierReceiveAssignment, updateCourierSettings, applyManualPenalty, processCourierPayout, requestCourierPayout, updateClientFlatRate, updateClientTaxCard, getTaxCardNumber, getAdminFinancials, getClientFinancials, canAccessAdminFinancials, canCreateUsers, calculateCommission
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};