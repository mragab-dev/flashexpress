




import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, Zone, ShipmentPriority, Permission } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, KeyIcon, TrashIcon, DocumentDownloadIcon, WalletIcon, PhoneIcon } from '../components/Icons';
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

    const getAvailableRoles = () => {
        if (currentUser?.role === UserRole.ADMIN) {
            return customRoles;
        } else if (currentUser?.role === UserRole.SUPER_USER) {
            return customRoles.filter(role => role.name !== UserRole.ADMIN);
        }
        return [];
    };

    const availableRoles = getAvailableRoles();
    
    const openModal = (modalMode: 'add' | 'edit' | 'reset' | 'delete' | 'taxCard' | 'priorityPricing', user?: User) => {
        if ((modalMode === 'taxCard' || modalMode === 'priorityPricing') && currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.SUPER_USER) {
            addToast('Only administrators and super users can manage client settings', 'error');
            return;
        }
        
        const isEditingAdmin = user?.role === UserRole.ADMIN;
        const isSuperUser = currentUser?.role === UserRole.SUPER_USER;
        if ((modalMode === 'edit' || modalMode === 'delete' || modalMode === 'reset') && isEditingAdmin && isSuperUser) {
            addToast('Super users cannot modify administrator accounts', 'error');
            return;
        }
        
        setMode(modalMode);
        setSelectedUser(user || null);
        const clientRole = customRoles.find(r => r.name === UserRole.CLIENT);
        setFormData(user ? { ...user } : { 
            role: clientRole?.name || '', 
            zone: Zone.CAIRO_DOWNTOWN, 
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'add') {
            addUser(formData as Omit<User, 'id'>);
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
        
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.SUPER_USER) {
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
        
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.SUPER_USER) {
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
        const headers = ['ID', 'Name', 'Email', 'Role', 'Zone', 'Wallet Balance (EGP)'];
        const data = users.map(user => [
            user.id,
            user.name,
            user.email,
            user.role,
            user.zone || 'N/A',
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
        
        if (mode === 'priorityPricing' && selectedUser) {
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Setting priority pricing multipliers for client <strong>{selectedUser.name}</strong>.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Standard Priority Multiplier</label>
                            <input type="number" step="0.1" min="0.1" value={tempPriorityMultipliers[ShipmentPriority.STANDARD]} onChange={(e) => setTempPriorityMultipliers(prev => ({ ...prev, [ShipmentPriority.STANDARD]: parseFloat(e.target.value) || 1.0 }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                            <p className="text-sm text-slate-500 mt-1">Base rate multiplier (typically 1.0 for standard delivery)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Urgent Priority Multiplier</label>
                            <input type="number" step="0.1" min="0.1" value={tempPriorityMultipliers[ShipmentPriority.URGENT]} onChange={(e) => setTempPriorityMultipliers(prev => ({ ...prev, [ShipmentPriority.URGENT]: parseFloat(e.target.value) || 1.5 }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                            <p className="text-sm text-slate-500 mt-1">Multiplier for urgent deliveries (typically 1.5x base rate)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Express Priority Multiplier</label>
                            <input type="number" step="0.1" min="0.1" value={tempPriorityMultipliers[ShipmentPriority.EXPRESS]} onChange={(e) => setTempPriorityMultipliers(prev => ({ ...prev, [ShipmentPriority.EXPRESS]: parseFloat(e.target.value) || 2.0 }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                            <p className="text-sm text-slate-500 mt-1">Multiplier for express deliveries (typically 2.0x base rate)</p>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold text-slate-800 mb-2">Price Preview</h4>
                        <p className="text-sm text-slate-600">Base rate: {selectedUser.flatRateFee?.toFixed(2) || '0.00'} EGP</p>
                        <p className="text-sm text-slate-600">Standard: {((selectedUser.flatRateFee || 0) * tempPriorityMultipliers[ShipmentPriority.STANDARD]).toFixed(2)} EGP</p>
                        <p className="text-sm text-slate-600">Urgent: {((selectedUser.flatRateFee || 0) * tempPriorityMultipliers[ShipmentPriority.URGENT]).toFixed(2)} EGP</p>
                        <p className="text-sm text-slate-600">Express: {((selectedUser.flatRateFee || 0) * tempPriorityMultipliers[ShipmentPriority.EXPRESS]).toFixed(2)} EGP</p>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">Update Priority Pricing</button>
                    </div>
                </form>
            )
        }
        
        if (mode === 'taxCard' && selectedUser) {
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Setting tax card number for client <strong>{selectedUser.name}</strong>.</p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tax Card Number (XXX-XXX-XXX format)</label>
                        <input type="text" value={tempTaxCardNumber} onChange={(e) => setTempTaxCardNumber(e.target.value)} placeholder="123-456-789" pattern="\d{3}-\d{3}-\d{3}" className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono" />
                        <p className="text-sm text-slate-500 mt-1">Leave empty to remove the tax card number. Only administrators and super users can modify this value.</p>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Update Tax Card</button>
                    </div>
                </form>
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
                        <p className="text-xs text-slate-500 mt-1">Example for Egyptian number: 01012345678</p>
                    </div>
                    {mode === 'add' && (
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                           <input type="password" name="password" onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" required />
                       </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                           <select name="role" value={formData.role || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" disabled={mode === 'edit' && selectedUser?.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER}>
                               {availableRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                           </select>
                           {mode === 'edit' && selectedUser?.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER && (
                               <p className="text-sm text-slate-500 mt-1">Super users cannot change admin roles.</p>
                           )}
                       </div>
                        {formData.role === UserRole.COURIER && (
                             <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                               <select name="zone" value={formData.zone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                                   {Object.values(Zone).map(z => <option key={z} value={z}>{z}</option>)}
                               </select>
                           </div>
                        )}
                        {formData.role === UserRole.CLIENT && (
                             <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Flat Rate Fee (EGP)</label>
                               <input type="number" step="0.01" min="0" name="flatRateFee" value={formData.flatRateFee ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, flatRateFee: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                           </div>
                        )}
                    </div>
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
            
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Details</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-slate-800">{user.name}</p>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                     {user.phone && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <PhoneIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <span className="text-sm text-slate-600">{user.phone}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{user.role}</span></td>
                                <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">
                                    {user.role === UserRole.COURIER && `Zone: ${user.zone}`}
                                    {user.role === UserRole.CLIENT && `Fee: ${user.flatRateFee?.toFixed(2)} EGP`}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openModal('edit', user)} title="Edit User" className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"><PencilIcon /></button>
                                        <button onClick={() => openModal('reset', user)} title="Reset Password" className="p-2 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-md"><KeyIcon /></button>
                                        <button onClick={() => openModal('delete', user)} title="Delete User" className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon /></button>
                                         {user.role === UserRole.CLIENT && <button onClick={() => openModal('priorityPricing', user)} title="Set Priority Pricing" className="p-2 text-slate-500 hover:text-green-600 hover:bg-slate-100 rounded-md"><WalletIcon className="w-5 h-5"/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Modal isOpen={!!mode} onClose={closeModal} title={mode === 'add' ? 'Create New User' : `Manage ${selectedUser?.name}`}>
                {renderModalContent()}
            </Modal>
            
        </div>
    );
};

export default UserManagement;