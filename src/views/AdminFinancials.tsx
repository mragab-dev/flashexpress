import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { CheckCircleIcon, WalletIcon, PackageIcon, DocumentDownloadIcon, PencilIcon, TruckIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const AdminFinancials = () => {
    const { 
        currentUser, 
        getAdminFinancials, 
        getClientFinancials, 
        canAccessAdminFinancials,
        updateClientFlatRate
    } = useAppContext();

    const [showClientRateModal, setShowClientRateModal] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [tempFlatRate, setTempFlatRate] = useState<number>(0);

    // Access control
    if (!currentUser || !canAccessAdminFinancials(currentUser)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">Only administrators can access financial data.</p>
                </div>
            </div>
        );
    }

    const adminFinancials = getAdminFinancials();
    const clientFinancials = getClientFinancials();

    const openClientRateModal = (clientId: number, currentRate: number) => {
        setSelectedClientId(clientId);
        setTempFlatRate(currentRate);
        setShowClientRateModal(true);
    };

    const handleClientRateUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedClientId !== null && tempFlatRate >= 0) {
            updateClientFlatRate(selectedClientId, tempFlatRate);
            setShowClientRateModal(false);
        }
    };

    const handleExportFinancials = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Gross Revenue (Shipment Prices)', `${adminFinancials.grossRevenue.toFixed(2)} EGP`],
            ['Total Client Fees (Company Income)', `${adminFinancials.totalClientFees.toFixed(2)} EGP`],
            ['Total Courier Payouts (Company Cost)', `${adminFinancials.totalCourierPayouts.toFixed(2)} EGP`],
            ['Net Revenue (Income - Cost)', `${adminFinancials.netRevenue.toFixed(2)} EGP`],
            ['Total Orders', adminFinancials.totalOrders.toString()]
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
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Admin Financial Dashboard</h1>
                    <p className="text-slate-500 mt-1">Complete financial overview for administrators only.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportFinancials} 
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        Export Report
                    </button>
                </div>
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title="Total Client Fees" 
                    value={`${adminFinancials.totalClientFees.toFixed(2)} EGP`} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#16a34a" 
                />
                 <StatCard 
                    title="Total Courier Payouts" 
                    value={`${adminFinancials.totalCourierPayouts.toFixed(2)} EGP`} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#f97316" 
                />
                <StatCard 
                    title="Net Revenue" 
                    value={`${adminFinancials.netRevenue.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#3b82f6" 
                />
                 <StatCard 
                    title="Delivered Orders" 
                    value={adminFinancials.totalOrders} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#8b5cf6" 
                />
            </div>

            {/* Client Financial Summary */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Client Financial Summary</h2>
                        <p className="text-slate-500 mt-1 text-sm">Revenue breakdown by client with adjustable flat rates.</p>
                    </div>
                    <button 
                        onClick={handleExportClientSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
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
                                    <td className="px-6 py-4 text-slate-600">{client.totalOrders}</td>
                                    <td className="px-6 py-4 text-slate-600">{client.orderSum.toFixed(2)} EGP</td>
                                    <td className="px-6 py-4 font-semibold text-orange-600">{client.flatRateFee.toFixed(2)} EGP</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => openClientRateModal(client.clientId, client.flatRateFee)}
                                            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"
                                            title="Edit Flat Rate"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clientFinancials.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500">
                                        No client financial data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Client Flat Rate Modal */}
            <Modal 
                isOpen={showClientRateModal} 
                onClose={() => setShowClientRateModal(false)} 
                title="Update Client Flat Rate"
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
        </div>
    );
};

export default AdminFinancials;