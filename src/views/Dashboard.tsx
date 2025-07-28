

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
        const today = new Date().toDateString();
        
        // Calculate cash collected today
        const codCollectedToday = courierShipments
            .filter(s => s.status === ShipmentStatus.DELIVERED && 
                    s.paymentMethod === PaymentMethod.COD && 
                    s.deliveryDate && 
                    new Date(s.deliveryDate).toDateString() === today)
            .reduce((sum, s) => sum + s.price, 0);
        
        // Calculate total money to be collected today (pending COD deliveries)
        const totalToCollectToday = courierShipments
            .filter(s => [ShipmentStatus.ASSIGNED_TO_COURIER, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status) && 
                    s.paymentMethod === PaymentMethod.COD)
            .reduce((sum, s) => sum + s.price, 0);
        
        // Get pending orders for today
        const pendingOrdersToday = courierShipments
            .filter(s => [ShipmentStatus.ASSIGNED_TO_COURIER, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status));
        
        return (
            <div className="space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Assigned Today" value={courierShipments.filter(s => new Date(s.creationDate).toDateString() === today).length} icon={<ClipboardListIcon className="w-7 h-7"/>} color="#3b82f6" />
                    <StatCard title="COD Collected Today" value={`${codCollectedToday.toFixed(2)} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#16a34a"/>
                    <StatCard title="Total to Collect" value={`${totalToCollectToday.toFixed(2)} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#f97316"/>
                    <StatCard title="Pending Deliveries" value={courierShipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon className="w-7 h-7"/>} color="#06b6d4" onClick={() => setActiveView('tasks')}/>
                </div>
                
                {/* Pending Orders Details */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">Today's Pending Orders</h2>
                        <p className="text-slate-500 mt-1">Orders that need to be delivered today</p>
                    </div>
                    <div className="overflow-x-auto">
                        {pendingOrdersToday.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {pendingOrdersToday.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-mono text-sm text-slate-600">{order.id}</td>
                                            <td className="px-6 py-4 text-slate-800 font-medium">{order.recipientName}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div>
                                                    <p className="font-medium">{order.toAddress.street}</p>
                                                    <p className="text-sm text-slate-500">{order.toAddress.zone}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{order.recipientPhone}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    order.paymentMethod === PaymentMethod.COD ? 'bg-orange-100 text-orange-800' : 
                                                    order.paymentMethod === PaymentMethod.WALLET ? 'bg-green-100 text-green-800' : 
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {order.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 font-semibold">{order.price} EGP</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    order.status === ShipmentStatus.OUT_FOR_DELIVERY ? 'bg-blue-100 text-blue-800' :
                                                    order.status === ShipmentStatus.IN_TRANSIT ? 'bg-yellow-100 text-yellow-800' :
                                                    order.status === ShipmentStatus.PICKED_UP ? 'bg-purple-100 text-purple-800' :
                                                    'bg-slate-100 text-slate-800'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-6 text-center text-slate-500">
                                <p>No pending orders for today</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    };

    const renderAdminDashboard = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon className="w-7 h-7"/>} color="#3b82f6" onClick={currentUser.role === UserRole.ADMIN ? () => setActiveView('shipments') : undefined}/>
            <StatCard title="Total Users" value={users.length} icon={<UsersIcon className="w-7 h-7"/>} color="#8b5cf6" onClick={currentUser.role === UserRole.ADMIN ? () => setActiveView('users') : undefined}/>
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