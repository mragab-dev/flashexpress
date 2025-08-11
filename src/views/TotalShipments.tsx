// src/views/TotalShipments.tsx



import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, Permission, UserRole } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, CheckCircleIcon, ClockIcon, XCircleIcon, TruckIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { ShipmentList } from '../components/specific/ShipmentList';

const TotalShipments = () => {
    const { shipments: allShipments, users, hasPermission, shipmentFilter, setShipmentFilter: setContextFilter } = useAppContext();
    
    // Local filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<'all' | number>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const clients = users.filter(u => u.roles.includes(UserRole.CLIENT));
    
    if (!hasPermission(Permission.VIEW_TOTAL_SHIPMENTS_OVERVIEW)) {
        return <div className="text-center py-8">Access denied. You do not have permission to view this page.</div>;
    }

    const visibleShipments = useMemo(() => {
        let baseShipments = shipmentFilter ? allShipments.filter(shipmentFilter) : allShipments;
        
        let filtered = baseShipments;
        // Apply local filters
        if (selectedDate) {
            filtered = filtered.filter(s => s.creationDate.startsWith(selectedDate));
        }
        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(s => 
                s.id.toLowerCase().includes(lowerCaseSearch) ||
                s.recipientName.toLowerCase().includes(lowerCaseSearch)
            );
        }
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(s => s.status === selectedStatus);
        }
        if (selectedClientId !== 'all') {
            filtered = filtered.filter(s => s.clientId === selectedClientId);
        }
        return filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [allShipments, shipmentFilter, selectedDate, searchTerm, selectedClientId, selectedStatus]);

    // Calculate shipment statistics based on visible shipments
    const totalShipments = visibleShipments.length;
    const deliveredShipments = visibleShipments.filter(s => s.status === ShipmentStatus.DELIVERED);
    const inTransitShipments = visibleShipments.filter(s => [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status));
    const pendingShipments = visibleShipments.filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT);
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
                         <button onClick={() => setContextFilter(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition">
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
            
             <div className="mb-6 bg-white p-4 rounded-xl shadow-sm flex flex-col lg:flex-row gap-4 items-center flex-wrap">
                <div className="flex-grow w-full lg:w-auto">
                    <input 
                        type="text"
                        placeholder="Search by ID or Recipient..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                <div className="flex-grow w-full lg:w-auto">
                    <select
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value="all">All Clients</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
                 <div className="flex-grow w-full lg:w-auto">
                    <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value as 'all' | ShipmentStatus)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value="all">All Statuses</option>
                        {Object.values(ShipmentStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                        aria-label="Filter by creation date"
                    />
                    {selectedDate && (
                        <button
                            onClick={() => setSelectedDate('')}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200 transition"
                            aria-label="Clear date filter"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <ShipmentList shipments={visibleShipments} showClientFee showCourierCommission showNetProfit />
            </div>
        </div>
    );
};

export default TotalShipments;
