import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, UserRole } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, CheckCircleIcon, ClockIcon, XCircleIcon, TruckIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const TotalShipments = () => {
    const { currentUser, shipments } = useAppContext();
    
    if (currentUser?.role !== UserRole.SUPER_USER && currentUser?.role !== UserRole.ADMIN) {
        return <div className="text-center py-8">Access denied. Super User or Admin access required.</div>;
    }

    // Calculate shipment statistics
    const totalShipments = shipments.length;
    const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED);
    const inTransitShipments = shipments.filter(s => s.status === ShipmentStatus.IN_TRANSIT);
    const pendingShipments = shipments.filter(s => s.status === ShipmentStatus.PENDING_ASSIGNMENT);
    const failedShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERY_FAILED || s.status === ShipmentStatus.RETURNED);
    const returnRequestedShipments = shipments.filter(s => s.status === ShipmentStatus.RETURN_REQUESTED);

    // Calculate delivery rate
    const deliveryRate = totalShipments > 0 ? (deliveredShipments.length / totalShipments * 100) : 0;

    // Calculate average delivery time (for delivered shipments with delivery dates)
    const deliveredWithDates = deliveredShipments.filter(s => s.deliveryDate && s.creationDate);
    const totalDeliveryTime = deliveredWithDates.reduce((sum, s) => {
        const creation = new Date(s.creationDate);
        const delivery = new Date(s.deliveryDate!);
        return sum + (delivery.getTime() - creation.getTime());
    }, 0);
    const avgDeliveryTimeHours = deliveredWithDates.length > 0 ? totalDeliveryTime / (deliveredWithDates.length * 1000 * 60 * 60) : 0;

    // Prepare data for the chart (shipments by status)
    const statusData = [
        { status: 'Delivered', count: deliveredShipments.length, color: '#16a34a' },
        { status: 'In Transit', count: inTransitShipments.length, color: '#3b82f6' },
        { status: 'Pending', count: pendingShipments.length, color: '#f59e0b' },
        { status: 'Failed/Returned', count: failedShipments.length, color: '#ef4444' },
        { status: 'Return Requested', count: returnRequestedShipments.length, color: '#8b5cf6' },
    ];

    const maxCount = Math.max(...statusData.map(d => d.count), 1);

    const handleExport = () => {
        const headers = ['Shipment ID', 'Status', 'Client', 'Courier', 'Creation Date', 'Delivery Date', 'Package Value', 'Shipping Fee'];
        const body = shipments
            .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime())
            .map(s => [
                s.id,
                s.status,
                s.clientName,
                s.courierId ? `Courier ${s.courierId}` : 'Unassigned',
                new Date(s.creationDate).toLocaleDateString(),
                s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString() : 'N/A',
                s.packageValue.toFixed(2),
                (s.clientFlatRateFee || 0).toFixed(2)
            ]);
        
        exportToCsv(headers, body, 'Total_Shipments_Report');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Total Shipments Overview</h1>
                    <p className="text-slate-500 mt-1">
                        Comprehensive view of all shipments across the platform
                    </p>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export as CSV
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Shipments" 
                    value={totalShipments} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#3b82f6" 
                />
                <StatCard 
                    title="Delivered" 
                    value={deliveredShipments.length} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle={`${deliveryRate.toFixed(1)}% success rate`}
                />
                <StatCard 
                    title="In Transit" 
                    value={inTransitShipments.length} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#f59e0b"
                />
                <StatCard 
                    title="Pending" 
                    value={pendingShipments.length} 
                    icon={<ClockIcon className="w-7 h-7"/>} 
                    color="#8b5cf6"
                />
            </div>

            {/* Additional Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Failed/Returned" 
                    value={failedShipments.length} 
                    icon={<XCircleIcon className="w-7 h-7"/>} 
                    color="#ef4444"
                />
                <StatCard 
                    title="Return Requested" 
                    value={returnRequestedShipments.length} 
                    icon={<XCircleIcon className="w-7 h-7"/>} 
                    color="#dc2626"
                />
                <StatCard 
                    title="Avg Delivery Time" 
                    value={`${avgDeliveryTimeHours.toFixed(1)}h`} 
                    icon={<ClockIcon className="w-7 h-7"/>} 
                    color="#059669"
                    subtitle="For delivered shipments"
                />
            </div>

            {/* Shipment Status Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Shipments by Status</h2>
                <div className="h-64 flex items-end gap-4 border-l border-b border-slate-200 pl-4 pb-4">
                   {statusData.map(({ status, count, color }) => (
                       <div key={status} className="flex-1 h-full flex flex-col justify-end items-center group">
                            <div 
                                className="w-full transition-colors rounded-t-md"
                                style={{ 
                                    height: `${(count / maxCount) * 100}%`,
                                    backgroundColor: color
                                }}
                                title={`${status}: ${count} shipments`}
                            ></div>
                            <span className="text-xs text-slate-500 mt-1 text-center">{status}</span>
                            <span className="text-xs font-semibold text-slate-700">{count}</span>
                       </div>
                   ))}
                </div>
            </div>

            {/* Recent Shipments Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5">
                    <h2 className="text-xl font-bold text-slate-800">Recent Shipments</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment ID</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Courier</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                           {shipments
                               .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime())
                               .slice(0, 10)
                               .map(s => (
                               <tr key={s.id}>
                                   <td className="px-6 py-4 font-mono text-sm text-slate-600">{s.id}</td>
                                   <td className="px-6 py-4">
                                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                           s.status === ShipmentStatus.DELIVERED ? 'bg-green-100 text-green-800' :
                                           s.status === ShipmentStatus.IN_TRANSIT ? 'bg-blue-100 text-blue-800' :
                                                                                       s.status === ShipmentStatus.PENDING_ASSIGNMENT ? 'bg-yellow-100 text-yellow-800' :
                                           'bg-red-100 text-red-800'
                                       }`}>
                                           {s.status}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 text-slate-600">{s.clientName}</td>
                                                                       <td className="px-6 py-4 text-slate-600">{s.courierId ? `Courier ${s.courierId}` : 'Unassigned'}</td>
                                   <td className="px-6 py-4 text-slate-800">{new Date(s.creationDate).toLocaleDateString()}</td>
                                   <td className="px-6 py-4 font-semibold text-slate-800 text-right">{s.packageValue.toFixed(2)} EGP</td>
                               </tr>
                           ))}
                           {shipments.length === 0 && (
                               <tr><td colSpan={6} className="text-center py-8 text-slate-500">No shipments found.</td></tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TotalShipments; 