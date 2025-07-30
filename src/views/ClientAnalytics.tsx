import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, User, Shipment, ShipmentStatus } from '../types';
import { ArrowUpCircleIcon, DocumentDownloadIcon, MailIcon, MapIcon, PhoneIcon, UserCircleIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { Modal } from '../components/common/Modal';
import { ShipmentList } from '../components/specific/ShipmentList';

interface ClientAnalyticsProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const ClientAnalytics: React.FC<ClientAnalyticsProps> = ({ onSelectShipment }) => {
    const { users, shipments } = useAppContext();
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedClient, setSelectedClient] = useState<User | null>(null);

    // State for filtering shipments within the modal
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');

    const clientShipmentCounts = useMemo(() => {
        const clients = users.filter(u => u.role === UserRole.CLIENT);
        const counts = clients.map(client => ({
            id: client.id,
            name: client.name,
            shipmentCount: shipments.filter(s => s.clientId === client.id).length,
            flatRateFee: client.flatRateFee || 0
        }));

        return counts.sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.shipmentCount - b.shipmentCount;
            } else {
                return b.shipmentCount - a.shipmentCount;
            }
        });
    }, [users, shipments, sortOrder]);

    const filteredClientShipments = useMemo(() => {
        if (!selectedClient) return [];
        let filtered = shipments.filter(s => s.clientId === selectedClient.id);

        // 1. Date filter
        if (selectedDate) {
            filtered = filtered.filter(s => s.creationDate.startsWith(selectedDate));
        }
        // 2. Search filter
        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(s => s.id.toLowerCase().includes(searchTerm.trim().toLowerCase()));
        }
        // 3. Status filter
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(s => s.status === selectedStatus);
        }

        return filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [selectedClient, shipments, selectedDate, searchTerm, selectedStatus]);
    
    const handleCloseModal = () => {
        setSelectedClient(null);
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedDate('');
    };
    
    const handleSelectShipment = (shipment: Shipment) => {
        onSelectShipment(shipment);
        handleCloseModal();
    };

    const handleSelectClient = (clientData: { id: number; }) => {
        const clientDetails = users.find(u => u.id === clientData.id);
        if (clientDetails) {
            setSelectedClient(clientDetails);
        }
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };

    const handleExport = () => {
        const headers = ['Client Name', 'Number of Shipments', 'Flat Rate Fee (EGP)'];
        const data = clientShipmentCounts.map(client => [
            client.name,
            client.shipmentCount,
            client.flatRateFee.toFixed(2)
        ]);
        exportToCsv(headers, data, 'Client_Shipment_Analytics');
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Client Shipment Analytics</h2>
                        <p className="text-slate-500 mt-1 text-sm">A summary of shipment volumes per client.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleExport}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                            <DocumentDownloadIcon className="w-5 h-5"/>
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <button
                            onClick={toggleSortOrder}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
                            aria-label={`Sort by ${sortOrder === 'asc' ? 'highest first' : 'lowest first'}`}
                        >
                            <ArrowUpCircleIcon className={`w-5 h-5 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            <span className="hidden sm:inline">Sort</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client Name</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Number of Shipments</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Flat Rate Fee (EGP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {clientShipmentCounts.map(client => (
                                <tr key={client.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleSelectClient(client)}>
                                    <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {client.name.charAt(0)}
                                        </div>
                                        {client.name}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-800 text-right font-mono text-lg">{client.shipmentCount}</td>
                                    <td className="px-6 py-4 font-semibold text-orange-600 text-right font-mono text-lg">{client.flatRateFee.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                 {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-4 bg-slate-50">
                    {clientShipmentCounts.map(client => (
                        <div key={client.id} className="responsive-card" onClick={() => handleSelectClient(client)}>
                            <div className="responsive-card-header">
                                <span className="font-semibold text-slate-800">{client.name}</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Shipments</span>
                                <span className="responsive-card-value">{client.shipmentCount}</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Flat Rate Fee</span>
                                <span className="responsive-card-value font-semibold text-orange-600">{client.flatRateFee.toFixed(2)} EGP</span>
                            </div>
                        </div>
                    ))}
                </div>

                {clientShipmentCounts.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <p className="font-semibold">No Client Data</p>
                        <p className="text-sm">No clients have been added to the system yet.</p>
                    </div>
                )}
            </div>

            {selectedClient && (
                <Modal isOpen={!!selectedClient} onClose={handleCloseModal} title={`Client Details: ${selectedClient.name}`} size="4xl">
                    <div className="space-y-6">
                        {/* Client Info Section */}
                        <div className="p-6 bg-slate-50 rounded-xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="flex items-start gap-3">
                                    <UserCircleIcon className="w-6 h-6 text-slate-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">Name</p>
                                        <p className="font-semibold text-slate-800">{selectedClient.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MailIcon className="w-6 h-6 text-slate-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">Email</p>
                                        <p className="font-semibold text-slate-800">{selectedClient.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <PhoneIcon className="w-6 h-6 text-slate-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">Phone</p>
                                        <p className="font-semibold text-slate-800">{selectedClient.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapIcon className="w-6 h-6 text-slate-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">Address</p>
                                        {selectedClient.address ? (
                                            <p className="font-semibold text-slate-800">{`${selectedClient.address.street}, ${selectedClient.address.city}`}</p>
                                        ) : (
                                            <p className="font-semibold text-slate-800">N/A</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipment History Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Shipment History ({filteredClientShipments.length})</h3>
                             <div className="mb-4 bg-slate-100 p-3 rounded-lg flex flex-col sm:flex-row gap-3 items-center">
                                <input
                                    type="text"
                                    placeholder="Search by Shipment ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-auto flex-grow px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                                />
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as 'all' | ShipmentStatus)}
                                    className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white text-sm"
                                >
                                    <option value="all">All Statuses</option>
                                    {Object.values(ShipmentStatus).map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white text-sm"
                                        aria-label="Filter by date"
                                    />
                                    {selectedDate && (
                                        <button 
                                            onClick={() => setSelectedDate('')} 
                                            className="px-3 py-1.5 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200 transition"
                                            aria-label="Clear date filter"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                                <div className="max-h-96 overflow-y-auto">
                                    <ShipmentList 
                                        shipments={filteredClientShipments} 
                                        onSelect={handleSelectShipment}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default ClientAnalytics;
