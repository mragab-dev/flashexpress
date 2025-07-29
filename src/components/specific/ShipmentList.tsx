
import React, { useState } from 'react';
import { Shipment, ShipmentStatus } from '../../types';
import { ShipmentStatusBadge } from '../common/ShipmentStatusBadge';
import { PencilIcon } from '../Icons';

interface ShipmentListProps {
    shipments: Shipment[]; 
    onSelect?: (shipment: Shipment) => void;
    showClientFee?: boolean;
    showCourierCommission?: boolean;
    showNetProfit?: boolean;
    showEditableFees?: boolean;
    updateShipmentFees?: (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => void;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({ 
    shipments, 
    onSelect,
    showClientFee = false,
    showCourierCommission = false,
    showNetProfit = false,
    showEditableFees = false,
    updateShipmentFees,
}) => {
    const [editingCell, setEditingCell] = useState<{ shipmentId: string; field: 'clientFee' | 'courierCommission' } | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const isEditable = (status: ShipmentStatus) => {
        return ![ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.DELIVERY_FAILED].includes(status);
    };

    const startEditing = (shipment: Shipment, field: 'clientFee' | 'courierCommission') => {
        setEditingCell({ shipmentId: shipment.id, field });
        const currentValue = field === 'clientFee' 
            ? shipment.clientFlatRateFee 
            : shipment.courierCommission;
        setEditValue(String(currentValue || ''));
    };

    const handleSaveEdit = () => {
        if (!editingCell || !updateShipmentFees) return;
        
        const feeValue = parseFloat(editValue);
        if (!isNaN(feeValue) && feeValue >= 0) {
            const payload = editingCell.field === 'clientFee' 
                ? { clientFlatRateFee: feeValue }
                : { courierCommission: feeValue };
            updateShipmentFees(editingCell.shipmentId, payload);
        }
        
        setEditingCell(null);
        setEditValue('');
    };

    const renderFeeCell = (shipment: Shipment, field: 'clientFee' | 'courierCommission') => {
        const isEditing = editingCell?.shipmentId === shipment.id && editingCell?.field === field;
        const value = field === 'clientFee' ? shipment.clientFlatRateFee : shipment.courierCommission;
        const valueText = typeof value === 'number' ? `${value.toFixed(2)} EGP` : 'N/A';
        const canEdit = showEditableFees && isEditable(shipment.status) && updateShipmentFees;

        if (isEditing) {
            return (
                <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus
                    className="w-24 p-1 border border-primary-500 rounded-md"
                />
            );
        }

        return (
            <div className="flex items-center justify-between gap-2">
                <span>{valueText}</span>
                {canEdit && (
                    <button 
                        onClick={() => startEditing(shipment, field)} 
                        className="p-1 text-slate-400 hover:text-primary-600 rounded-md opacity-0 group-hover:opacity-100 transition"
                        title={`Edit ${field === 'clientFee' ? 'Client Fee' : 'Courier Commission'}`}
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 text-sm font-semibold text-slate-600">ID</th>
                        <th className="px-6 py-3 text-sm font-semibold text-slate-600">From</th>
                        <th className="px-6 py-3 text-sm font-semibold text-slate-600">Recipient</th>
                        <th className="px-6 py-3 text-sm font-semibold text-slate-600">Date</th>
                        <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                        <th className="px-6 py-3 text-sm font-semibold text-slate-600">Price</th>
                        {showClientFee && <th className="px-6 py-3 text-sm font-semibold text-slate-600">Client Fee</th>}
                        {showCourierCommission && <th className="px-6 py-3 text-sm font-semibold text-slate-600">Courier Commission</th>}
                        {showNetProfit && <th className="px-6 py-3 text-sm font-semibold text-slate-600">Net Profit</th>}
                        {onSelect && <th className="px-6 py-3 text-sm font-semibold text-slate-600"></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {shipments.map(s => {
                        const clientFee = s.clientFlatRateFee;
                        const courierCommission = s.courierCommission;

                        let netProfit = 0;
                        let netProfitText = 'N/A';
                        if (showNetProfit && typeof clientFee === 'number' && typeof courierCommission === 'number') {
                            netProfit = clientFee - courierCommission;
                            netProfitText = `${netProfit.toFixed(2)} EGP`;
                        } else if (showNetProfit && typeof clientFee === 'number') {
                             netProfitText = `${clientFee.toFixed(2)} EGP`;
                        }

                        return (
                            <tr key={s.id} className="hover:bg-slate-50 transition group">
                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{s.id}</td>
                                <td className="px-6 py-4 text-slate-800 font-medium">{s.clientName}</td>
                                <td className="px-6 py-4 text-slate-800 font-medium">{s.recipientName}</td>
                                <td className="px-6 py-4 text-slate-600">{new Date(s.creationDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4"><ShipmentStatusBadge status={s.status} /></td>
                                <td className="px-6 py-4 font-semibold text-slate-800">{s.price.toFixed(2)} EGP</td>
                                {showClientFee && <td className="px-6 py-4 font-semibold text-orange-600">{renderFeeCell(s, 'clientFee')}</td>}
                                {showCourierCommission && <td className="px-6 py-4 font-semibold text-indigo-600">{renderFeeCell(s, 'courierCommission')}</td>}
                                {showNetProfit && (
                                    <td className={`px-6 py-4 font-bold ${netProfit > 0 ? 'text-green-600' : netProfit < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                        {netProfitText}
                                    </td>
                                )}
                                {onSelect && (
                                    <td className="px-6 py-4">
                                        <button onClick={() => onSelect(s)} className="text-primary-600 hover:text-primary-800 font-semibold">Details</button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    {shipments.length === 0 && (
                        <tr><td colSpan={10} className="text-center py-8 text-slate-500">No shipments found for the selected period.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};