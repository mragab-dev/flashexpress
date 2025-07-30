

import { useAppContext } from '../context/AppContext';
import { UserRole, ShipmentStatus, PaymentMethod } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, TruckIcon, WalletIcon, ClipboardListIcon, UsersIcon, ChartBarIcon } from '../components/Icons';

interface DashboardProps {
    setActiveView: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
    const { currentUser, shipments, users } = useAppContext();
    
    if (!currentUser) return null;
    
    const clientShipments = shipments.filter(s => s.clientId === currentUser.id);
    const courierShipments = shipments.filter(s => s.courierId === currentUser.id);

    const renderClientDashboard = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Shipments" value={clientShipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={() => setActiveView('shipments')} />
            <StatCard title="In Transit" value={clientShipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#8b5cf6"/>
            <StatCard title="Wallet Balance" value={`${currentUser.walletBalance?.toFixed(2) ?? 0} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#22c55e" onClick={() => setActiveView('wallet')} />
        </div>
    );
    
    const renderCourierDashboard = () => {
        const codCollected = courierShipments
            .filter(s => s.status === ShipmentStatus.DELIVERED && s.paymentMethod === PaymentMethod.COD)
            .reduce((sum, s) => sum + s.price, 0);
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Assigned Today" value={courierShipments.filter(s => new Date(s.creationDate).toDateString() === new Date().toDateString()).length} icon={<ClipboardListIcon className="w-7 h-7"/>} color="#3b82f6" />
                <StatCard title="Pending Deliveries" value={courierShipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon className="w-7 h-7"/>} color="#06b6d4" onClick={() => setActiveView('tasks')}/>
                <StatCard title="COD Collected" value={`${codCollected.toFixed(2)} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#16a34a"/>
            </div>
        )
    };

    const renderAdminDashboard = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={currentUser.role === UserRole.ADMIN ? () => setActiveView('shipments') : undefined}/>
            <StatCard title="Total Clients" value={users.filter(u => u.role === UserRole.CLIENT).length} icon={<UsersIcon className="w-7 h-7"/>} color="#8b5cf6" onClick={currentUser.role === UserRole.ADMIN ? () => setActiveView('client-analytics') : undefined}/>
            <StatCard title="Pending Assignment" value={shipments.filter(s => s.status === ShipmentStatus.PENDING_ASSIGNMENT).length} icon={<ClipboardListIcon className="w-7 h-7"/>} color="#f97316" onClick={() => setActiveView('assign')}/>
            <StatCard title="Total Revenue" value={`${shipments.filter(s=> s.status === ShipmentStatus.DELIVERED).reduce((sum, s) => sum + s.price, 0).toFixed(2)} EGP`} icon={<ChartBarIcon className="w-7 h-7"/>} color="#16a34a" onClick={currentUser.role === UserRole.ADMIN ? () => setActiveView('financials') : undefined}/>
        </div>
    );

    const renderSuperUserDashboard = () => (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                <StatCard title="Total Clients" value={users.filter(u => u.role === UserRole.CLIENT).length} icon={<UsersIcon className="w-7 h-7"/>} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                <StatCard title="Total Couriers" value={users.filter(u => u.role === UserRole.COURIER).length} icon={<TruckIcon className="w-7 h-7"/>} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
                <StatCard title="Total Revenue" value={`${shipments.filter(s=> s.status === ShipmentStatus.DELIVERED).reduce((sum, s) => sum + s.price, 0).toFixed(2)} EGP`} icon={<ChartBarIcon className="w-7 h-7"/>} color="#16a34a" onClick={() => setActiveView('financials')}/>
            </div>
            
            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Pending Assignment" value={shipments.filter(s => s.status === ShipmentStatus.PENDING_ASSIGNMENT).length} icon={<ClipboardListIcon className="w-7 h-7"/>} color="#f59e0b" onClick={() => setActiveView('assign')}/>
                <StatCard title="In Transit" value={shipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length} icon={<TruckIcon className="w-7 h-7"/>} color="#06b6d4" onClick={() => setActiveView('shipments')}/>
                <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon className="w-7 h-7"/>} color="#16a34a"/>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                        onClick={() => setActiveView('user-management')} 
                        className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                        <UsersIcon className="w-8 h-8 text-blue-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-blue-800">Manage Users</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('admin-financials')} 
                        className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                    >
                        <ChartBarIcon className="w-8 h-8 text-green-600 mx-auto mb-2"/>
                        <span className="text-sm font-semibold text-green-800">Admin Financials</span>
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
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            {currentUser.role === UserRole.CLIENT && renderClientDashboard()}
            {currentUser.role === UserRole.COURIER && renderCourierDashboard()}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ASSIGNING_USER) && renderAdminDashboard()}
            {currentUser.role === UserRole.SUPER_USER && renderSuperUserDashboard()}
        </div>
    );
};

export default Dashboard;