import React from 'react';
import { Shipment } from '../../types';
import { ShipmentStatusBadge } from '../common/ShipmentStatusBadge';

interface ShipmentListProps {
    shipments: Shipment[]; 
    onSelect?: (shipment: Shipment) => void;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({ shipments, onSelect }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">ID</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Recipient</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Date</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                    <th className="px-6 py-3 text-sm font-semibold text-slate-600">Price</th>
                    {onSelect && <th className="px-6 py-3 text-sm font-semibold text-slate-600"></th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                {shipments.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{s.id}</td>
                        <td className="px-6 py-4 text-slate-800 font-medium">{s.recipientName}</td>
                        <td className="px-6 py-4 text-slate-600">{new Date(s.creationDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4"><ShipmentStatusBadge status={s.status} /></td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{s.price} EGP</td>
                        {onSelect && (
                            <td className="px-6 py-4">
                                <button onClick={() => onSelect(s)} className="text-primary-600 hover:text-primary-800 font-semibold">Details</button>
                            </td>
                        )}
                    </tr>
                ))}
                    {shipments.length === 0 && (
                    <tr><td colSpan={onSelect ? 6 : 5} className="text-center py-8 text-slate-500">No shipments found for the selected period.</td></tr>
                )}
            </tbody>
        </table>
    </div>
);