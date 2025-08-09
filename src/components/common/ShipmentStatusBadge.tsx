

import React from 'react';
import { ShipmentStatus } from '../../types';

export const ShipmentStatusBadge: React.FC<{ status: ShipmentStatus }> = ({ status }) => {
    const statusStyles: Record<ShipmentStatus, string> = {
        [ShipmentStatus.WAITING_FOR_PACKAGING]: 'bg-orange-100 text-orange-800',
        [ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT]: 'bg-yellow-100 text-yellow-800',
        [ShipmentStatus.ASSIGNED_TO_COURIER]: 'bg-blue-100 text-blue-800',
        [ShipmentStatus.PICKED_UP]: 'bg-indigo-100 text-indigo-800',
        [ShipmentStatus.IN_TRANSIT]: 'bg-purple-100 text-purple-800',
        [ShipmentStatus.OUT_FOR_DELIVERY]: 'bg-cyan-100 text-cyan-800',
        [ShipmentStatus.DELIVERED]: 'bg-green-100 text-green-800',
        [ShipmentStatus.DELIVERY_FAILED]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};
