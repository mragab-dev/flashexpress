

import { useAppContext } from '../context/AppContext';
import { ReplyIcon } from '../components/Icons';

const NotificationsLog = () => {
    const { notifications, notificationStatus, resendNotification } = useAppContext();
    
    const statusDisplay: Record<string, { text: string; color: string }> = {
        sending: { text: 'Sending...', color: 'bg-yellow-100 text-yellow-800' },
        sent: { text: 'Sent', color: 'bg-green-100 text-green-800' },
        failed: { text: 'Failed', color: 'bg-red-100 text-red-800' },
    };

    return (
        <div className="bg-white rounded-xl shadow-sm">
             <div className="p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Notifications Log</h2>
                <p className="text-slate-500 mt-1 text-sm">A log of all automated email notifications and their delivery status.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment ID</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {notifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(n => {
                            const currentStatus = notificationStatus[n.id] || (n.sent ? 'sent' : 'failed');
                            return (
                                <tr key={n.id}>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap">{new Date(n.date).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay[currentStatus].color}`}>
                                            {statusDisplay[currentStatus].text}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{n.recipient}</td>
                                    <td className="px-6 py-4 text-sm">{n.message.split('\n\n')[0]}</td>
                                    <td className="px-6 py-4 font-mono text-sm">{n.shipmentId}</td>
                                    <td className="px-6 py-4">
                                        {currentStatus === 'failed' && (
                                            <button onClick={() => resendNotification(n.id)} className="flex items-center gap-2 px-3 py-1 bg-primary-500 text-white text-xs font-semibold rounded-lg hover:bg-primary-600 transition">
                                                <ReplyIcon className="w-4 h-4 transform -scale-x-100"/>
                                                Resend
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {notifications.length === 0 && (
                             <tr><td colSpan={6} className="text-center py-8 text-slate-500">No notifications have been generated yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NotificationsLog;