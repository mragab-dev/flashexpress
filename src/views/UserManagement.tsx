

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, ZONES, ShipmentPriority, Permission, CustomRole } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, KeyIcon, TrashIcon, DocumentDownloadIcon, WalletIcon, PhoneIcon, UserCircleIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const UserManagement = () => {
    const { users, addUser, updateUser, removeUser, resetPassword, currentUser, hasPermission, updateClientTaxCard, getTaxCardNumber, addToast, customRoles } = useAppContext();
    const [mode, setMode] = useState<'add' | 'edit' | 'reset' | 'delete' | 'taxCard' | 'priorityPricing' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});
    const [tempTaxCardNumber, setTempTaxCardNumber] = useState('');
    const [tempPriorityMultipliers, setTempPriorityMultipliers] = useState<{
        [ShipmentPriority.STANDARD]: number;
        [ShipmentPriority.URGENT]: number;
        [ShipmentPriority.EXPRESS]: number;
    }>({
        [ShipmentPriority.STANDARD]: 1.0,
        [ShipmentPriority.URGENT]: 1.5,
        [ShipmentPriority.EXPRESS]: 2.0,
    });
    
    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = searchTerm.trim() === '' ||
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.publicId.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = filterRole === 'all' || (user.roles || []).includes(filterRole);
            
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, filterRole]);
    

    if (!currentUser || !hasPermission(Permission.MANAGE_USERS)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">You do not have permission to manage users.</p>
                </div>
            </div>
        );
    }

    const getAvailableRoles = (): CustomRole[] => {
        if (currentUser?.roles?.includes(UserRole.ADMIN)) {
            return customRoles;
        } else if (currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            return customRoles.filter(role => role.name !== UserRole.ADMIN);
        }
        return [];
    };

    const availableRoles = getAvailableRoles();
    
    const openModal = (modalMode: 'add' | 'edit' | 'reset' | 'delete' | 'taxCard' | 'priorityPricing', user?: User) => {
        if ((modalMode === 'taxCard' || modalMode === 'priorityPricing') && !currentUser?.roles?.includes(UserRole.ADMIN) && !currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            addToast('Only administrators and super users can manage client settings', 'error');
            return;
        }
        
        const isEditingAdmin = user?.roles?.includes(UserRole.ADMIN);
        const isSuperUser = currentUser?.roles?.includes(UserRole.SUPER_USER);
        if ((modalMode === 'edit' || modalMode === 'delete' || modalMode === 'reset') && isEditingAdmin && isSuperUser) {
            addToast('Super users cannot modify administrator accounts', 'error');
            return;
        }
        
        setMode(modalMode);
        setSelectedUser(user || null);
        const clientRole = customRoles.find(r => r.name === UserRole.CLIENT);
        setFormData(user ? { ...user } : { 
            roles: clientRole ? [clientRole.name] : [], 
            zones: [], 
            flatRateFee: 75.0,
            priorityMultipliers: {
                [ShipmentPriority.STANDARD]: 1.0,
                [ShipmentPriority.URGENT]: 1.5,
                [ShipmentPriority.EXPRESS]: 2.0,
            }
        });
        
        if (modalMode === 'taxCard' && user) {
            setTempTaxCardNumber(getTaxCardNumber(user.id) || '');
        }
        
        if (modalMode === 'priorityPricing' && user) {
            setTempPriorityMultipliers(user.priorityMultipliers || {
                [ShipmentPriority.STANDARD]: 1.0,
                [ShipmentPriority.URGENT]: 1.5,
                [ShipmentPriority.EXPRESS]: 2.0,
            });
        }
    };

    const closeModal = () => {
        setMode(null);
        setSelectedUser(null);
        setFormData({});
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (roleName: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentRoles = prev.roles || [];
            if (isChecked) {
                return { ...prev, roles: [...currentRoles, roleName] };
            } else {
                return { ...prev, roles: currentRoles.filter(r => r !== roleName) };
            }
        });
    };
    
    const handleZoneChange = (zoneName: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentZones = prev.zones || [];
            if (isChecked) {
                return { ...prev, zones: [...currentZones, zoneName] };
            } else {
                return { ...prev, zones: currentZones.filter(z => z !== zoneName) };
            }
        });
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'add') {
            addUser(formData as Omit<User, 'id' | 'publicId'>);
        } else if (mode === 'edit' && selectedUser) {
            updateUser(selectedUser.id, formData);
        } else if (mode === 'reset' && selectedUser && formData.password) {
            resetPassword(selectedUser.id, formData.password);
        } else if (mode === 'taxCard' && selectedUser) {
            handleTaxCardUpdate();
            return;
        } else if (mode === 'priorityPricing' && selectedUser) {
            handlePriorityPricingUpdate();
            return;
        }
        closeModal();
    };
    

    const handleTaxCardUpdate = () => {
        if (!selectedUser) return;
        
        if (!currentUser?.roles?.includes(UserRole.ADMIN) && !currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            addToast('Only administrators and super users can manage tax card numbers', 'error');
            closeModal();
            return;
        }
        
        const taxCardRegex = /^\d{3}-\d{3}-\d{3}$/;
        if (tempTaxCardNumber && !taxCardRegex.test(tempTaxCardNumber)) {
            addToast('Tax card number must be in format XXX-XXX-XXX', 'error');
            return;
        }
        
        updateClientTaxCard(selectedUser.id, tempTaxCardNumber);
        addToast(`Tax card number updated for ${selectedUser.name}`, 'success');
        closeModal();
    };

    const handlePriorityPricingUpdate = () => {
        if (!selectedUser) return;
        
        if (!currentUser?.roles?.includes(UserRole.ADMIN) && !currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            addToast('Only administrators and super users can manage priority pricing', 'error');
            closeModal();
            return;
        }
        
        const multipliers = tempPriorityMultipliers;
        if (multipliers[ShipmentPriority.STANDARD] <= 0 || multipliers[ShipmentPriority.URGENT] <= 0 || multipliers[ShipmentPriority.EXPRESS] <= 0) {
            addToast('All priority multipliers must be positive numbers', 'error');
            return;
        }
        
        updateUser(selectedUser.id, { priorityMultipliers: multipliers });
        addToast(`Priority pricing updated for ${selectedUser.name}`, 'success');
        closeModal();
    };

    const handleDelete = () => {
        if (selectedUser) {
            removeUser(selectedUser.id);
        }
        closeModal();
    };
    
    const handleExport = () => {
        const headers = ['Public ID', 'Name', 'Email', 'Roles', 'Zones', 'Wallet Balance (EGP)'];
        const data = filteredUsers.map(user => [
            user.publicId,
            user.name,
            user.email,
            (user.roles || []).join(', '),
            user.zones?.join(', ') || 'N/A',
            user.walletBalance != null ? user.walletBalance.toFixed(2) : 'N/A'
        ]);
        exportToCsv(headers, data, 'User_List_Export');
    };

    const renderModalContent = () => {
        if (mode === 'delete' && selectedUser) {
            return (
                <div>
                    <p>Are you sure you want to delete the user <strong>{selectedUser.name}</strong>? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">Delete User</button>
                    </div>
                </div>
            )
        }
        
        if (mode === 'reset' && selectedUser) {
             return (
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <p>Resetting password for <strong>{selectedUser.name}</strong>.</p>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <input type="password" name="password" onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" required />
                    </div>
                     <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold">Reset Password</button>
                    </div>
                 </form>
             )
        }

        if (mode === 'add' || mode === 'edit') {
            const isCourier = (formData.roles || []).includes(UserRole.COURIER);
            const isClient = (formData.roles || []).includes(UserRole.CLIENT);
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                        <input type="tel" name="phone" value={formData.phone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" placeholder="01xxxxxxxxx" />
                    </div>
                    {mode === 'add' && (
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                           <input type="password" name="password" onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" required />
                       </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                            {availableRoles.map(r => (
                                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={(formData.roles || []).includes(r.name)} onChange={e => handleRoleChange(r.name, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                    <span>{r.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {isCourier && (
                         <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-4">
                            <h4 className="font-semibold text-blue-800">Courier Settings</h4>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Zones</label>
                                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-white rounded">
                                    {Object.entries(ZONES.GreaterCairo).map(([city, zoneList]) => (
                                        <div key={city}>
                                            <h5 className="font-semibold text-slate-600 mt-2 px-1">{city}</h5>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-1">
                                                {zoneList.map(zone => (
                                                    <label key={zone} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                                                        <input type="checkbox" checked={(formData.zones || []).includes(zone)} onChange={e => handleZoneChange(zone, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                                        <span>{zone}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </div>
                           {mode === 'add' && (
                               <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-1">Referred By (Optional)</label>
                                   <select name="referrerId" value={formData.referrerId || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                                       <option value="">No Referrer</option>
                                       {users.filter(u => (u.roles || []).includes(UserRole.COURIER)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                               </div>
                           )}
                         </div>
                    )}
                    {isClient && (
                         <div className="p-4 border border-green-200 bg-green-50 rounded-lg space-y-4">
                            <h4 className="font-semibold text-green-800">Client Settings</h4>
                             <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Flat Rate Fee (EGP)</label>
                               <input type="number" step="0.01" min="0" name="flatRateFee" value={formData.flatRateFee ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, flatRateFee: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                           </div>
                         </div>
                    )}
                    {(formData.roles?.includes(UserRole.ADMIN) || currentUser.roles?.includes(UserRole.ADMIN)) && formData.referrerId && (
                         <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg space-y-4">
                            <h4 className="font-semibold text-purple-800">Referral Settings (for Referrer)</h4>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Referral Commission (EGP per delivery)</label>
                                <input type="number" step="0.01" min="0" name="referralCommission" value={formData.referralCommission ?? ''} onChange={(e) => setFormData(prev => ({...prev, referralCommission: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                                <p className="text-xs text-slate-500 mt-1">This commission is paid to the referring courier for each successful delivery made by this new courier.</p>
                            </div>
                         </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold">{mode === 'add' ? 'Create User' : 'Save Changes'}</button>
                    </div>
                </form>
            )
        }
        return null;
    };


    return (
        <div className="bg-white rounded-xl shadow-sm">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">User Management</h2>
                    <p className="text-slate-500 mt-1 text-sm">Create, edit, and manage all users in the system.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleExport} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button onClick={() => openModal('add')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                        <PlusCircleIcon className="w-5 h-5"/>
                        New User
                    </button>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4">
                <input 
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg"
                />
                 <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg bg-white"
                >
                    <option value="all">Filter by Role</option>
                    {customRoles.map(role => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                </select>
            </div>
            
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Roles</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Details</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <UserCircleIcon className="w-6 h-6 text-slate-500"/>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{user.name}</p>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                            <p className="font-mono text-xs text-slate-400 mt-1">{user.publicId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {(user.roles || []).map(role => (
                                            <span key={role} className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{role}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">
                                    {(user.roles || []).includes(UserRole.COURIER) && `Zones: ${user.zones?.join(', ') || 'N/A'}`}
                                    {(user.roles || []).includes(UserRole.CLIENT) && `Fee: ${user.flatRateFee?.toFixed(2)} EGP`}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openModal('edit', user)} title="Edit User" className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"><PencilIcon /></button>
                                        <button onClick={() => openModal('reset', user)} title="Reset Password" className="p-2 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-md"><KeyIcon /></button>
                                        <button onClick={() => openModal('delete', user)} title="Delete User" className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon /></button>
                                         {(user.roles || []).includes(UserRole.CLIENT) && <button onClick={() => openModal('priorityPricing', user)} title="Set Priority Pricing" className="p-2 text-slate-500 hover:text-green-600 hover:bg-slate-100 rounded-md"><WalletIcon className="w-5 h-5"/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Modal isOpen={!!mode} onClose={closeModal} title={mode === 'add' ? 'Create New User' : `Manage ${selectedUser?.name}`} size="2xl">
                {renderModalContent()}
            </Modal>
            
        </div>
    );
};

export default UserManagement;
