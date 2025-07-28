

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
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            {currentUser.role === UserRole.CLIENT && renderClientDashboard()}
            {currentUser.role === UserRole.COURIER && renderCourierDashboard()}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ASSIGNING_USER) && renderAdminDashboard()}
        </div>
    );
};

export default Dashboard;