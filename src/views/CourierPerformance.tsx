
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, CourierStats, CommissionType, CourierTransaction, CourierTransactionStatus, CourierTransactionType } from '../types';
import { Modal } from '../components/common/Modal';

const CourierPerformance = () => {
    const { users, courierStats, courierTransactions, updateCourierSettings, applyManualPenalty, processCourierPayout } = useAppContext();
    const [selectedCourier, setSelectedCourier] = useState<CourierStats | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const courierUsers = users.filter(u => u.role === 'Courier');

    const handleManageClick = (courierId: number) => {
        const stats = courierStats.find(cs => cs.courierId === courierId);
        if (stats) {
            setSelectedCourier(stats);
            setIsModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedCourier(null);
    };

    const courierData = courierUsers.map(user => {
        const stats = courierStats.find(cs => cs.courierId === user.id);
        const pendingPayouts = courierTransactions.filter(t => t.courierId === user.id && t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING);
        const successRate = (stats && (stats.deliveriesCompleted + stats.deliveriesFailed) > 0) ? (stats.deliveriesCompleted / (stats.deliveriesCompleted + stats.deliveriesFailed)) * 100 : 100;

        return {
            user,
            stats,
            pendingPayouts,
            successRate
        };
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Courier Performance</h1>
                <p className="text-slate-500 mt-1">Manage courier financials, restrictions, and view performance metrics.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Courier</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Performance</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Earnings (Total / Balance)</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Commission</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {courierData.map(({ user, stats, pendingPayouts, successRate }) => (
                                <tr key={user.id}>
                                    <td className="p-4 font-semibold">{user.name}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1" title={`Rating: ${stats?.performanceRating}`}>
                                            <span className={`text-lg ${Math.floor(stats?.performanceRating || 0) > 0 ? 'text-yellow-400' : 'text-gray-300'}`}>⭐</span>
                                            <span>{stats?.performanceRating.toFixed(1)}</span>
                                            <span className="text-slate-500 text-xs">({successRate.toFixed(0)}% succ.)</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono">
                                        {stats?.totalEarnings.toFixed(2)} / {stats?.currentBalance.toFixed(2)}
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
            </div>
            {selectedCourier && isModalOpen && (
                <ManageCourierModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    courierStats={selectedCourier}
                    courierUser={users.find(u => u.id === selectedCourier.courierId)!}
                    payoutRequests={courierTransactions.filter(t => t.courierId === selectedCourier.courierId && t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING)}
                    onUpdateSettings={updateCourierSettings}
                    onApplyPenalty={applyManualPenalty}
                    onProcessPayout={processCourierPayout}
                />
            )}
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
    onProcessPayout: (transactionId: string) => void;
}

const ManageCourierModal: React.FC<ManageCourierModalProps> = ({ isOpen, onClose, courierStats, courierUser, payoutRequests, onUpdateSettings, onApplyPenalty, onProcessPayout }) => {
    const [settings, setSettings] = useState({
        commissionType: courierStats.commissionType,
        commissionValue: courierStats.commissionValue,
    });
    const [penaltyAmount, setPenaltyAmount] = useState(0);
    const [penaltyReason, setPenaltyReason] = useState('');

    useEffect(() => {
        setSettings({
            commissionType: courierStats.commissionType,
            commissionValue: courierStats.commissionValue,
        });
    }, [courierStats]);

    const handleSettingsSave = () => {
        onUpdateSettings(courierUser.id, settings);
        onClose();
    };

    const handlePenaltyApply = () => {
        if (penaltyAmount > 0 && penaltyReason) {
            onApplyPenalty(courierUser.id, penaltyAmount, penaltyReason);
            setPenaltyAmount(0);
            setPenaltyReason('');
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${courierUser.name}`} size="4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Settings */}
                <div className="space-y-6 p-6 bg-slate-50 rounded-lg">
                    <h3 className="font-bold text-lg text-slate-800">Financial Settings</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Commission Type</label>
                        <select
                            value={settings.commissionType}
                            onChange={(e) => setSettings(s => ({ ...s, commissionType: e.target.value as CommissionType }))}
                            className="w-full mt-1 p-2 border border-slate-300 rounded-md"
                        >
                            <option value={CommissionType.FLAT}>Flat Rate (EGP)</option>
                            <option value={CommissionType.PERCENTAGE}>Percentage (%)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Commission Value</label>
                        <input
                            type="number"
                            value={settings.commissionValue}
                            onChange={(e) => setSettings(s => ({ ...s, commissionValue: Number(e.target.value) }))}
                            className="w-full mt-1 p-2 border border-slate-300 rounded-md"
                        />
                    </div>
                    <button onClick={handleSettingsSave} className="w-full bg-primary-600 text-white font-semibold py-2 rounded-lg">Save Settings</button>
                </div>

                {/* Right Side: Manual Actions */}
                <div className="space-y-6">
                    <div className="space-y-4 p-6 bg-red-50 rounded-lg">
                        <h3 className="font-bold text-lg text-red-800">Apply Manual Penalty</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Penalty Amount (EGP)</label>
                            <input
                                type="number"
                                value={penaltyAmount}
                                onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                                className="w-full mt-1 p-2 border border-slate-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Reason</label>
                            <input
                                type="text"
                                placeholder="e.g., Damaged item, Stolen item"
                                value={penaltyReason}
                                onChange={(e) => setPenaltyReason(e.target.value)}
                                className="w-full mt-1 p-2 border border-slate-300 rounded-md"
                            />
                        </div>
                        <button onClick={handlePenaltyApply} disabled={penaltyAmount <= 0 || !penaltyReason} className="w-full bg-red-600 text-white font-semibold py-2 rounded-lg disabled:bg-red-300">Apply Penalty</button>
                    </div>
                    
                    <div className="space-y-4 p-6 bg-green-50 rounded-lg">
                        <h3 className="font-bold text-lg text-green-800">Process Payouts</h3>
                        {payoutRequests.length > 0 ? (
                            payoutRequests.map(payout => (
                                <div key={payout.id} className="flex justify-between items-center">
                                    <p>Request for {-payout.amount} EGP</p>
                                    <button onClick={() => { onProcessPayout(payout.id); onClose(); }} className="bg-green-600 text-white px-3 py-1 rounded-md text-sm">Process</button>
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
