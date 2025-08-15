// src/views/AdminFinancials.tsx



import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Permission, Shipment, ShipmentStatus, PaymentMethod, ClientFinancialSummary, User } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { CheckCircleIcon, WalletIcon, PackageIcon, DocumentDownloadIcon, PencilIcon, TruckIcon, XCircleIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { ShipmentList } from '../components/specific/ShipmentList';

interface AdminFinancialsProps {
    setActiveView: (view: string) => void;
}

const AdminFinancials: React.FC<AdminFinancialsProps> = ({ setActiveView }) => {
    const { 
        currentUser, 
        getAdminFinancials, 
        getClientFinancials, 
        hasPermission,
        updateClientFlatRate,
        setShipmentFilter,
        shipments,
    } = useAppContext();

    const [showClientRateModal, setShowClientRateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientFinancialSummary | null>(null);
    const [isShipmentsModalOpen, setIsShipmentsModalOpen] = useState(false);
    const [tempFlatRate, setTempFlatRate] = useState<number>(0);
    
    const clientShipments = useMemo(() => {
        if (!selectedClient) return [];
        return shipments.filter(s => s.clientId === selectedClient.clientId);
    }, [shipments, selectedClient]);


    // Access control
    if (!currentUser || !hasPermission(Permission.VIEW_ADMIN_FINANCIALS)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">Only users with appropriate permissions can access financial data.</p>
                </div>
            </div>
        );
    }

    const adminFinancials = getAdminFinancials();
    const clientFinancials = getClientFinancials();

    const openClientRateModal = (client: ClientFinancialSummary) => {
        setSelectedClient(client);
        setTempFlatRate(client.flatRateFee);
        setShowClientRateModal(true);
    };
    
    const handleViewClientShipments = (client: ClientFinancialSummary) => {
        setSelectedClient(client);
        setIsShipmentsModalOpen(true);
    };


    const handleClientRateUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedClient && tempFlatRate >= 0) {
            updateClientFlatRate(selectedClient.clientId, tempFlatRate);
            setShowClientRateModal(false);
        }
    };
    
    const navigateWithFilter = (filter: (shipment: Shipment) => boolean) => {
        setShipmentFilter(() => filter);
        setActiveView('total-shipments');
    };

    const handleExportFinancials = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Cash to Collect (In Transit COD)', `${adminFinancials.cashToCollect.toFixed(2)} EGP`],
            ['Total COD Collected (Delivered)', `${adminFinancials.totalCODCollected.toFixed(2)} EGP`],
            ['Undelivered Packages Value', `${adminFinancials.undeliveredPackagesValue.toFixed(2)} EGP`],
            ['Potential Fees from Pending Orders', `${adminFinancials.totalFees.toFixed(2)} EGP`],
            ['Total Revenue (Shipping Fees)', `${adminFinancials.totalRevenue.toFixed(2)} EGP`],
            ['Total Commission (Paid to Couriers)', `${adminFinancials.totalCommission.toFixed(2)} EGP`],
            ['Net Profit (Revenue - Commission)', `${adminFinancials.netRevenue.toFixed(2)} EGP`],
            ['Total Delivered Orders', adminFinancials.totalOrders.toString()]
        ];
        exportToCsv(headers, data, 'Admin_Financial_Report');
    };

    const handleExportClientSummary = () => {
        const headers = ['Client Name', 'Total Orders', 'Order Sum (EGP)', 'Flat Rate Fee (EGP)'];
        const data = clientFinancials.map(client => [
            client.clientName,
            client.totalOrders.toString(),
            client.orderSum.toFixed(2),
            client.flatRateFee.toFixed(2)
        ]);
        exportToCsv(headers, data, 'Client_Financial_Summary');
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Admin Financial Dashboard</h1>
                    <p className="text-slate-500 mt-1">Enhanced financial overview with detailed tracking metrics.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleExportFinancials} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export Report</span>
                    </button>
                </div>
            </div>

            {/* Enhanced Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatCard 
                    title="Cash to Collect" 
                    value={`${adminFinancials.cashToCollect.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#f59e0b"
                    subtitle="COD for packages in transit"
                    onClick={() => navigateWithFilter(s => s.paymentMethod === PaymentMethod.COD && [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status))}
                />
                <StatCard 
                    title="Total COD Collected" 
                    value={`${adminFinancials.totalCODCollected.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle="From delivered packages"
                    onClick={() => navigateWithFilter(s => s.paymentMethod === PaymentMethod.COD && s.status === ShipmentStatus.DELIVERED)}
                />
                <StatCard 
                    title="Undelivered Packages" 
                    value={`${adminFinancials.undeliveredPackagesValue.toFixed(2)} EGP`} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#f59e0b"
                    subtitle="Value of pending deliveries"
                    onClick={() => navigateWithFilter(s => ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status))}
                />
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={`${adminFinancials.totalRevenue.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle="Shipping fees earned"
                    onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.DELIVERY_FAILED)}
                />
                <StatCard 
                    title="Total Commission" 
                    value={`${adminFinancials.totalCommission.toFixed(2)} EGP`} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#f97316"
                    subtitle="Paid to couriers"
                    onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED)}
                />
                <StatCard 
                    title="Net Profit" 
                    value={`${adminFinancials.netRevenue.toFixed(2)} EGP`} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#3b82f6"
                    subtitle="Revenue - Commission"
                    onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.DELIVERY_FAILED)}
                />
            </div>

            {/* Client Financial Summary */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Client Financial Summary</h2>
                        <p className="text-slate-500 mt-1 text-sm">Revenue breakdown by client with adjustable flat rates.</p>
                    </div>
                    <button 
                        onClick={handleExportClientSummary}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total Orders</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Order Sum</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Flat Rate Fee</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {clientFinancials.map(client => (
                                <tr key={client.clientId}>
                                    <td className="px-6 py-4 font-semibold text-slate-800">{client.clientName}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <button onClick={() => handleViewClientShipments(client)} className="text-primary-600 hover:underline">
                                            {client.totalOrders}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{client.orderSum.toFixed(2)} EGP</td>
                                    <td className="px-6 py-4 font-semibold text-orange-600">{client.flatRateFee.toFixed(2)} EGP</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => openClientRateModal(client)}
                                            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"
                                            title="Edit Flat Rate"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                 {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-4 bg-slate-50">
                    {clientFinancials.map(client => (
                        <div key={client.clientId} className="responsive-card">
                            <div className="responsive-card-header">
                                <span className="font-semibold text-slate-800">{client.clientName}</span>
                                <button 
                                    onClick={() => openClientRateModal(client)}
                                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md -mr-2 -mt-2"
                                    title="Edit Flat Rate"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            </div>
                             <div className="responsive-card-item">
                                <span className="responsive-card-label">Flat Rate</span>
                                <span className="responsive-card-value font-semibold text-orange-600">{client.flatRateFee.toFixed(2)} EGP</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Total Orders</span>
                                 <button onClick={() => handleViewClientShipments(client)} className="responsive-card-value text-primary-600 hover:underline">
                                    {client.totalOrders}
                                </button>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Order Sum</span>
                                <span className="responsive-card-value">{client.orderSum.toFixed(2)} EGP</span>
                            </div>
                        </div>
                    ))}
                </div>

                {clientFinancials.length === 0 && (
                     <div className="text-center py-16 text-slate-500">
                        <p className="font-semibold">No Client Data</p>
                        <p className="text-sm">No client financial information is available yet.</p>
                    </div>
                )}
            </div>

            {/* Client Flat Rate Modal */}
            <Modal 
                isOpen={showClientRateModal} 
                onClose={() => setShowClientRateModal(false)} 
                title={`Update Flat Rate for ${selectedClient?.clientName}`}
            >
                <form onSubmit={handleClientRateUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Flat Rate Fee (EGP)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tempFlatRate}
                            onChange={(e) => setTempFlatRate(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            required
                        />
                        <p className="text-sm text-slate-500 mt-1">
                            This fee is charged per package but not visible to the client.
                        </p>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setShowClientRateModal(false)} 
                            className="px-4 py-2 bg-slate-200 rounded-lg font-semibold"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold"
                        >
                            Update Rate
                        </button>
                    </div>
                </form>
            </Modal>
            
             <Modal isOpen={isShipmentsModalOpen} onClose={() => setIsShipmentsModalOpen(false)} title={`Shipments for ${selectedClient?.clientName}`} size="4xl">
                <div className="max-h-[70vh] overflow-y-auto">
                    <ShipmentList shipments={clientShipments} />
                </div>
            </Modal>
        </div>
    );
};

export default AdminFinancials;