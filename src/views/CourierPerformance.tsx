// src/views/CourierPerformance.tsx



import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, CourierStats, CommissionType, CourierTransaction, CourierTransactionStatus, CourierTransactionType, ShipmentStatus, Shipment } from '../types';
import { Modal } from '../components/common/Modal';
import { ShipmentList } from '../components/specific/ShipmentList';
import { DocumentDownloadIcon, UploadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

interface CourierPerformanceProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const CourierPerformance: React.FC<CourierPerformanceProps> = ({ onSelectShipment }) => {
    const { users, shipments, courierStats, courierTransactions, updateCourierSettings, applyManualPenalty, processCourierPayout } = useAppContext();
    const [selectedCourier, setSelectedCourier] = useState<CourierStats | null>(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // New state for shipment list modal
    const [modalShipments, setModalShipments] = useState<Shipment[] | null>(null);
    const [modalTitle, setModalTitle] = useState('');

    const courierData = useMemo(() => {
        const data = users.filter(u => (u.roles || []).includes('Courier')).map(user => {
            const stats = courierStats.find(cs => cs.courierId === user.id);
            const pendingPayouts = courierTransactions.filter(t => t.courierId === user.id && t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING);
            
            const pendingCount = shipments.filter(s => 
                s.courierId === user.id && 
                [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)
            ).length;

            const totalAssigned = shipments.filter(s => s.courierId === user.id).length;
            const totalCompleted = shipments.filter(s => s.courierId === user.id && s.status === ShipmentStatus.DELIVERED).length;
            const totalFailed = shipments.filter(s => s.courierId === user.id && s.status === ShipmentStatus.DELIVERY_FAILED).length;

            return {
                user,
                stats,
                pendingPayouts,
                pendingCount,
                totalAssigned,
                totalCompleted,
                totalFailed,
            };
        });
        
        if (!searchTerm.trim()) {
            return data;
        }
        
        return data.filter(({ user }) => user.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));

    }, [users, courierStats, courierTransactions, shipments, searchTerm]);
    
    const handleExport = () => {
        const headers = [
            'Courier Name', 'Email', 'Phone', 'Status',
            'Total Assigned', 'Completed', 'Failed', 'Pending',
            'Total Earnings (EGP)', 'Current Balance (EGP)', 'Commission Type', 'Commission Value'
        ];

        const data = courierData.map(({ user, stats, totalAssigned, totalCompleted, totalFailed, pendingCount }) => [
            user.name,
            user.email,
            user.phone || 'N/A',
            stats?.isRestricted ? 'Restricted' : 'Active',
            totalAssigned,
            totalCompleted,
            totalFailed,
            pendingCount,
            stats?.totalEarnings?.toFixed(2) || '0.00',
            stats?.currentBalance?.toFixed(2) || '0.00',
            stats?.commissionType || 'N/A',
            stats?.commissionValue || 'N/A'
        ]);

        exportToCsv(headers, data, 'Courier_Performance_Report');
    };

    const handleManageClick = (courierId: number) => {
        const stats = courierStats.find(cs => cs.courierId === courierId);
        if (stats) {
            setSelectedCourier(stats);
            setIsManageModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsManageModalOpen(false);
        setSelectedCourier(null);
    };

    const handleCountClick = (courierId: number, courierName: string, type: 'delivered' | 'pending') => {
        let filteredShipments: Shipment[] = [];
        if (type === 'delivered') {
            filteredShipments = shipments.filter(s => s.courierId === courierId && s.status === ShipmentStatus.DELIVERED);
            setModalTitle(`Delivered Shipments for ${courierName}`);
        } else {
            filteredShipments = shipments.filter(s => 
                s.courierId === courierId && 
                [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)
            );
            setModalTitle(`Pending Shipments for ${courierName}`);
        }
        setModalShipments(filteredShipments);
    };
    
    const handleShipmentSelect = (shipment: Shipment) => {
        onSelectShipment(shipment);
        setModalShipments(null); // Close the list modal
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Courier Performance</h1>
                    <p className="text-slate-500 mt-1">Manage courier financials, restrictions, and view performance metrics.</p>
                </div>
                 <button 
                    onClick={handleExport}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export CSV
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <input
                        type="text"
                        placeholder="Filter couriers by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                 {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Courier</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase text-center">Total Assigned</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase text-center">Completed</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase text-center">Failed</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase text-center">Pending</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Earnings (Total / Balance)</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Commission</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {courierData.map(({ user, stats, pendingPayouts, pendingCount, totalAssigned, totalCompleted, totalFailed }) => (
                                <tr key={user.id}>
                                    <td className="p-4 font-semibold">{user.name}</td>
                                    <td className="p-4 font-mono text-center text-slate-600">{totalAssigned}</td>
                                    <td className="p-4 font-mono text-center">
                                         <button 
                                            onClick={() => handleCountClick(user.id, user.name, 'delivered')}
                                            className="font-mono text-green-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                                            disabled={totalCompleted === 0}
                                        >
                                            {totalCompleted}
                                        </button>
                                    </td>
                                    <td className="p-4 font-mono text-center text-red-600">{totalFailed}</td>
                                    <td className="p-4 font-mono text-center">
                                         <button 
                                            onClick={() => handleCountClick(user.id, user.name, 'pending')}
                                            className="font-mono text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                                            disabled={pendingCount === 0}
                                        >
                                            {pendingCount}
                                        </button>
                                    </td>
                                    <td className="p-4 font-mono">
                                        {stats ? `${stats.totalEarnings.toFixed(2)} / ${stats.currentBalance.toFixed(2)}` : 'N/A'}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {stats?.commissionType === 'flat' ? `${stats.commissionValue} EGP` : `${stats?.commissionValue}%`}
                                    </td>
                                    <td className="p-4">
                                        {stats?.isRestricted ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Restricted</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>}
                                        {pendingPayouts.length > 0 && <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Payout Pending</span>}
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleManageClick(user.id)} className="px-3 py-1.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 text-sm">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-4 bg-slate-50">
                    {courierData.map(({ user, stats, pendingPayouts, pendingCount, totalAssigned, totalCompleted, totalFailed }) => (
                         <div key={user.id} className="responsive-card">
                            <div className="responsive-card-header">
                                <span className="font-semibold text-slate-800">{user.name}</span>
                                <div className="flex items-center gap-2">
                                     {stats?.isRestricted ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Restricted</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>}
                                    {pendingPayouts.length > 0 && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Payout</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="text-center">
                                    <div className="font-bold text-lg text-slate-800">{totalAssigned}</div>
                                    <div className="text-xs text-slate-500">Assigned</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-lg text-green-600">{totalCompleted}</div>
                                    <div className="text-xs text-slate-500">Completed</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-lg text-red-600">{totalFailed}</div>
                                    <div className="text-xs text-slate-500">Failed</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-lg text-blue-600">{pendingCount}</div>
                                    <div className="text-xs text-slate-500">Pending</div>
                                </div>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Earnings (Balance)</span>
                                <span className="responsive-card-value font-mono">{stats ? `${stats.currentBalance.toFixed(2)} EGP` : 'N/A'}</span>
                            </div>
                             <div className="responsive-card-item">
                                <span className="responsive-card-label">Commission</span>
                                <span className="responsive-card-value">{stats?.commissionType === 'flat' ? `${stats.commissionValue} EGP` : `${stats?.commissionValue}%`}</span>
                            </div>
                            <button onClick={() => handleManageClick(user.id)} className="mt-3 w-full px-3 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 text-sm">
                                Manage Courier
                            </button>
                         </div>
                    ))}
                </div>
            </div>
            {selectedCourier && isManageModalOpen && (
                <ManageCourierModal
                    isOpen={isManageModalOpen}
                    onClose={closeModal}
                    courierStats={selectedCourier}
                    courierUser={users.find(u => u.id === selectedCourier.courierId)!}
                    payoutRequests={courierTransactions.filter(t => t.courierId === selectedCourier.courierId && t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING)}
                    onUpdateSettings={updateCourierSettings}
                    onApplyPenalty={applyManualPenalty}
                    onProcessPayout={processCourierPayout}
                />
            )}
             <Modal isOpen={!!modalShipments} onClose={() => setModalShipments(null)} title={modalTitle} size="4xl">
                {modalShipments && (
                    <div className="max-h-[70vh] overflow-y-auto">
                        <ShipmentList 
                            shipments={modalShipments} 
                            onSelect={handleShipmentSelect}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface ManageCourierModalProps {
    isOpen: boolean;
    onClose: () => void;
    courierStats: CourierStats;
    courierUser: User;
    payoutRequests: CourierTransaction[];
    onUpdateSettings: (courierId: number, settings: Partial<Pick<CourierStats, 'commissionType'|'commissionValue'>>) => void;
    onApplyPenalty: (courierId: number, amount: number, description: string) => void;
    onProcessPayout: (transactionId: string, transferEvidence?: string) => void;
}

const ManageCourierModal: React.FC<ManageCourierModalProps> = ({ isOpen, onClose, courierStats, courierUser, payoutRequests, onUpdateSettings, onApplyPenalty, onProcessPayout }) => {
    const { shipments, addToast } = useAppContext();
    const [settings, setSettings] = useState({
        commissionType: courierStats.commissionType,
        commissionValue: courierStats.commissionValue,
    });
    const [penaltyAmount, setPenaltyAmount] = useState(0);
    const [penaltyReason, setPenaltyReason] = useState('');
    const [selectedFailedShipment, setSelectedFailedShipment] = useState<string>('');
    const [failedDeliveryPenaltyReason, setFailedDeliveryPenaltyReason] = useState('');
    const [transferEvidence, setTransferEvidence] = useState<Record<string, string>>({});

    const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>, transactionId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTransferEvidence(prev => ({ ...prev, [transactionId]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const failedShipments = shipments.filter(s => s.courierId === courierUser.id && s.status === ShipmentStatus.DELIVERY_FAILED);

    useEffect(() => { setSettings({ commissionType: courierStats.commissionType, commissionValue: courierStats.commissionValue }); }, [courierStats]);
    const handleSettingsSave = () => { onUpdateSettings(courierUser.id, settings); onClose(); };
    const handlePenaltyApply = () => { if (penaltyAmount > 0 && penaltyReason) { onApplyPenalty(courierUser.id, penaltyAmount, penaltyReason); setPenaltyAmount(0); setPenaltyReason(''); onClose(); }};
    const handleProcessClick = (payout: CourierTransaction) => {
        if (payout.paymentMethod === 'Bank Transfer' && !transferEvidence[payout.id]) {
            addToast('Please upload proof of transfer for this payout.', 'error');
            return;
        }
        onProcessPayout(payout.id, transferEvidence[payout.id]);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${courierUser.name}`} size="4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Settings & Penalty */}
                <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-lg space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">Financial Settings</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Commission Type</label>
                            <select value={settings.commissionType} onChange={(e) => setSettings(s => ({ ...s, commissionType: e.target.value as CommissionType }))} className="w-full mt-1 p-2 border border-slate-300 rounded-md">
                                <option value={CommissionType.FLAT}>Flat Rate (EGP)</option>
                                <option value={CommissionType.PERCENTAGE}>Percentage (%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Commission Value</label>
                            <input type="number" value={settings.commissionValue} onChange={(e) => setSettings(s => ({ ...s, commissionValue: Number(e.target.value) }))} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <button onClick={handleSettingsSave} className="w-full bg-primary-600 text-white font-semibold py-2 rounded-lg">Save Settings</button>
                    </div>
                     <div className="space-y-4 p-6 bg-red-50 rounded-lg">
                        <h3 className="font-bold text-lg text-red-800">Apply Manual Penalty</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Penalty Amount (EGP)</label>
                            <input type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(Number(e.target.value))} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Reason</label>
                            <input type="text" placeholder="e.g., Damaged item" value={penaltyReason} onChange={(e) => setPenaltyReason(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <button onClick={handlePenaltyApply} disabled={penaltyAmount <= 0 || !penaltyReason} className="w-full bg-red-600 text-white font-semibold py-2 rounded-lg disabled:bg-red-300">Apply Penalty</button>
                    </div>
                </div>
                {/* Right Side: Payouts */}
                <div className="space-y-6">
                    <div className="space-y-4 p-6 bg-green-50 rounded-lg">
                        <h3 className="font-bold text-lg text-green-800">Process Payouts</h3>
                        {payoutRequests.length > 0 ? (
                            payoutRequests.map(payout => (
                                <div key={payout.id} className="p-4 bg-white border rounded-md space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p>Request for <strong>{-payout.amount} EGP</strong></p>
                                            <p className="text-xs text-slate-500">Method: {payout.paymentMethod || 'N/A'}</p>
                                        </div>
                                         <button onClick={() => handleProcessClick(payout)} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold">Process</button>
                                    </div>
                                    {payout.paymentMethod === 'Bank Transfer' && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Upload Proof of Transfer</label>
                                            {!transferEvidence[payout.id] ? (
                                                <input type="file" onChange={(e) => handleEvidenceUpload(e, payout.id)} accept="image/*,.pdf" className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                            ) : (
                                                <p className="text-xs text-green-700 font-semibold">File ready for upload.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-600 text-sm text-center">No pending payout requests.</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CourierPerformance;