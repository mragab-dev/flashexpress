

import { useAppContext } from '../context/AppContext';
import { UserRole, ShipmentStatus, PaymentMethod, Permission, Shipment } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, TruckIcon, WalletIcon, ClipboardListIcon, UsersIcon, ChartBarIcon, CurrencyDollarIcon, CheckCircleIcon, SwitchHorizontalIcon, UserCircleIcon, ArchiveBoxIcon } from '../components/Icons';

interface DashboardProps {
    setActiveView: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
    const { currentUser, shipments, users, courierStats, hasPermission, setShipmentFilter } = useAppContext();
    
    if (!currentUser) return null;
    
    const clientShipments = shipments.filter(s => s.clientId === currentUser.id);

    const navigateWithFilter = (filter: (shipment: Shipment) => boolean) => {
        setShipmentFilter(() => filter);
        setActiveView('total-shipments');
    };

    const renderClientDashboard = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Shipments" value={clientShipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={() => setActiveView('shipments')} />
            <StatCard title="In Transit" value={clientShipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#8b5cf6"/>
            <StatCard title="Wallet Balance" value={`${currentUser.walletBalance?.toFixed(2) ?? 0} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#22c55e" onClick={() => setActiveView('wallet')} />
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
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#f97316"
                    onClick={() => setActiveView('tasks')}
                />
                <StatCard 
                    title="Current Balance" 
                    value={`${myStats?.currentBalance.toFixed(2) ?? '0.00'} EGP`} 
                    icon={<CurrencyDollarIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    onClick={() => setActiveView('courier-financials')}
                />
                <StatCard 
                    title="Pending Deliveries" 
                    value={myPendingTasks.length} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#06b6d4" 
                    onClick={() => setActiveView('tasks')}
                />
                <StatCard 
                    title="Total Deliveries" 
                    value={myDeliveredShipments.length} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#8b5cf6"
                    onClick={() => setActiveView('completed-orders')}
                />
            </div>
        )
    };

    const renderAdminDashboard = () => (
         <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                <StatCard title="Total Clients" value={users.filter(u => (u.roles || []).includes(UserRole.CLIENT)).length} icon={<UsersIcon className="w-7 h-7"/>} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                <StatCard title="Total Couriers" value={users.filter(u => (u.roles || []).includes(UserRole.COURIER)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
            </div>
            
            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Processing" value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} icon={<ClipboardListIcon className="w-7 h-7"/>} color="#f59e0b" onClick={() => setActiveView('packaging-and-assignment')}/>
                <StatCard title="In Transit" value={shipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#06b6d4" onClick={() => navigateWithFilter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status))}/>
                <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon className="w-7 h-7"/>} color="#16a34a" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString())}/>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                        onClick={() => setActiveView('users')} 
                        className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                        <UsersIcon className="w-8 h-8 text-blue-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-blue-800">Manage Users</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('courier-performance')} 
                        className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                    >
                        <TruckIcon className="w-8 h-8 text-orange-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-orange-800">Courier Performance</span>
                    </button>
                     <button 
                        onClick={() => setActiveView('admin-financials')} 
                        className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                    >
                        <ChartBarIcon className="w-8 h-8 text-green-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-green-800">Financials</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('notifications')} 
                        className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                        <ClipboardListIcon className="w-8 h-8 text-purple-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-purple-800">Notifications Log</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSuperUserDashboard = () => (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                <StatCard title="Total Clients" value={users.filter(u => (u.roles || []).includes(UserRole.CLIENT)).length} icon={<UsersIcon className="w-7 h-7"/>} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                <StatCard title="Total Couriers" value={users.filter(u => (u.roles || []).includes(UserRole.COURIER)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
            </div>
            
            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Processing" value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} icon={<ClipboardListIcon className="w-7 h-7"/>} color="#f59e0b" onClick={() => setActiveView('packaging-and-assignment')}/>
                <StatCard title="In Transit" value={shipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#06b6d4" onClick={() => navigateWithFilter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status))}/>
                <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon className="w-7 h-7"/>} color="#16a34a" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString())}/>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                        onClick={() => setActiveView('users')} 
                        className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                        <UsersIcon className="w-8 h-8 text-blue-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-blue-800">Manage Users</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('courier-performance')} 
                        className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                    >
                        <TruckIcon className="w-8 h-8 text-orange-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-orange-800">Courier Performance</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('notifications')} 
                        className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                        <ClipboardListIcon className="w-8 h-8 text-purple-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-purple-800">Notifications Log</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAssigningUserDashboard = () => (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="All Shipments"
                    value={shipments.length} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#3b82f6" 
                    onClick={() => setActiveView('shipments')}
                />
                <StatCard 
                    title="Processing" 
                    value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} 
                    icon={<ClipboardListIcon className="w-7 h-7"/>} 
                    color="#f59e0b" 
                    onClick={() => setActiveView('packaging-and-assignment')}
                />
                <StatCard 
                    title="In Transit" 
                    value={shipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#06b6d4" 
                    onClick={() => navigateWithFilter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status))}
                />
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hasPermission(Permission.ASSIGN_SHIPMENTS) && (
                        <button 
                            onClick={() => setActiveView('packaging-and-assignment')} 
                            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                            <SwitchHorizontalIcon className="w-8 h-8 text-blue-600 mx-auto mb-2"/>
                            <span className="text-sm font-semibold text-blue-800">Manage Assignments</span>
                        </button>
                    )}
                    {hasPermission(Permission.MANAGE_INVENTORY) && (
                        <button 
                            onClick={() => setActiveView('inventory')} 
                            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                        >
                            <ArchiveBoxIcon className="w-8 h-8 text-green-600 mx-auto mb-2"/>
                            <span className="text-sm font-semibold text-green-800">Manage Inventory</span>
                        </button>
                    )}
                    {hasPermission(Permission.VIEW_PROFILE) && (
                         <button 
                            onClick={() => setActiveView('profile')} 
                            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                        >
                            <UserCircleIcon className="w-8 h-8 text-purple-600 mx-auto mb-2"/>
                            <span className="text-sm font-semibold text-purple-800">My Profile</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDashboardByRole = () => {
        const roles = currentUser?.roles || [];

        // Check roles in order of priority to ensure the correct dashboard is displayed
        if (roles.includes(UserRole.ADMIN)) {
            return renderAdminDashboard();
        } else if (roles.includes(UserRole.SUPER_USER)) {
            return renderSuperUserDashboard();
        } else if (roles.includes(UserRole.ASSIGNING_USER)) {
            return renderAssigningUserDashboard();
        } else if (roles.includes(UserRole.COURIER)) {
            return renderCourierDashboard();
        } else if (roles.includes(UserRole.CLIENT)) {
            return renderClientDashboard();
        }
        
        // Fallback for users with no specific dashboard role
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800">No Dashboard Available</h2>
                <p className="text-slate-600 mt-2">Your role does not have a specific dashboard view configured.</p>
            </div>
        );
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            {renderDashboardByRole()}
        </div>
    );
};

export default Dashboard;