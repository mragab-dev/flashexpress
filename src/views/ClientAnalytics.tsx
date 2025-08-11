// src/views/ClientAnalytics.tsx


import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, User, Shipment, ShipmentStatus, TransactionType } from '../types';
import { ArrowUpCircleIcon, DocumentDownloadIcon, MailIcon, PhoneIcon, UserCircleIcon, WalletIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { Modal } from '../components/common/Modal';
import { ShipmentList } from '../components/specific/ShipmentList';

interface ClientAnalyticsProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const ClientAnalytics: React.FC<ClientAnalyticsProps> = ({ onSelectShipment }) => {
    const { users, shipments, clientTransactions, hasPermission, processClientPayout, addToast } = useAppContext();
    const [mainTab, setMainTab] = useState<'summary' | 'payouts'>('summary');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedClient, setSelectedClient] = useState<User | null>(null);

    // State for filtering
    const [summaryFilter, setSummaryFilter] = useState('');
    const [payoutsFilter, setPayoutsFilter] = useState('');

    // State for filtering shipments within the modal
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');

    const clientData = useMemo(() => {
        const clients = users.filter(u => (u.roles || []).includes(UserRole.CLIENT));
        let data = clients.map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id);
            const payoutRequests = clientTransactions.filter(t => t.userId === client.id && t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === 'Pending');
            return {
                id: client.id,
                name: client.name,
                shipmentCount: clientShipments.length,
                flatRateFee: client.flatRateFee || 0,
                payoutRequestCount: payoutRequests.length,
            };
        });

        if (summaryFilter.trim()) {
            data = data.filter(client => client.name.toLowerCase().includes(summaryFilter.toLowerCase().trim()));
        }

        return data.sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.shipmentCount - b.shipmentCount;
            } else {
                return b.shipmentCount - a.shipmentCount;
            }
        });
    }, [users, shipments, clientTransactions, sortOrder, summaryFilter]);

    const payoutRequests = useMemo(() => {
        return clientTransactions
            .filter(t => t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === 'Pending')
            .map(transaction => {
                const client = users.find(u => u.id === transaction.userId);
                return { ...transaction, clientName: client?.name || 'Unknown Client', clientEmail: client?.email || 'N/A' };
            })
            .filter(payout => {
                if (!payoutsFilter.trim()) return true;
                return payout.clientName.toLowerCase().includes(payoutsFilter.toLowerCase().trim());
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [clientTransactions, users, payoutsFilter]);
    
    const modalShipments = useMemo(() => {
        if (!selectedClient) return [];
        let filtered = shipments.filter(s => s.clientId === selectedClient.id);

        if (selectedDate) {
            filtered = filtered.filter(s => s.creationDate.startsWith(selectedDate));
        }
        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(s => s.id.toLowerCase().includes(lowerCaseSearch) || s.recipientName.toLowerCase().includes(lowerCaseSearch));
        }
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(s => s.status === selectedStatus);
        }
        return filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [shipments, selectedClient, selectedDate, searchTerm, selectedStatus]);
    
    const handleViewShipments = (clientId: number) => {
        const client = users.find(u => u.id === clientId);
        if (client) {
            setSelectedClient(client);
        }
    };

    const handleProcessPayout = (id: string) => {
        processClientPayout(id);
        addToast("Payout processed successfully", "success");
    }

    const handleExportSummary = () => {
        const headers = ['Client Name', 'Total Shipments', 'Flat Rate (EGP)', 'Pending Payouts'];
        const data = clientData.map(c => [
            c.name,
            c.shipmentCount,
            c.flatRateFee.toFixed(2),
            c.payoutRequestCount,
        ]);
        exportToCsv(headers, data, 'Client_Analytics_Summary');
    };

    const handleExportPayouts = () => {
        const headers = ['Date', 'Client Name', 'Client Email', 'Amount (EGP)', 'Description'];
        const data = payoutRequests.map(p => [
            new Date(p.date).toLocaleString(),
            p.clientName,
            p.clientEmail,
            Math.abs(p.amount).toFixed(2),
            p.description,
        ]);
        exportToCsv(headers, data, 'Pending_Client_Payouts');
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Client Analytics</h1>
                    <p className="text-slate-500 mt-1">Overview of client shipment volumes and pending payouts.</p>
                </div>
                 <button 
                    onClick={mainTab === 'summary' ? handleExportSummary : handleExportPayouts}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                 >
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export CSV
                </button>
            </div>
            
             <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setMainTab('summary')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${mainTab === 'summary' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Client Summary
                    </button>
                    <button onClick={() => setMainTab('payouts')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${mainTab === 'payouts' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Pending Payouts
                        {payoutRequests.length > 0 && <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">{payoutRequests.length}</span>}
                    </button>
                </nav>
            </div>
            
            {mainTab === 'summary' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <input
                            type="text"
                            placeholder="Filter clients by name..."
                            value={summaryFilter}
                            onChange={e => setSummaryFilter(e.target.value)}
                            className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Client</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase flex items-center gap-1 cursor-pointer" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                                        Total Shipments
                                        <ArrowUpCircleIcon className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                                    </th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Flat Rate</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Pending Payouts</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-slate-200">
                                {clientData.map(client => (
                                    <tr key={client.id}>
                                        <td className="p-4 font-semibold">{client.name}</td>
                                        <td className="p-4 text-slate-600 font-mono">{client.shipmentCount}</td>
                                        <td className="p-4 text-orange-600 font-semibold">{client.flatRateFee.toFixed(2)} EGP</td>
                                        <td className="p-4 text-blue-600 font-semibold">{client.payoutRequestCount}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleViewShipments(client.id)} className="px-3 py-1.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 text-sm">View Shipments</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {mainTab === 'payouts' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <input
                            type="text"
                            placeholder="Filter by client name..."
                            value={payoutsFilter}
                            onChange={e => setPayoutsFilter(e.target.value)}
                            className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Date</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Client</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-slate-200">
                                {payoutRequests.map(payout => (
                                    <tr key={payout.id}>
                                        <td className="p-4 text-sm text-slate-600">{new Date(payout.date).toLocaleString()}</td>
                                        <td className="p-4">
                                            <p className="font-semibold">{payout.clientName}</p>
                                            <p className="text-xs text-slate-500">{payout.clientEmail}</p>
                                        </td>
                                        <td className="p-4 font-bold text-red-600">-{Math.abs(payout.amount).toFixed(2)} EGP</td>
                                        <td className="p-4">
                                            <button onClick={() => handleProcessPayout(payout.id)} className="px-3 py-1.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm">Process Payout</button>
                                        </td>
                                    </tr>
                                ))}
                                {payoutRequests.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-12 text-slate-500">No pending payouts.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <Modal isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} title={`Shipments for ${selectedClient?.name}`} size="4xl">
                <div className="space-y-4">
                     <div className="mb-4 bg-slate-50 p-3 rounded-lg flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                        <input type="text" placeholder="Search ID or Recipient..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg" />
                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg bg-white">
                            <option value="all">All Statuses</option>
                            {Object.values(ShipmentStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <ShipmentList shipments={modalShipments} onSelect={(shipment) => { onSelectShipment(shipment); setSelectedClient(null); }} />
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default ClientAnalytics;
