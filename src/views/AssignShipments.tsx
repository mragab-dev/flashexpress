import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, UserRole } from '../types';

const AssignShipments = () => {
    const { shipments, users, assignShipmentToCourier, canCourierReceiveAssignment, addToast } = useAppContext();
    const pendingShipments = shipments.filter(s => s.status === ShipmentStatus.PENDING_ASSIGNMENT);
    const couriers = users.filter(u => u.role === UserRole.COURIER);

    const handleAssign = async (shipmentId: string, courierId: string) => {
        if (!courierId) {
            addToast('Please select a courier', 'error');
            return;
        }
        
        try {
            const success = await assignShipmentToCourier(shipmentId, parseInt(courierId));
            if (success) {
                // Reset the select dropdown after successful assignment
                const selectElement = document.querySelector(`select[data-shipment-id="${shipmentId}"]`) as HTMLSelectElement;
                if (selectElement) {
                    selectElement.value = '';
                }
            }
        } catch (error) {
            addToast('Failed to assign shipment', 'error');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Assign Shipments</h2>
                <p className="text-slate-500 mt-1 text-sm">Assign pending shipments to available couriers based on their zone.</p>
            </div>
            
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden lg:block">
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
                                        data-shipment-id={s.id}
                                        className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="" disabled>Select an available courier...</option>
                                        {couriers
                                            .filter(c => c.zone === s.toAddress.zone && canCourierReceiveAssignment(c.id))
                                            .map(c => <option key={c.id} value={c.id}>{c.name} ({c.zone})</option>)}
                                        {couriers.filter(c => c.zone === s.toAddress.zone && canCourierReceiveAssignment(c.id)).length === 0 && (
                                            <option value="" disabled>No available couriers in {s.toAddress.zone}</option>
                                        )}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

             {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-4 bg-slate-50">
                {pendingShipments.map(s => (
                    <div key={s.id} className="responsive-card">
                        <div className="responsive-card-header">
                            <span className="font-mono text-sm text-slate-700">{s.id}</span>
                        </div>
                        <div className="responsive-card-item">
                            <span className="responsive-card-label">Zone</span>
                            <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-sm font-medium">{s.toAddress.zone}</span>
                        </div>
                         <div className="pt-3">
                             <label className="text-sm font-medium text-slate-700 mb-1 block">Assign To</label>
                            <select 
                                onChange={(e) => handleAssign(s.id, e.target.value)} 
                                defaultValue=""
                                data-shipment-id={s.id}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="" disabled>Select courier...</option>
                                {couriers
                                    .filter(c => c.zone === s.toAddress.zone && canCourierReceiveAssignment(c.id))
                                    .map(c => <option key={c.id} value={c.id}>{c.name} ({c.zone})</option>)}
                                {couriers.filter(c => c.zone === s.toAddress.zone && canCourierReceiveAssignment(c.id)).length === 0 && (
                                    <option value="" disabled>No couriers in {s.toAddress.zone}</option>
                                )}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            {pendingShipments.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                    <p className="font-semibold">No Shipments Pending</p>
                    <p className="text-sm">There are no shipments waiting for assignment.</p>
                </div>
            )}
        </div>
    );
};

export default AssignShipments;
