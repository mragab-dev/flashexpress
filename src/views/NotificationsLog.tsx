import { useAppContext } from '../context/AppContext';
import { ReplyIcon } from '../components/Icons';

const NotificationsLog = () => {
    const { notifications, notificationStatus, resendNotification } = useAppContext();
    
    const statusDisplay: Record<string, { text: string; color: string }> = {
        sending: { text: 'Sending...', color: 'bg-yellow-100 text-yellow-800' },
        sent: { text: 'Sent', color: 'bg-green-100 text-green-800' },
        failed: { text: 'Failed', color: 'bg-red-100 text-red-800' },
    };

    const sortedNotifications = notifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-white rounded-xl shadow-sm">
             <div className="p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Notifications Log</h2>
                <p className="text-slate-500 mt-1 text-sm">A log of all automated email notifications and their delivery status.</p>
            </div>
            
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden lg:block">
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
                        {sortedNotifications.map(n => {
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
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-4 bg-slate-50">
                {sortedNotifications.map(n => {
                     const currentStatus = notificationStatus[n.id] || (n.sent ? 'sent' : 'failed');
                    return (
                        <div key={n.id} className="responsive-card">
                            <div className="responsive-card-header">
                                <span className="font-mono text-sm text-slate-700">{n.shipmentId}</span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay[currentStatus].color}`}>
                                    {statusDisplay[currentStatus].text}
                                </span>
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold">{n.message.split('\n\n')[0]}</p>
                                <p className="text-slate-600">To: {n.recipient}</p>
                                <p className="text-xs text-slate-500 mt-1">{new Date(n.date).toLocaleString()}</p>
                            </div>
                            {currentStatus === 'failed' && (
                                <button onClick={() => resendNotification(n.id)} className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition">
                                    <ReplyIcon className="w-4 h-4 transform -scale-x-100"/>
                                    Resend Notification
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {notifications.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                    <p className="font-semibold">No Notifications Found</p>
                    <p className="text-sm">No notifications have been generated yet.</p>
                </div>
            )}
        </div>
    );
};

export default NotificationsLog;
