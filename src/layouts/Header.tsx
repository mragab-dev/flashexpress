import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { useAppContext } from '../context/AppContext';
import { BellIcon, LogoutIcon, MenuIcon } from '../components/Icons';

interface HeaderProps {
    onLogout: () => void; 
    user: User; 
    onNavigate: (view: string) => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, user, onNavigate, onMenuClick }) => {
    const { notifications, notificationStatus } = useAppContext();
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const problemNotifications = notifications.filter(n => notificationStatus[n.id] === 'failed');
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 p-4 flex justify-between items-center z-20 sticky top-0">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="p-1 -ml-1 text-slate-600 lg:hidden">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="text-lg font-bold text-slate-800">
                    {user.role} Portal
                </div>
            </div>
             <div className="flex items-center gap-2 sm:gap-4">
                {user.role === UserRole.ADMIN && (
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setDropdownOpen(prev => !prev)} className="p-2 rounded-full hover:bg-slate-100 transition relative">
                            <BellIcon className="w-6 h-6 text-slate-600"/>
                            {problemNotifications.length > 0 && (
                                <span className="absolute top-0 right-0 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                         {isDropdownOpen && (
                             <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
                                 <div className="p-3 font-semibold text-slate-800 border-b border-slate-200">
                                     Notifications ({problemNotifications.length} failed)
                                 </div>
                                 <div className="max-h-80 overflow-y-auto">
                                     {problemNotifications.length > 0 ? (
                                         problemNotifications.map(n => (
                                             <div key={n.id} className="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                                                 <p className="text-sm font-medium text-red-800">Failed to send to {n.recipient}</p>
                                                 <p className="text-sm text-slate-600 truncate">{n.message.split('\n\n')[0]}</p>
                                             </div>
                                         ))
                                     ) : (
                                         <p className="text-sm text-slate-500 p-4 text-center">No delivery failures.</p>
                                     )}
                                 </div>
                                  <div className="p-2 bg-slate-50 border-t border-slate-200">
                                     <button onClick={() => { setDropdownOpen(false); onNavigate('notifications'); }} className="w-full text-center text-sm font-semibold text-primary-600 hover:text-primary-800 py-1">
                                         View Full Log
                                     </button>
                                 </div>
                             </div>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="font-semibold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button onClick={onLogout} title="Logout" className="p-2 rounded-full hover:bg-red-50 transition">
                       <LogoutIcon className="w-6 h-6 text-red-500"/>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
