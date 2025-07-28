

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, Shipment, ShipmentStatus } from '../types';
import { exportToCsv } from '../utils/pdf';
import { DocumentDownloadIcon } from '../components/Icons';
import { ShipmentList } from '../components/specific/ShipmentList';

interface ShipmentsViewProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const ShipmentsView: React.FC<ShipmentsViewProps> = ({ onSelectShipment }) => {
    const { currentUser, shipments, users } = useAppContext();
    const [shipmentFilter, setShipmentFilter] = useState<'all' | 'day' | 'week' | 'month'>('all');
    
    // Admin-specific filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<'all' | number>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');
    const clients = users.filter(u => u.role === UserRole.CLIENT);

    if (!currentUser) return null;

    const visibleShipments = useMemo(() => {
        let baseShipments = shipments;

        if (currentUser.role === UserRole.CLIENT) {
            baseShipments = shipments.filter(s => s.clientId === currentUser.id);
        }

        // Apply all filters sequentially
        let filtered = baseShipments;

        // 1. Time filter (for both client and admin)
        if (shipmentFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filtered = filtered.filter(s => {
                const creationDate = new Date(s.creationDate);
                if (shipmentFilter === 'day') return creationDate >= today;
                if (shipmentFilter === 'week') {
                    const oneWeekAgo = new Date(today);
                    oneWeekAgo.setDate(today.getDate() - 7);
                    return creationDate >= oneWeekAgo;
                }
                if (shipmentFilter === 'month') {
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(today.getMonth() - 1);
                    return creationDate >= oneMonthAgo;
                }
                return false;
            });
        }
        
        // 2. Admin-specific filters
        if (currentUser.role === UserRole.ADMIN) {
            // Client filter
            if (selectedClientId !== 'all') {
                filtered = filtered.filter(s => s.clientId === selectedClientId);
            }
            // Search filter
            if (searchTerm.trim() !== '') {
                filtered = filtered.filter(s => s.id.toLowerCase().includes(searchTerm.trim().toLowerCase()));
            }
            // Status filter
            if (selectedStatus !== 'all') {
                filtered = filtered.filter(s => s.status === selectedStatus);
            }
        }
        
        return filtered;
    }, [currentUser, shipments, shipmentFilter, searchTerm, selectedClientId, selectedStatus]);

    const handleExport = () => {
        if (!currentUser) return;
        
        const shipmentsToExport = visibleShipments; // Export filtered data
        
        if (currentUser.role === UserRole.ADMIN) {
            const headers = ['ID', 'Client', 'Recipient', 'Recipient Phone', 'Date', 'Status', 'Courier', 'Price (EGP)'];
            const body = shipmentsToExport.map(s => {
                const courierName = users.find(u => u.id === s.courierId)?.name || 'N/A';
                return [
                    s.id,
                    s.clientName,
                    s.recipientName,
                    s.recipientPhone,
                    new Date(s.creationDate).toLocaleDateString(),
                    s.status,
                    courierName,
                    s.price.toFixed(2)
                ];
            });
            exportToCsv(headers, body, 'All_Shipments_Report');
        } else if (currentUser.role === UserRole.CLIENT) {
            const headers = ['ID', 'Recipient', 'Date', 'Status', 'Price (EGP)'];
            const body = shipmentsToExport.map(s => [
                s.id,
                s.recipientName,
                new Date(s.creationDate).toLocaleDateString(),
                s.status,
                s.price.toFixed(2)
            ]);
            exportToCsv(headers, body, `Client_Shipments_${currentUser.name.replace(/\s/g, '_')}`);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold text-slate-800">
                   {currentUser.role === UserRole.CLIENT ? 'My Shipments' : 'All Shipments'}
               </h2>
            </div>
            
            {(currentUser.role === UserRole.CLIENT || currentUser.role === UserRole.ADMIN) && (
                 <div className="mb-6 bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    {currentUser.role === UserRole.ADMIN && (
                        <>
                             <div className="flex-grow w-full md:w-auto">
                                <input 
                                    type="text"
                                    placeholder="Search by Shipment ID..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div className="flex-grow w-full md:w-auto">
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
                             <div className="flex-grow w-full md:w-auto">
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
                        </>
                    )}
                    
                    <div className="flex items-center border border-slate-300 rounded-lg p-1 bg-slate-50">
                       {(['all', 'day', 'week', 'month'] as const).map(filter => (
                            <button 
                               key={filter} 
                               onClick={() => setShipmentFilter(filter)}
                               className={`capitalize px-3 py-1 rounded-md text-sm font-semibold transition ${shipmentFilter === filter ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                           >
                               {filter === 'all' ? 'All Time' : `This ${filter}`}
                            </button>
                       ))}
                    </div>
                    <div className="md:ml-auto">
                         <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                           <DocumentDownloadIcon className="w-5 h-5"/>
                           Export as CSV
                       </button>
                    </div>
                </div>
            )}

           <ShipmentList shipments={visibleShipments} onSelect={onSelectShipment} />
        </>
    );
};

export default ShipmentsView;