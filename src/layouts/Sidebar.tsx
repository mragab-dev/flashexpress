import React from 'react';
import { UserRole } from '../types';
import { 
    LogoIcon, DashboardIcon, PackageIcon, UsersIcon, WalletIcon, 
    ChartBarIcon, TruckIcon, ClipboardListIcon, PlusCircleIcon,
    ReplyIcon, UserCircleIcon, BellIcon, TrendingUpIcon, CurrencyDollarIcon
} from '../components/Icons';

interface SidebarProps {
    role: UserRole;
    activeView: string;
    setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeView, setActiveView }) => {
    const navItems = {
        [UserRole.CLIENT]: [
            { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
            { name: 'My Shipments', icon: <PackageIcon />, view: 'shipments' },
            { name: 'Create Shipment', icon: <PlusCircleIcon />, view: 'create' },
            { name: 'Wallet', icon: <WalletIcon />, view: 'wallet' },
            { name: 'Financials', icon: <ChartBarIcon />, view: 'financials' },
            { name: 'My Profile', icon: <UserCircleIcon />, view: 'profile' },
        ],
        [UserRole.COURIER]: [
            { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
            { name: 'My Tasks', icon: <ClipboardListIcon />, view: 'tasks' },
            { name: 'My Earnings', icon: <CurrencyDollarIcon />, view: 'courier-financials' },
        ],
        [UserRole.ASSIGNING_USER]: [
            { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
            { name: 'Assign Shipments', icon: <TruckIcon />, view: 'assign' },
        ],
        [UserRole.SUPER_USER]: [
            { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
            { name: 'All Shipments', icon: <PackageIcon />, view: 'shipments' },
            { name: 'Assign Shipments', icon: <TruckIcon />, view: 'assign' },
            { name: 'Manage Returns', icon: <ReplyIcon/>, view: 'returns'},
            { name: 'User Management', icon: <UsersIcon />, view: 'users' },
            { name: 'Client Analytics', icon: <TrendingUpIcon />, view: 'client-analytics' },
            { name: 'Courier Performance', icon: <CurrencyDollarIcon />, view: 'courier-performance' },
            { name: 'Financials', icon: <ChartBarIcon />, view: 'financials' },
            { name: 'Notifications Log', icon: <BellIcon />, view: 'notifications' },
        ],
        [UserRole.ADMIN]: [
            { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
            { name: 'All Shipments', icon: <PackageIcon />, view: 'shipments' },
            { name: 'Assign Shipments', icon: <TruckIcon />, view: 'assign' },
            { name: 'Manage Returns', icon: <ReplyIcon/>, view: 'returns'},
            { name: 'User Management', icon: <UsersIcon />, view: 'users' },
            { name: 'Client Analytics', icon: <TrendingUpIcon />, view: 'client-analytics' },
            { name: 'Courier Performance', icon: <CurrencyDollarIcon />, view: 'courier-performance' },
            { name: 'Admin Financials', icon: <ChartBarIcon />, view: 'admin-financials' },
            { name: 'Notifications Log', icon: <BellIcon />, view: 'notifications' },
        ],
    };
    
    const currentNav = navItems[role] || [];

    return (
        <aside className="w-64 bg-slate-800 text-slate-300 flex flex-col flex-shrink-0">
            <div className="p-6 flex items-center gap-3 border-b border-slate-700">
                <LogoIcon className="w-9 h-9"/>
                <div>
                    <h1 className="text-lg font-bold text-white">Flash Express</h1>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-1.5">
                {currentNav.map(item => (
                    <button 
                        key={item.name} 
                        onClick={() => setActiveView(item.view)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition ${
                            activeView === item.view 
                            ? 'bg-primary-600 text-white font-semibold' 
                            : 'hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                        {React.cloneElement(item.icon, { className: 'w-6 h-6' })}
                        <span className="text-sm font-medium">{item.name}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;