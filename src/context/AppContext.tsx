// src/context/AppContext.tsx



import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Shipment, Toast, ClientTransaction, Notification, CourierStats, CourierTransaction, AdminFinancials, ClientFinancialSummary, CustomRole, Permission, InventoryItem, Asset, PackagingLogEntry, Supplier, SupplierTransaction, InAppNotification, TierSetting, PartnerTier } from '../types';
import { UserRole, ShipmentStatus, CommissionType, CourierTransactionType, CourierTransactionStatus, ShipmentPriority, PaymentMethod } from '../types';
import { apiFetch } from '../api/client';
import { io, Socket } from 'socket.io-client';
import { getFromStorage, saveToStorage } from '../utils/storage';

type NotificationStatus = 'sending' | 'sent' | 'failed';
type ShipmentFilter = (shipment: Shipment) => boolean;

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
    inventoryItems: InventoryItem[];
    assets: Asset[];
    suppliers: Supplier[];
    supplierTransactions: SupplierTransaction[];
    inAppNotifications: InAppNotification[];
    tierSettings: TierSetting[];
    isLoading: boolean;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    addShipment: (shipment: Omit<Shipment, 'id' | 'creationDate' | 'status' | 'statusHistory' | 'packagingLog'>) => Promise<void>;
    updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, details?: { failureReason?: string; failurePhoto?: string | null; }) => Promise<boolean>;
    revertShipmentStatus: (shipmentId: string) => Promise<void>;
    updateShipmentFees: (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => Promise<void>;
    updateShipmentPackaging: (shipmentId: string, packagingLog: PackagingLogEntry[], packagingNotes: string) => Promise<void>;
    assignShipmentToCourier: (shipmentId: string, courierId: number) => Promise<boolean>;
    reassignCourier: (shipmentId: string, newCourierId: number) => Promise<void>;
    addUser: (userData: Omit<User, 'id' | 'publicId'>) => Promise<void>;
    updateUser: (userId: number, userData: Partial<User>, silent?: boolean) => Promise<void>;
    removeUser: (userId: number) => Promise<void>;
    resetPassword: (userId: number, newPassword: string) => Promise<void>;
    addToast: (message: string, type: Toast['type'], duration?: number) => void;
    removeToast: (toastId: number) => void;
    resendNotification: (notificationId: string) => Promise<void>;
    canCourierReceiveAssignment: (courierId: number) => boolean;
    updateCourierSettings: (courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) => Promise<void>;
    applyManualPenalty: (courierId: number, amount: number, description: string) => Promise<void>;
    processCourierPayout: (transactionId: string, processedAmount: number, transferEvidence?: string) => Promise<void>;
    declineCourierPayout: (transactionId: string) => Promise<void>;
    requestCourierPayout: (courierId: number, amount: number, paymentMethod: 'Cash' | 'Bank Transfer') => Promise<void>;
    requestClientPayout: (userId: number, amount: number) => Promise<void>;
    processClientPayout: (transactionId: string) => Promise<void>;
    updateClientFlatRate: (clientId: number, flatRate: number) => Promise<void>;
    updateClientTaxCard: (clientId: number, taxCardNumber: string) => Promise<void>;
    updateTierSettings: (settings: TierSetting[]) => Promise<void>;
    updateClientTier: (clientId: number, tier: PartnerTier | null) => Promise<void>;
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
    shipmentFilter: ShipmentFilter | null;
    setShipmentFilter: React.Dispatch<React.SetStateAction<ShipmentFilter | null>>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    autoAssignShipments: () => Promise<void>;
    bulkPackageShipments: (shipmentIds: string[], materialsSummary: Record<string, number>, packagingNotes: string) => Promise<void>;
    bulkAssignShipments: (shipmentIds: string[], courierId: number) => Promise<void>;
    bulkUpdateShipmentStatus: (shipmentIds: string[], status: ShipmentStatus) => Promise<void>;
    // Inventory
    addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<void>;
    updateInventoryItem: (itemId: string, data: Partial<InventoryItem>) => Promise<void>;
    deleteInventoryItem: (itemId: string) => Promise<void>;
    // Assets
    addAsset: (asset: Omit<Asset, 'id' | 'status'>) => Promise<void>;
    updateAsset: (assetId: string, data: Partial<Asset>) => Promise<void>;
    deleteAsset: (assetId: string) => Promise<void>;
    assignAsset: (assetId: string, userId: number | null) => Promise<void>;
    // Suppliers
    addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (supplierId: string, data: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addSupplierTransaction: (transaction: Omit<SupplierTransaction, 'id'>) => Promise<void>;
    deleteSupplierTransaction: (transactionId: string) => Promise<void>;
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
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>([]);
    const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
    const [tierSettings, setTierSettings] = useState<TierSetting[]>([]);
    const [shipmentFilter, setShipmentFilter] = useState<ShipmentFilter | null>(null);
    const [theme, setThemeState] = useState<'light' | 'dark'>(() => getFromStorage('app-theme', 'dark'));
    
    const [isLoading, setIsLoading] = useState(false);

    const setTheme = (newTheme: 'light' | 'dark') => {
        setThemeState(newTheme);
        saveToStorage('app-theme', newTheme);
    };
    
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
    }, [theme]);

    const courierStats = useMemo(() => {
        return rawCourierStats.map(stat => {
            const relevantTransactions = courierTransactions.filter(t => t.courierId === stat.courierId);
            const totalEarnings = relevantTransactions
                .filter(t => t.type === CourierTransactionType.COMMISSION || t.type === CourierTransactionType.BONUS || t.type === CourierTransactionType.REFERRAL_BONUS)
                .reduce((sum, t) => sum + t.amount, 0);

            const totalDeductions = relevantTransactions
                .filter(t => t.type === CourierTransactionType.PENALTY || t.type === CourierTransactionType.WITHDRAWAL_PROCESSED)
                .reduce((sum, t) => sum + t.amount, 0); // amounts are negative

            const pendingWithdrawals = relevantTransactions
                .filter(t => t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING)
                .reduce((sum, t) => sum + t.amount, 0); // amounts are negative

            const currentBalance = totalEarnings + totalDeductions;
            
            const deliveriesCompleted = shipments.filter(s => s.courierId === stat.courierId && s.status === ShipmentStatus.DELIVERED).length;
            const deliveriesFailed = shipments.filter(s => s.courierId === stat.courierId && s.status === ShipmentStatus.DELIVERY_FAILED).length;

            return { ...stat, totalEarnings, currentBalance, pendingEarnings: -pendingWithdrawals, deliveriesCompleted, deliveriesFailed };
        });
    }, [rawCourierStats, courierTransactions, shipments]);

    const addToast = useCallback((message: string, type: Toast['type'], duration?: number) => {
        const id = Date.now();
        const toastDuration = duration || 10000; // Default 10 seconds
        setToasts(prev => [...prev, { id, message, type, duration: toastDuration }]);
    }, []);

    const removeToast = useCallback((toastId: number) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
    }, []);

    const logout = useCallback(() => {
        setCurrentUser(null);
        // Also clear other states
        setUsers([]);
        setShipments([]);
        setClientTransactions([]);
        setNotifications([]);
        setRawCourierStats([]);
        setCourierTransactions([]);
        setCustomRoles([]);
        setInventoryItems([]);
        setAssets([]);
        setSuppliers([]);
        setSupplierTransactions([]);
        setInAppNotifications([]);
        setTierSettings([]);
        addToast('You have been logged out.', 'info');
    }, [addToast]);

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
            setInventoryItems(data.inventoryItems || []);
            setAssets(data.assets || []);
            setSuppliers(data.suppliers || []);
            setSupplierTransactions(data.supplierTransactions || []);
            setInAppNotifications(data.inAppNotifications || []);
            setTierSettings(data.tierSettings || []);
        } catch (error: any) {
            addToast(`Failed to load data: ${error.message}`, 'error');
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [addToast, currentUser, logout]);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const rolesData: CustomRole[] = await apiFetch('/api/roles');
            setCustomRoles(rolesData);
            
            const user: User = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            
            // Augment user with permissions based on all their roles
            const safeUserRoles = Array.isArray(user.roles) ? user.roles : [];
            const allPermissions = safeUserRoles.reduce((acc, roleName) => {
                const role = rolesData.find(r => r.name === roleName);
                if (role && Array.isArray(role.permissions)) {
                    return [...acc, ...role.permissions];
                }
                return acc;
            }, [] as Permission[]);
            user.permissions = [...new Set(allPermissions)].sort(); // Ensure unique & sorted permissions

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
    
    // WebSocket integration for real-time updates
    useEffect(() => {
        if (!currentUser) {
            return;
        }

        const socketOptions = {
            transports: ['websocket'],
        };

        const socket: Socket = import.meta.env.VITE_API_URL 
            ? io(import.meta.env.VITE_API_URL, socketOptions) 
            : io(socketOptions);

        socket.on('connect', () => {
            console.log('Connected to WebSocket server with ID:', socket.id);
        });

        socket.on('data_updated', () => {
            console.log('Received data_updated event. Fetching new data...');
            addToast('Data updated in real-time.', 'info', 2000);
            fetchData();
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server.');
        });
        
        return () => {
            socket.disconnect();
        };
    }, [currentUser, fetchData, addToast]);

    // This effect ensures the currentUser in context is always up-to-date
    // with permissions and a calculated wallet balance.
    const userWithCalculatedData = useMemo(() => {
        if (!currentUser) return null;

        // 1. Recalculate permissions from the latest roles data
        const updatedUserFromList = users.find(u => u.id === currentUser.id);
        const safeUserRoles = updatedUserFromList ? (Array.isArray(updatedUserFromList.roles) ? updatedUserFromList.roles : []) : (Array.isArray(currentUser.roles) ? currentUser.roles : []);
        const allPermissions = safeUserRoles.reduce((acc, roleName) => {
            const role = customRoles.find(r => r.name === roleName);
            if (role?.permissions) {
                return [...acc, ...role.permissions];
            }
            return acc;
        }, [] as Permission[]);
        const permissions = [...new Set(allPermissions)].sort();

        // 2. Calculate wallet balance
        const myTransactions = clientTransactions.filter(t => t.userId === currentUser.id);
        const walletBalance = myTransactions.filter(t => t.status !== 'Pending').reduce((sum, t) => sum + t.amount, 0);

        return {
            ...currentUser,
            ...(updatedUserFromList || {}), // Get latest user data like name, address, etc.
            permissions,
            walletBalance,
        };

    }, [currentUser, users, customRoles, clientTransactions]);


    // --- App Functions ---
    const hasPermission = useCallback((permission: Permission) => {
        return userWithCalculatedData?.permissions?.includes(permission) ?? false;
    }, [userWithCalculatedData]);

    const addShipment = useCallback(async (shipmentData: Omit<Shipment, 'id' | 'creationDate' | 'status'>) => {
        if (!userWithCalculatedData) return;
        await apiFetch('/api/shipments', { method: 'POST', body: JSON.stringify(shipmentData) });
    }, [userWithCalculatedData]);
    
    const updateShipmentStatus = useCallback(async (shipmentId: string, status: ShipmentStatus, details: { failureReason?: string; failurePhoto?: string | null } = {}) => {
        try {
            await apiFetch(`/api/shipments/${shipmentId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, ...details }),
            });
            addToast(`Shipment ${shipmentId} updated to ${status}`, 'success');
            return true;
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
            return false;
        }
    }, [addToast]);

    const revertShipmentStatus = useCallback(async (shipmentId: string) => {
        try {
            // Use the existing, working status update endpoint with a special flag.
            await apiFetch(`/api/shipments/${shipmentId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isRevert: true }),
            });
            addToast(`Shipment ${shipmentId} status has been reverted.`, 'success');
        } catch (error: any) {
            addToast(`Error reverting status: ${error.message}`, 'error');
            console.error("Revert status failed:", error);
        }
    }, [addToast]);

    const sendDeliveryVerificationCode = useCallback(async (shipmentId: string) => {
        try {
            await apiFetch(`/api/shipments/${shipmentId}/send-delivery-code`, { method: 'POST' });
            addToast('Verification code sent to recipient!', 'success');
            return true;
        } catch (error: any) {
            addToast(`Failed to send code: ${error.message}`, 'error');
            return false;
        }
    }, [addToast]);

    const verifyDelivery = useCallback(async (shipmentId: string, code: string) => {
        try {
            await apiFetch(`/api/shipments/${shipmentId}/verify-delivery`, {
                method: 'POST',
                body: JSON.stringify({ code })
            });
            addToast('Delivery confirmed!', 'success');
            return true;
        } catch (error: any) {
            addToast(`Verification failed: ${error.message}`, 'error');
            return false;
        }
    }, [addToast]);

    const assignShipmentToCourier = useCallback(async (shipmentId: string, courierId: number) => {
        try {
            await apiFetch(`/api/shipments/${shipmentId}/assign`, {
                method: 'PUT',
                body: JSON.stringify({ courierId }),
            });
            addToast(`Shipment ${shipmentId} assigned successfully`, 'success');
            return true;
        } catch (error: any) {
            addToast(error.message, 'error');
            return false;
        }
    }, [addToast]);

    const addUser = useCallback(async (userData: Omit<User, 'id' | 'publicId'>) => {
        try {
            await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            addToast(`User ${userData.name} created successfully.`, 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }, [addToast]);
    
    const updateUser = useCallback(async (userId: number, userData: Partial<User>, silent = false) => {
        try {
            await apiFetch(`/api/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            if (!silent) addToast('User updated successfully.', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }, [addToast]);

    const removeUser = useCallback(async (userId: number) => {
        try {
            await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
            addToast('User deleted successfully.', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }, [addToast]);

    const resetPassword = useCallback(async (userId: number, newPassword: string) => {
        try {
            await apiFetch(`/api/users/${userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password: newPassword })
            });
            addToast("Password reset successfully.", 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }, [addToast]);

    const getCourierName = useCallback((courierId?: number) => {
        if (!courierId) return 'Unassigned';
        return users.find(u => u.id === courierId)?.name || 'Unknown Courier';
    }, [users]);

    const reassignCourier = useCallback(async (shipmentId: string, newCourierId: number) => {
        await assignShipmentToCourier(shipmentId, newCourierId);
    }, [assignShipmentToCourier]);
    
    const canCourierReceiveAssignment = useCallback((courierId: number) => {
        const stats = courierStats.find(cs => cs.courierId === courierId);
        return !stats?.isRestricted;
    }, [courierStats]);
    
    const getAdminFinancials = useCallback((): AdminFinancials => {
        const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED);
        const undeliveredShipments = shipments.filter(s => ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
        const inTransitCOD = shipments.filter(s => [ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status) && s.paymentMethod === PaymentMethod.COD);
        const deliveredCOD = shipments.filter(s => s.status === ShipmentStatus.DELIVERED && s.paymentMethod === PaymentMethod.COD);
    
        const totalCollectedMoney = deliveredShipments.reduce((sum, s) => sum + s.price, 0);
        const undeliveredPackagesValue = undeliveredShipments.reduce((sum, s) => sum + s.price, 0);
        
        const uncollectedTransferFees = undeliveredShipments
            .filter(s => s.paymentMethod === PaymentMethod.TRANSFER)
            .reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);

        const allShipmentsWithFees = shipments.filter(s => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.DELIVERY_FAILED);
        
        const potentialFeesFromPending = undeliveredShipments.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
        const totalRevenue = allShipmentsWithFees.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
        const totalCommission = deliveredShipments.reduce((sum, s) => sum + (s.courierCommission || 0), 0);
        const netRevenue = totalRevenue - totalCommission;

        const cashToCollect = inTransitCOD.reduce((sum, s) => sum + s.price, 0);
        const totalCODCollected = deliveredCOD.reduce((sum, s) => sum + s.price, 0);
        
        const totalOwedToCouriers = courierStats.reduce((sum, stat) => sum + (stat.currentBalance || 0), 0);

        return {
            totalCollectedMoney,
            undeliveredPackagesValue,
            uncollectedTransferFees,
            totalOwedToCouriers,
            totalRevenue,
            totalFees: potentialFeesFromPending,
            totalCommission,
            netRevenue,
            cashToCollect,
            totalCODCollected,
            totalOrders: deliveredShipments.length,
        };
    }, [shipments, courierStats]);
    
    const getClientFinancials = useCallback((): ClientFinancialSummary[] => {
        const clients = users.filter(u => (u.roles || []).includes(UserRole.CLIENT));
        return clients.map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id);
            const totalOrders = clientShipments.length;
            const orderSum = clientShipments.reduce((sum, s) => sum + s.price, 0);
            return {
                clientId: client.id,
                clientName: client.name,
                totalOrders,
                orderSum,
                flatRateFee: client.flatRateFee || 0,
                partnerTier: client.partnerTier,
                manualTierAssignment: client.manualTierAssignment,
            };
        });
    }, [users, shipments]);

    // ... other functions
    const updateShipmentFees = async (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => {
        await apiFetch(`/api/shipments/${shipmentId}/fees`, { method: 'PUT', body: JSON.stringify(fees) });
    };

    const updateShipmentPackaging = async (shipmentId: string, packagingLog: PackagingLogEntry[], packagingNotes: string) => {
        await apiFetch(`/api/shipments/${shipmentId}/packaging`, { method: 'PUT', body: JSON.stringify({ packagingLog, packagingNotes }) });
    };

    const resendNotification = async (notificationId: string) => {
        setNotificationStatus(prev => ({ ...prev, [notificationId]: 'sending' }));
        try {
            await apiFetch(`/api/notifications/${notificationId}/resend`, { method: 'POST' });
            setNotificationStatus(prev => ({ ...prev, [notificationId]: 'sent' }));
        } catch (error) {
            setNotificationStatus(prev => ({ ...prev, [notificationId]: 'failed' }));
        }
    };

    const updateCourierSettings = async (courierId: number, newSettings: Partial<Pick<CourierStats, 'commissionType' | 'commissionValue'>>) => {
        await apiFetch(`/api/couriers/${courierId}/settings`, { method: 'PUT', body: JSON.stringify(newSettings) });
    };

    const applyManualPenalty = async (courierId: number, amount: number, description: string) => {
        await apiFetch(`/api/couriers/${courierId}/penalty`, { method: 'POST', body: JSON.stringify({ amount, description }) });
    };

    const processCourierPayout = async (transactionId: string, processedAmount: number, transferEvidence?: string) => {
        await apiFetch(`/api/payouts/${transactionId}/process`, { method: 'PUT', body: JSON.stringify({ transferEvidence, processedAmount }) });
    };

    const declineCourierPayout = async (transactionId: string) => {
        await apiFetch(`/api/payouts/${transactionId}/decline`, { method: 'PUT' });
    };
    
    const requestCourierPayout = async (courierId: number, amount: number, paymentMethod: 'Cash' | 'Bank Transfer') => {
        await apiFetch(`/api/couriers/payouts`, { method: 'POST', body: JSON.stringify({ courierId, amount, paymentMethod }) });
    };

    const requestClientPayout = async (userId: number, amount: number) => {
        await apiFetch(`/api/clients/${userId}/payouts`, { method: 'POST', body: JSON.stringify({ amount }) });
    };

    const processClientPayout = async (transactionId: string) => {
        await apiFetch(`/api/client-transactions/${transactionId}/process`, { method: 'PUT' });
    };

    const updateClientFlatRate = async (clientId: number, flatRateFee: number) => {
        await apiFetch(`/api/clients/${clientId}/flatrate`, { method: 'PUT', body: JSON.stringify({ flatRateFee }) });
    };
    
    const updateClientTaxCard = async (clientId: number, taxCardNumber: string) => {
        await apiFetch(`/api/clients/${clientId}/taxcard`, { method: 'PUT', body: JSON.stringify({ taxCardNumber }) });
    };

    const updateTierSettings = async (settings: TierSetting[]) => {
        await apiFetch('/api/tier-settings', { method: 'PUT', body: JSON.stringify({ settings }) });
    };

    const updateClientTier = async (clientId: number, tier: PartnerTier | null) => {
        await apiFetch(`/api/clients/${clientId}/tier`, { method: 'PUT', body: JSON.stringify({ tier }) });
    };

    const getTaxCardNumber = (clientId: number): string => {
        return users.find(u => u.id === clientId)?.taxCardNumber || '';
    };

    const calculateCommission = (shipment: Shipment, courier: CourierStats) => {
        if (courier.commissionType === CommissionType.FLAT) {
            return courier.commissionValue;
        }
        return shipment.price * (courier.commissionValue / 100);
    };

    const calculatePriorityPrice = (baseRate: number, priority: ShipmentPriority, client: User) => {
        const multipliers = client.priorityMultipliers || { [ShipmentPriority.STANDARD]: 1.0, [ShipmentPriority.URGENT]: 1.5, [ShipmentPriority.EXPRESS]: 2.0 };
        return baseRate * (multipliers[priority] || 1.0);
    };

    const addRole = async (role: Omit<CustomRole, 'id'>) => {
        await apiFetch('/api/roles', { method: 'POST', body: JSON.stringify(role) });
    };

    const updateRole = async (roleId: string, roleData: Partial<CustomRole>) => {
        await apiFetch(`/api/roles/${roleId}`, { method: 'PUT', body: JSON.stringify(roleData) });
    };

    const deleteRole = async (roleId: string) => {
        await apiFetch(`/api/roles/${roleId}`, { method: 'DELETE' });
    };

    const markNotificationAsRead = useCallback(async (notificationId: string) => {
        try {
            // Optimistic update
            setInAppNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
            await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
        } catch (error: any) {
            addToast(`Failed to mark notification as read: ${error.message}`, 'error');
            // Revert on failure
            setInAppNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: false } : n));
        }
    }, [addToast]);
    
    const autoAssignShipments = async () => {
        try {
            const result = await apiFetch('/api/shipments/auto-assign', { method: 'POST' });
            addToast(result.message || 'Auto-assignment completed.', 'success');
        } catch (error: any) {
            addToast(`Auto-assignment failed: ${error.message}`, 'error');
        }
    };

    const bulkPackageShipments = useCallback(async (shipmentIds: string[], materialsSummary: Record<string, number>, packagingNotes: string) => {
        try {
            const result = await apiFetch('/api/shipments/bulk-package', {
                method: 'POST',
                body: JSON.stringify({ shipmentIds, materialsSummary, packagingNotes }),
            });
            addToast(result.message || 'Shipments packaged successfully.', 'success');
        } catch (error: any) {
            addToast(`Bulk packaging failed: ${error.message}`, 'error');
        }
    }, [addToast]);

    const bulkAssignShipments = useCallback(async (shipmentIds: string[], courierId: number) => {
        try {
            const result = await apiFetch('/api/shipments/bulk-assign', {
                method: 'POST',
                body: JSON.stringify({ shipmentIds, courierId }),
            });
            addToast(result.message || 'Shipments assigned successfully.', 'success');
        } catch (error: any) {
            addToast(`Bulk assignment failed: ${error.message}`, 'error');
        }
    }, [addToast]);

    const bulkUpdateShipmentStatus = useCallback(async (shipmentIds: string[], status: ShipmentStatus) => {
        try {
            const result = await apiFetch('/api/shipments/bulk-status-update', {
                method: 'POST',
                body: JSON.stringify({ shipmentIds, status }),
            });
            addToast(result.message || 'Shipments updated successfully.', 'success');
        } catch (error: any) {
            addToast(`Bulk update failed: ${error.message}`, 'error');
        }
    }, [addToast]);

    // Inventory
    const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
        await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(item) });
    };
    const updateInventoryItem = async (itemId: string, data: Partial<InventoryItem>) => {
        await apiFetch(`/api/inventory/${itemId}`, { method: 'PUT', body: JSON.stringify(data) });
    };
    const deleteInventoryItem = async (itemId: string) => {
        await apiFetch(`/api/inventory/${itemId}`, { method: 'DELETE' });
    };

    // Assets
    const addAsset = async (asset: Omit<Asset, 'id' | 'status'>) => {
        await apiFetch('/api/assets', { method: 'POST', body: JSON.stringify(asset) });
    };
    const updateAsset = async (assetId: string, data: Partial<Asset>) => {
        await apiFetch(`/api/assets/${assetId}`, { method: 'PUT', body: JSON.stringify(data) });
    };
    const deleteAsset = async (assetId: string) => {
        await apiFetch(`/api/assets/${assetId}`, { method: 'DELETE' });
    };
    const assignAsset = async (assetId: string, userId: number | null) => {
        if (userId) {
            await apiFetch(`/api/assets/${assetId}/assign`, { method: 'POST', body: JSON.stringify({ userId }) });
        } else {
            await apiFetch(`/api/assets/${assetId}/unassign`, { method: 'POST' });
        }
    };

    // Suppliers
    const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
        await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(supplier) });
    };
    const updateSupplier = async (supplierId: string, data: Partial<Supplier>) => {
        await apiFetch(`/api/suppliers/${supplierId}`, { method: 'PUT', body: JSON.stringify(data) });
    };
    const deleteSupplier = async (supplierId: string) => {
        await apiFetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
    };
    const addSupplierTransaction = async (transaction: Omit<SupplierTransaction, 'id'>) => {
        await apiFetch('/api/supplier-transactions', { method: 'POST', body: JSON.stringify(transaction) });
    };
    const deleteSupplierTransaction = async (transactionId: string) => {
        await apiFetch(`/api/supplier-transactions/${transactionId}`, { method: 'DELETE' });
    };

    const value: AppContextType = {
        currentUser: userWithCalculatedData,
        users,
        shipments,
        clientTransactions,
        toasts,
        notifications,
        notificationStatus,
        courierStats,
        courierTransactions,
        customRoles,
        inventoryItems,
        assets,
        suppliers,
        supplierTransactions,
        inAppNotifications,
        tierSettings,
        isLoading,
        theme,
        setTheme,
        login,
        logout,
        addShipment,
        updateShipmentStatus,
        revertShipmentStatus,
        updateShipmentFees,
        updateShipmentPackaging,
        assignShipmentToCourier,
        reassignCourier,
        addUser,
        updateUser,
        removeUser,
        resetPassword,
        addToast,
        removeToast,
        resendNotification,
        canCourierReceiveAssignment,
        updateCourierSettings,
        applyManualPenalty,
        processCourierPayout,
        declineCourierPayout,
        requestCourierPayout,
        requestClientPayout,
        processClientPayout,
        updateClientFlatRate,
        updateClientTaxCard,
        updateTierSettings,
        updateClientTier,
        getTaxCardNumber,
        getAdminFinancials,
        getClientFinancials,
        hasPermission,
        calculateCommission,
        calculatePriorityPrice,
        getCourierName,
        addRole,
        updateRole,
        deleteRole,
        sendDeliveryVerificationCode,
        verifyDelivery,
        shipmentFilter,
        setShipmentFilter,
        markNotificationAsRead,
        autoAssignShipments,
        bulkPackageShipments,
        bulkAssignShipments,
        bulkUpdateShipmentStatus,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        addAsset,
        updateAsset,
        deleteAsset,
        assignAsset,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierTransaction,
        deleteSupplierTransaction,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
