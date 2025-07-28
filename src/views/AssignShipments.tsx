

import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, UserRole } from '../types';

const AssignShipments = () => {
    const { shipments, users, assignCourier } = useAppContext();
    const pendingShipments = shipments.filter(s => s.status === ShipmentStatus.PENDING_ASSIGNMENT);
    const couriers = users.filter(u => u.role === UserRole.COURIER);

    const handleAssign = (shipmentId: string, courierId: string) => {
        if (!courierId) return;
        assignCourier(shipmentId, parseInt(courierId));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Assign Shipments</h2>
                <p className="text-slate-500 mt-1 text-sm">Assign pending shipments to available couriers based on their zone.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment ID</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Destination Zone</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Assign To</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {pendingShipments.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 font-mono text-slate-600">{s.id}</td>
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
                                            .filter(c => c.zone === s.toAddress.zone)
                                            .map(c => <option key={c.id} value={c.id}>{c.name} ({c.zone})</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                         {pendingShipments.length === 0 && (
                            <tr><td colSpan={3} className="text-center py-8 text-slate-500">No shipments pending assignment.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssignShipments;