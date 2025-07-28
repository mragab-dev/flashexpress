

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TransactionType } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { WalletIcon, ArrowUpCircleIcon } from '../components/Icons';

const Wallet = () => {
    const { currentUser, clientTransactions, topUpWallet } = useAppContext();
    const [isTopUpModalOpen, setTopUpModalOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState(100);

    if (!currentUser) return null;

    const myTransactions = clientTransactions.filter(t => t.userId === currentUser.id);

    const handleTopUp = () => {
        topUpWallet(currentUser.id, topUpAmount);
        setTopUpModalOpen(false);
    }

    return (
        <div className="space-y-8">
             <div>
                 <h1 className="text-3xl font-bold text-slate-800">My Wallet</h1>
                 <p className="text-slate-500 mt-1">Manage your balance and view your transaction history.</p>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <StatCard 
                        title="Current Balance" 
                        value={`${(currentUser.walletBalance ?? 0).toFixed(2)} EGP`} 
                        icon={<WalletIcon className="w-7 h-7"/>} 
                        color="#22c55e" 
                    />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-center md:col-span-2">
                     <button 
                        onClick={() => setTopUpModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                        <ArrowUpCircleIcon className="w-6 h-6"/>
                        <span className="text-lg">Top Up Wallet</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                           {myTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                               <tr key={t.id}>
                                   <td className="px-6 py-4 text-slate-600">{new Date(t.date).toLocaleString()}</td>
                                   <td className="px-6 py-4 text-slate-800">{t.description}</td>
                                   <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            t.type === TransactionType.DEPOSIT ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {t.type}
                                        </span>
                                   </td>
                                   <td className={`px-6 py-4 font-semibold text-right ${
                                       t.type === TransactionType.DEPOSIT ? 'text-green-600' : 'text-red-600'
                                   }`}>
                                       {t.amount.toFixed(2)} EGP
                                   </td>
                               </tr>
                           ))}
                           {myTransactions.length === 0 && (
                               <tr><td colSpan={4} className="text-center py-8 text-slate-500">No transactions yet.</td></tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={isTopUpModalOpen} onClose={() => setTopUpModalOpen(false)} title="Top Up Your Wallet">
                <div className="space-y-6">
                    <p>Select an amount to add to your wallet balance. In a real application, this would redirect to a payment gateway.</p>
                    <div className="flex justify-center gap-4">
                       {[100, 250, 500, 1000].map(amount => (
                           <button 
                                key={amount} 
                                onClick={() => setTopUpAmount(amount)}
                                className={`px-8 py-4 text-xl font-bold rounded-lg border-2 transition ${topUpAmount === amount ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-700 border-slate-300 hover:border-primary-500'}`}
                            >
                               {amount} EGP
                           </button>
                       ))}
                    </div>
                     <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setTopUpModalOpen(false)} className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold">Cancel</button>
                        <button onClick={handleTopUp} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Add Funds</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Wallet;