import React from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, ShipmentStatus, PaymentMethod, Shipment } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, TruckIcon, WalletIcon, ClipboardListIcon, UsersIcon, ChartBarIcon, CurrencyDollarIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';

interface DashboardProps {
    setActiveView: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
    const { currentUser, shipments, users, courierStats, setShipmentFilter } = useAppContext();
    
    if (!currentUser) return null;
    
    const clientShipments = shipments.filter(s => s.clientId === currentUser.id);

    const navigateWithFilter = (filter: (shipment: Shipment) => boolean, view: string = 'total-shipments') => {
        setShipmentFilter(() => filter);
        setActiveView(view);
    };

    const renderClientDashboard = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Shipments" value={clientShipments.length} icon={<PackageIcon />} color="#3b82f6" onClick={() => setActiveView('shipments')} />
            <StatCard title="Out for Delivery" value={clientShipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon />} color="#8b5cf6" onClick={() => navigateWithFilter(s => s.clientId === currentUser.id && s.status === ShipmentStatus.OUT_FOR_DELIVERY, 'shipments')} />
            <StatCard title="Wallet Balance" value={`${currentUser.walletBalance?.toFixed(2) ?? 0} EGP`} icon={<WalletIcon />} color="#22c55e" onClick={() => setActiveView('wallet')} />
        </div>
    );
    
    const renderCourierDashboard = () => {
        const myStats = courierStats.find(cs => cs.courierId === currentUser.id);
        const myPendingTasks = shipments.filter(s => s.courierId === currentUser.id && ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
        const cashToCollect = myPendingTasks.filter(s => s.paymentMethod === PaymentMethod.COD).reduce((sum, s) => sum + s.price, 0);
        const myDeliveredShipments = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.DELIVERED);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Cash to Collect" 
                    value={`${cashToCollect.toFixed(2)} EGP`} 
                    icon={<WalletIcon />} 
                    color="#f97316"
                    onClick={() => setActiveView('tasks')}
                />
                <StatCard 
                    title="Current Balance" 
                    value={`${myStats?.currentBalance.toFixed(2) ?? '0.00'} EGP`} 
                    icon={<CurrencyDollarIcon />} 
                    color="#16a34a"
                    onClick={() => setActiveView('courier-financials')}
                />
                <StatCard 
                    title="Pending Deliveries" 
                    value={myPendingTasks.length} 
                    icon={<TruckIcon />} 
                    color="#06b6d4" 
                    onClick={() => setActiveView('tasks')}
                />
                <StatCard 
                    title="Total Deliveries" 
                    value={myDeliveredShipments.length} 
                    icon={<CheckCircleIcon />} 
                    color="#8b5cf6"
                    onClick={() => setActiveView('completed-orders')}
                />
            </div>
        )
    };

    const renderAdminDashboard = () => {
        const isShipmentOverdue = (shipment: Shipment) => {
            if ([ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(shipment.status)) {
                return false;
            }
            const twoAndHalfDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000);
            return new Date(shipment.creationDate) < twoAndHalfDaysAgo;
        };

        const overdueShipments = shipments.filter(isShipmentOverdue);

        return (
            <div className="space-y-8">
                {/* Main KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon />} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                    <StatCard title="Total Clients" value={users.filter(u => (u.roles || []).includes(UserRole.CLIENT)).length} icon={<UsersIcon />} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                    <StatCard title="Total Couriers" value={users.filter(u => (u.roles || []).includes(UserRole.COURIER)).length} icon={<TruckIcon />} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
                </div>
                
                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Processing" value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} icon={<ClipboardListIcon />} color="#f59e0b" onClick={() => setActiveView('packaging-and-assignment')}/>
                    <StatCard title="Out for Delivery" value={shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon />} color="#06b6d4" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY)}/>
                    <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon />} color="#16a34a" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString())}/>
                    <StatCard 
                        title="Overdue" 
                        value={overdueShipments.length} 
                        icon={<ClockIcon />} 
                        color="#ef4444"
                        onClick={() => navigateWithFilter(isShipmentOverdue)}
                    />
                </div>
                
                {/* Quick Actions */}
                <div className="card">
                    <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <button 
                            onClick={() => setActiveView('users')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <UsersIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Manage Users</span>
                        </button>
                        <button 
                            onClick={() => setActiveView('courier-performance')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <TruckIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Courier Performance</span>
                        </button>
                         <button 
                            onClick={() => setActiveView('admin-financials')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <ChartBarIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Financials</span>
                        </button>
                        <button 
                            onClick={() => setActiveView('notifications')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <ClipboardListIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Notifications Log</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    const renderSuperUserDashboard = () => (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon />} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                <StatCard title="Total Clients" value={users.filter(u => (u.roles || []).includes(UserRole.CLIENT)).length} icon={<UsersIcon />} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                <StatCard title="Total Couriers" value={users.filter(u => (u.roles || []).includes(UserRole.COURIER)).length} icon={<TruckIcon />} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
            </div>
            
            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Processing" value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} icon={<ClipboardListIcon />} color="#f59e0b" onClick={() => setActiveView('packaging-and-assignment')}/>
                <StatCard title="Out for Delivery" value={shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon />} color="#06b6d4" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY)}/>
                <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon />} color="#16a34a" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString())}/>
            </div>
            
            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                        onClick={() => setActiveView('users')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <UsersIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Manage Users</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('courier-performance')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <TruckIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Courier Performance</span>
                    </button>
                     <button 
                        onClick={() => setActiveView('client-analytics')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <ChartBarIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Client Analytics</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('notifications')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <ClipboardListIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Notifications Log</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAssigningUserDashboard = () => {
        const shipmentsToAssign = shipments.filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT);
        const outForDeliveryShipments = shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY);
       return (
           <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <StatCard title="Ready for Assignment" value={shipmentsToAssign.length} icon={<PackageIcon />} color="#8b5cf6" onClick={() => setActiveView('packaging-and-assignment')} />
                   <StatCard title="Total Out for Delivery" value={outForDeliveryShipments.length} icon={<TruckIcon />} color="#06b6d4" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY)} />
               </div>
           </div>
       );
    };

    const roles = currentUser.roles || [];

    if (roles.includes(UserRole.ADMIN)) {
        return renderAdminDashboard();
    }
    if (roles.includes(UserRole.SUPER_USER)) {
        return renderSuperUserDashboard();
    }
    if (roles.includes(UserRole.ASSIGNING_USER)) {
        return renderAssigningUserDashboard();
    }
    if (roles.includes(UserRole.COURIER)) {
        return renderCourierDashboard();
    }
    if (roles.includes(UserRole.CLIENT)) {
        return renderClientDashboard();
    }
    
    return <div>Welcome! Your role does not have a specific dashboard.</div>;
};

export default Dashboard;