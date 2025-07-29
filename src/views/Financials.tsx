import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, PaymentMethod, UserRole } from '../types';
import { exportToCsv } from '../utils/pdf';
import { StatCard } from '../components/common/StatCard';
import { ChartBarIcon, CheckCircleIcon, WalletIcon, PackageIcon, DocumentDownloadIcon } from '../components/Icons';

const Financials = () => {
    const { currentUser, shipments, getTaxCardNumber } = useAppContext();
    
    // This view is for non-admin users to see basic financial information
    // Admin users should use the AdminFinancials view for complete access
    
    const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED && s.deliveryDate);
    
    // For clients, only show their own shipments
    const filteredShipments = currentUser?.role === UserRole.CLIENT 
        ? deliveredShipments.filter(s => s.clientId === currentUser.id)
        : deliveredShipments;
    
    const totalRevenue = filteredShipments.reduce((sum, s) => sum + s.price, 0);
    const totalDelivered = filteredShipments.length;
    const avgRevenue = totalDelivered > 0 ? totalRevenue / totalDelivered : 0;
    const totalCOD = filteredShipments.filter(s => s.paymentMethod === PaymentMethod.COD).reduce((sum, s) => sum + s.price, 0);
    
    const taxCardNumber = currentUser?.role === UserRole.CLIENT && currentUser.id 
        ? getTaxCardNumber(currentUser.id) 
        : '';

    // Prepare data for the chart (last 30 days)
    const revenueByDay: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        revenueByDay[dateString] = 0;
    }

    filteredShipments.forEach(s => {
        if(s.deliveryDate) {
            const dateString = s.deliveryDate.split('T')[0];
            if(revenueByDay.hasOwnProperty(dateString)) {
                revenueByDay[dateString] += s.price;
            }
        }
    });
    
    const chartData = Object.entries(revenueByDay).map(([date, revenue]) => ({
        date: new Date(date).getDate().toString(), // Just the day number
        revenue
    }));
    const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1); // Avoid division by zero

    const handleExport = () => {
        const headers = ['Shipment ID', 'Delivery Date', 'Client', 'Payment Method', 'Revenue (EGP)'];
        const body = filteredShipments
            .sort((a,b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime())
            .map(s => [
                s.id,
                new Date(s.deliveryDate!).toLocaleDateString(),
                s.clientName,
                s.paymentMethod,
                s.price.toFixed(2)
            ]);
        
        exportToCsv(headers, body, 'Financial_Report');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                 <div>
                     <h1 className="text-3xl font-bold text-slate-800">Financial Reports</h1>
                     <p className="text-slate-500 mt-1">
                         {currentUser?.role === UserRole.CLIENT 
                             ? 'Your order history and financial summary.' 
                             : 'An overview of the company\'s financial performance.'}
                     </p>
                 </div>
                 <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                     <DocumentDownloadIcon className="w-5 h-5"/>
                     Export as CSV
                 </button>
            </div>

            {/* Tax Card Number for Clients */}
            {currentUser?.role === UserRole.CLIENT && taxCardNumber && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Tax Information</h3>
                    <p className="text-blue-800">
                        Tax Card Number: <span className="font-mono font-bold">{taxCardNumber}</span>
                    </p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Revenue" value={`${totalRevenue.toFixed(2)} EGP`} icon={<ChartBarIcon className="w-7 h-7"/>} color="#16a34a" />
                <StatCard title="Shipments Delivered" value={totalDelivered} icon={<CheckCircleIcon className="w-7 h-7"/>} color="#3b82f6" />
                <StatCard title="COD to Collect" value={`${totalCOD.toFixed(2)} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#f97316"/>
                <StatCard title="Avg. Revenue/Shipment" value={`${avgRevenue.toFixed(2)} EGP`} icon={<PackageIcon className="w-7 h-7"/>} color="#8b5cf6"/>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Daily Revenue (Last 30 Days)</h2>
                <div className="h-64 flex items-end gap-2 border-l border-b border-slate-200 pl-4 pb-4">
                   {chartData.map(({ date, revenue }) => (
                       <div key={date} className="flex-1 h-full flex flex-col justify-end items-center group">
                            <div 
                                className="w-full bg-primary-400 hover:bg-primary-500 transition-colors rounded-t-md"
                                style={{ height: `${(revenue / maxRevenue) * 100}%` }}
                                title={`Day ${date}: ${revenue.toFixed(2)} EGP`}
                            ></div>
                            <span className="text-xs text-slate-500 mt-1">{date}</span>
                       </div>
                   ))}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5">
                    <h2 className="text-xl font-bold text-slate-800">All Transactions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment ID</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                           {filteredShipments.sort((a,b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime()).map(s => (
                               <tr key={s.id}>
                                   <td className="px-6 py-4 font-mono text-sm text-slate-600">{s.id}</td>
                                   <td className="px-6 py-4 text-slate-800">{new Date(s.deliveryDate!).toLocaleDateString()}</td>
                                   <td className="px-6 py-4 text-slate-600">{s.clientName}</td>
                                   <td className="px-6 py-4 text-slate-600">{s.paymentMethod}</td>
                                   <td className="px-6 py-4 font-semibold text-slate-800 text-right">{s.price.toFixed(2)} EGP</td>
                               </tr>
                           ))}
                           {filteredShipments.length === 0 && (
                               <tr><td colSpan={5} className="text-center py-8 text-slate-500">No delivered shipments yet.</td></tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Financials;
