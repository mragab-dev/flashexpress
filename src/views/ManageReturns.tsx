

import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, UserRole } from '../types';

const ManageReturns = () => {
    const { shipments, users, assignReturn } = useAppContext();
    const returnRequests = shipments.filter(s => s.status === ShipmentStatus.RETURN_REQUESTED);
    const couriers = users.filter(u => u.role === UserRole.COURIER);

    const handleAssign = (shipmentId: string, courierId: string) => {
        if (!courierId) return;
        assignReturn(shipmentId, parseInt(courierId));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Manage Return Requests</h2>
                <p className="text-slate-500 mt-1 text-sm">Assign couriers to pick up returned items from customers.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment ID</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Pickup Zone</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Assign To</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {returnRequests.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 font-mono text-slate-600">{s.id}</td>
                                <td className="px-6 py-4 text-slate-800">{s.clientName}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-sm font-medium">{s.toAddress.zone}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        onChange={(e) => handleAssign(s.id, e.target.value)} 
                                        defaultValue=""
                                        className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="" disabled>Select a courier...</option>
                                        {couriers
                                            .filter(c => c.zone === s.toAddress.zone) // Return pickup is from original recipient
                                            .map(c => <option key={c.id} value={c.id}>{c.name} ({c.zone})</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                         {returnRequests.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-8 text-slate-500">No pending return requests.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageReturns;