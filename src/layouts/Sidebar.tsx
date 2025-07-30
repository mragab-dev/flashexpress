

import React from 'react';
import { Permission } from '../types';
import { useAppContext } from '../context/AppContext';
import { 
    LogoIcon, DashboardIcon, PackageIcon, UsersIcon, WalletIcon, 
    ChartBarIcon, TruckIcon, ClipboardListIcon, PlusCircleIcon,
    ReplyIcon, UserCircleIcon, BellIcon, TrendingUpIcon, CurrencyDollarIcon, XIcon, CogIcon
} from '../components/Icons';

interface NavItemConfig {
    name: string;
    icon: JSX.Element;
    view: string;
    permission: Permission;
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
    // Common
    { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard', permission: Permission.VIEW_DASHBOARD },
    
    // Client
    { name: 'My Shipments', icon: <PackageIcon />, view: 'shipments', permission: Permission.VIEW_OWN_SHIPMENTS },
    { name: 'Create Shipment', icon: <PlusCircleIcon />, view: 'create', permission: Permission.CREATE_SHIPMENTS },
    { name: 'My Wallet', icon: <WalletIcon />, view: 'wallet', permission: Permission.VIEW_OWN_WALLET },
    { name: 'My Financials', icon: <ChartBarIcon />, view: 'financials', permission: Permission.VIEW_OWN_FINANCIALS },
    { name: 'My Profile', icon: <UserCircleIcon />, view: 'profile', permission: Permission.VIEW_PROFILE },
    
    // Courier
    { name: 'My Tasks', icon: <ClipboardListIcon />, view: 'tasks', permission: Permission.VIEW_COURIER_TASKS },
    { name: 'My Earnings', icon: <CurrencyDollarIcon />, view: 'courier-financials', permission: Permission.VIEW_COURIER_EARNINGS },

    // Admin & Super User
    { name: 'All Shipments', icon: <PackageIcon />, view: 'shipments', permission: Permission.VIEW_ALL_SHIPMENTS },
    { name: 'Assign Shipments', icon: <TruckIcon />, view: 'assign', permission: Permission.ASSIGN_SHIPMENTS },
    { name: 'Manage Returns', icon: <ReplyIcon/>, view: 'returns', permission: Permission.MANAGE_RETURNS},
    { name: 'User Management', icon: <UsersIcon />, view: 'users', permission: Permission.MANAGE_USERS },
    { name: 'Role Management', icon: <CogIcon />, view: 'roles', permission: Permission.MANAGE_ROLES },
    { name: 'Client Analytics', icon: <TrendingUpIcon />, view: 'client-analytics', permission: Permission.VIEW_CLIENT_ANALYTICS },
    { name: 'Courier Performance', icon: <CurrencyDollarIcon />, view: 'courier-performance', permission: Permission.VIEW_COURIER_PERFORMANCE },
    { name: 'Financials', icon: <ChartBarIcon />, view: 'financials', permission: Permission.VIEW_ADMIN_FINANCIALS },
    { name: 'Admin Financials', icon: <ChartBarIcon />, view: 'admin-financials', permission: Permission.VIEW_ADMIN_FINANCIALS },
    { name: 'Total Shipments', icon: <PackageIcon />, view: 'total-shipments', permission: Permission.VIEW_TOTAL_SHIPMENTS_OVERVIEW },
    { name: 'Notifications Log', icon: <BellIcon />, view: 'notifications', permission: Permission.VIEW_NOTIFICATIONS_LOG },
];

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const { hasPermission } = useAppContext();

    const availableNavItems = ALL_NAV_ITEMS.filter(item => {
        // Special case to avoid duplicate "Financials" links for admins
        if (item.view === 'financials' && hasPermission(Permission.VIEW_ADMIN_FINANCIALS)) {
             // If user can see Admin Financials, don't show the basic "Financials" link
            const adminFinancialsLink = ALL_NAV_ITEMS.find(i => i.view === 'admin-financials');
            if (adminFinancialsLink && hasPermission(adminFinancialsLink.permission)) {
                return false;
            }
        }
        // Special case to avoid duplicate "Shipments" links for clients with full access
        if (item.view === 'shipments' && item.permission === Permission.VIEW_OWN_SHIPMENTS && hasPermission(Permission.VIEW_ALL_SHIPMENTS)) {
            return false;
        }

        return hasPermission(item.permission);
    });
    
    const handleItemClick = (view: string) => {
        setActiveView(view);
        setIsOpen(false);
    }

    return (
        <>
            {/* Backdrop for mobile */}
            <div 
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            ></div>
            
            <aside 
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-800 text-slate-300 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0 lg:w-64`}
            >
                <div className="p-4 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <LogoIcon className="w-9 h-9"/>
                        <div>
                            <h1 className="text-lg font-bold text-white">Flash Express</h1>
                        </div>
                    </div>
                     <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-white lg:hidden">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-1.5">
                    {availableNavItems.map(item => (
                        <button 
                            key={item.view} 
                            onClick={() => handleItemClick(item.view)}
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
        </>
    );
};

export default Sidebar;
