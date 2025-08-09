

import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, Permission } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, CheckCircleIcon, ClockIcon, XCircleIcon, TruckIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { ShipmentList } from '../components/specific/ShipmentList';

const TotalShipments = () => {
    const { shipments, hasPermission, shipmentFilter, setShipmentFilter } = useAppContext();
    
    if (!hasPermission(Permission.VIEW_TOTAL_SHIPMENTS_OVERVIEW)) {
        return <div className="text-center py-8">Access denied. You do not have permission to view this page.</div>;
    }

    const visibleShipments = useMemo(() => {
        if (!shipmentFilter) return shipments;
        return shipments.filter(shipmentFilter);
    }, [shipments, shipmentFilter]);

    // Calculate shipment statistics based on visible shipments
    const totalShipments = visibleShipments.length;
    const deliveredShipments = visibleShipments.filter(s => s.status === ShipmentStatus.DELIVERED);
    const inTransitShipments = visibleShipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status));
    const pendingShipments = visibleShipments.filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT);
    const failedShipments = visibleShipments.filter(s => s.status === ShipmentStatus.DELIVERY_FAILED);
    const deliveryRate = totalShipments > 0 ? (deliveredShipments.length / totalShipments * 100) : 0;
    
    const handleExport = () => {
        const headers = ['Shipment ID', 'Status', 'Client', 'Courier', 'Creation Date', 'Delivery Date', 'Package Value', 'Shipping Fee'];
        const body = visibleShipments
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
        
        exportToCsv(headers, body, 'Filtered_Shipments_Report');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Shipments Overview</h1>
                    <p className="text-slate-500 mt-1">
                        {shipmentFilter ? 'Filtered view of shipments.' : 'Comprehensive view of all shipments.'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {shipmentFilter && (
                         <button onClick={() => setShipmentFilter(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition">
                            <XCircleIcon className="w-5 h-5"/>
                            Clear Filter
                        </button>
                    )}
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        Export as CSV
                    </button>
                </div>
            </div>

            {/* KPI Cards for filtered data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Shipments" 
                    value={totalShipments} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#3b82f6" 
                    subtitle={shipmentFilter ? "Matching filter" : "All time"}
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
                    title="Pending Assignment" 
                    value={pendingShipments.length} 
                    icon={<ClockIcon className="w-7 h-7"/>} 
                    color="#8b5cf6"
                />
            </div>
            
            {/* Full Shipment List */}
             <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <ShipmentList shipments={visibleShipments} showClientFee showCourierCommission showNetProfit />
            </div>
        </div>
    );
};

export default TotalShipments;