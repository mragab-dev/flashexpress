

import { useAppContext } from '../context/AppContext';
import { TransactionType } from '../types';
import { StatCard } from '../components/common/StatCard';
import { WalletIcon } from '../components/Icons';

const Wallet = () => {
    const { currentUser, clientTransactions } = useAppContext();

    if (!currentUser) return null;

    const myTransactions = clientTransactions.filter(t => t.userId === currentUser.id);

    return (
        <div className="space-y-8">
             <div>
                 <h1 className="text-3xl font-bold text-slate-800">My Wallet</h1>
                 <p className="text-slate-500 mt-1">Your wallet is credited with the value of your delivered packages. You can use this balance to pay for future shipping fees.</p>
            </div>
             <div className="max-w-md">
                <StatCard 
                    title="Current Balance" 
                    value={`${(currentUser.walletBalance ?? 0).toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#22c55e" 
                />
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
        </div>
    );
};

export default Wallet;