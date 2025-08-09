

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CourierStats, CourierTransaction, CourierTransactionStatus, CourierTransactionType } from '../types';
import { Modal } from '../components/common/Modal';

// --- Reusable Components (could be moved to /components/specific) ---

const CourierEarningsSummary: React.FC<{ courierStats: CourierStats }> = ({ courierStats }) => {
    const successRate = (courierStats.deliveriesCompleted + courierStats.deliveriesFailed) > 0 ?
        (courierStats.deliveriesCompleted / (courierStats.deliveriesCompleted + courierStats.deliveriesFailed)) * 100 : 100;

    const avgEarningsPerDelivery = courierStats.deliveriesCompleted > 0 ?
        courierStats.totalEarnings / courierStats.deliveriesCompleted : 0;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                    <div className="text-sm text-slate-500">Total Earnings</div>
                    <div className="text-2xl font-bold text-green-600">{courierStats.totalEarnings.toFixed(2)} EGP</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500">Current Balance</div>
                    <div className="text-2xl font-bold text-slate-800">{courierStats.currentBalance.toFixed(2)} EGP</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500">Pending Earnings</div>
                    <div className="text-2xl font-bold text-blue-600">{courierStats.pendingEarnings.toFixed(2)} EGP</div>
                </div>
                 <div>
                    <div className="text-sm text-slate-500">Avg. Per Delivery</div>
                    <div className="text-2xl font-bold text-purple-600">{avgEarningsPerDelivery.toFixed(2)} EGP</div>
                </div>
            </div>
             <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Performance:</span>
                    <div className="flex items-center" title={`Rating: ${courierStats.performanceRating}`}>
                        {[...Array(5)].map((_, i) => (<span key={i} className={`text-xl ${i < Math.floor(courierStats.performanceRating) ? 'text-yellow-400' : 'text-gray-300'}`}>⭐</span>))}
                        <span className="ml-1 text-sm font-medium">({courierStats.performanceRating}/5.0)</span>
                    </div>
                </div>
                 <div className="text-sm text-gray-600">
                    Success Rate: <span className="font-bold">{successRate.toFixed(1)}%</span>
                </div>
                {courierStats.isRestricted && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">🚫 Restricted</span>
                )}
            </div>
        </div>
    );
};

const TransactionHistory: React.FC<{ transactions: CourierTransaction[] }> = ({ transactions }) => {
    const statusStyles: Record<CourierTransactionStatus, string> = {
        [CourierTransactionStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
        [CourierTransactionStatus.PROCESSED]: 'bg-green-100 text-green-800',
        [CourierTransactionStatus.FAILED]: 'bg-red-100 text-red-800',
    };
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200"><h2 className="text-xl font-bold text-slate-800">Transaction History</h2></div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase text-right">Amount (EGP)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {transactions.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{new Date(t.timestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm text-slate-800">{t.description}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 font-semibold text-xs rounded-full ${t.amount >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{t.type}</span>
                                    {t.type === CourierTransactionType.WITHDRAWAL_REQUEST && <span className={`ml-2 px-2 py-1 font-semibold text-xs rounded-full ${statusStyles[t.status]}`}>{t.status}</span>}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-8 text-slate-500">No transactions recorded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main View ---

const CourierFinancials = () => {
    const { currentUser, courierStats, courierTransactions, requestCourierPayout } = useAppContext();
    const [isPayoutModalOpen, setPayoutModalOpen] = useState(false);
    
    if (!currentUser) return null;

    const myStats = courierStats.find(cs => cs.courierId === currentUser.id);
    const myTransactions = courierTransactions.filter(ct => ct.courierId === currentUser.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleRequestPayout = () => {
        if (!myStats || myStats.currentBalance <= 0) return;
        requestCourierPayout(currentUser.id, myStats.currentBalance);
        setPayoutModalOpen(false);
    };

    if (!myStats) {
        return <div className="text-center p-8 bg-white rounded-lg">Could not load your financial data.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">My Earnings</h1>
                    <p className="text-slate-500 mt-1">Your performance and financial summary.</p>
                </div>
                <button 
                    onClick={() => setPayoutModalOpen(true)}
                    disabled={myStats.currentBalance <= 0}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    Request Payout ({myStats.currentBalance.toFixed(2)} EGP)
                </button>
            </div>
            
            <CourierEarningsSummary courierStats={myStats} />
            <TransactionHistory transactions={myTransactions} />

            <Modal isOpen={isPayoutModalOpen} onClose={() => setPayoutModalOpen(false)} title="Confirm Payout Request">
                <div>
                    <p className="text-lg">You are about to request a payout for your entire current balance of <strong className="text-green-600">{myStats.currentBalance.toFixed(2)} EGP</strong>.</p>
                    <p className="text-sm text-slate-600 mt-2">Once confirmed, an administrator will process your request. The funds will then be deducted from your balance and transferred to you.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setPayoutModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button onClick={handleRequestPayout} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">Confirm Request</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CourierFinancials;
