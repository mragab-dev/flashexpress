

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, Zone } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, KeyIcon, TrashIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const UserManagement = () => {
    const { users, addUser, updateUser, removeUser, resetPassword, currentUser, canCreateUsers, updateClientTaxCard, getTaxCardNumber, addToast } = useAppContext();
    const [mode, setMode] = useState<'add' | 'edit' | 'reset' | 'delete' | 'taxCard' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});
    const [tempTaxCardNumber, setTempTaxCardNumber] = useState('');

    // Check if user can access this page
    if (!currentUser || !canCreateUsers(currentUser)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">Only administrators and super users can manage users.</p>
                </div>
            </div>
        );
    }

    // Filter roles based on current user permissions
    const getAvailableRoles = (editingUser?: User) => {
        if (currentUser.role === UserRole.ADMIN) {
            return Object.values(UserRole);
        } else if (currentUser.role === UserRole.SUPER_USER) {
            // Super users can create everyone except admins
            const roles = Object.values(UserRole).filter(role => role !== UserRole.ADMIN);
            
            // If editing an existing admin user, super user cannot change their role
            if (editingUser && editingUser.role === UserRole.ADMIN) {
                return [UserRole.ADMIN]; // Only show admin role, effectively making it read-only
            }
            
            return roles;
        }
        return [];
    };

    const availableRoles = getAvailableRoles(mode === 'edit' ? selectedUser || undefined : undefined);
    
    const openModal = (modalMode: 'add' | 'edit' | 'reset' | 'delete' | 'taxCard', user?: User) => {
        // Allow both ADMINs and SUPER_USERs to access tax card functionality
        if (modalMode === 'taxCard' && currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.SUPER_USER) {
            addToast('Only administrators and super users can manage tax card numbers', 'error');
            return;
        }
        
        // Prevent SUPER_USERs from editing or deleting ADMIN users
        if ((modalMode === 'edit' || modalMode === 'delete') && 
            user?.role === UserRole.ADMIN && 
            currentUser?.role === UserRole.SUPER_USER) {
            addToast('Super users cannot modify administrator accounts', 'error');
            return;
        }
        
        setMode(modalMode);
        setSelectedUser(user || null);
        setFormData(user ? { ...user } : { role: UserRole.CLIENT, zone: Zone.CAIRO_ZONE_A });
        
        if (modalMode === 'taxCard' && user) {
            setTempTaxCardNumber(getTaxCardNumber(user.id) || '');
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
        }
        closeModal();
    };

    const handleTaxCardUpdate = () => {
        if (!selectedUser) return;
        
        // Double-check: Only admins and super users can update tax cards
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.SUPER_USER) {
            addToast('Only administrators and super users can manage tax card numbers', 'error');
            closeModal();
            return;
        }
        
        // Validate XXX-XXX-XXX format
        const taxCardRegex = /^\d{3}-\d{3}-\d{3}$/;
        if (tempTaxCardNumber && !taxCardRegex.test(tempTaxCardNumber)) {
            addToast('Tax card number must be in format XXX-XXX-XXX', 'error');
            return;
        }
        
        updateClientTaxCard(selectedUser.id, tempTaxCardNumber);
        addToast(`Tax card number updated for ${selectedUser.name}`, 'success');
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
        
        if (mode === 'taxCard' && selectedUser) {
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Setting tax card number for client <strong>{selectedUser.name}</strong>.</p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Tax Card Number (XXX-XXX-XXX format)
                        </label>
                        <input
                            type="text"
                            value={tempTaxCardNumber}
                            onChange={(e) => setTempTaxCardNumber(e.target.value)}
                            placeholder="123-456-789"
                            pattern="\d{3}-\d{3}-\d{3}"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono"
                        />
                        <p className="text-sm text-slate-500 mt-1">
                            Leave empty to remove the tax card number. Only administrators and super users can modify this value.
                        </p>
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
                    {mode === 'add' && (
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                           <input type="password" name="password" onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" required />
                       </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                           <select 
                               name="role" 
                               value={formData.role || ''} 
                               onChange={handleFormChange} 
                               className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                               disabled={mode === 'edit' && selectedUser?.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER}
                           >
                               {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                           </select>
                           {mode === 'edit' && selectedUser?.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER && (
                               <p className="text-sm text-slate-500 mt-1">
                                   Super users cannot change admin roles.
                               </p>
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
                               <input 
                                   type="number" 
                                   step="0.01" 
                                   min="0" 
                                   name="flatRateFee" 
                                   value={formData.flatRateFee || 5.0} 
                                   onChange={(e) => setFormData(prev => ({ ...prev, flatRateFee: parseFloat(e.target.value) || 0 }))}
                                   className="w-full px-4 py-2 border border-slate-300 rounded-lg" 
                               />
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
    }

    return (
        <div className="bg-white rounded-xl shadow-sm">
             <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">User Management</h2>
                    <p className="text-slate-500 mt-1 text-sm">Add, edit, or remove users from the platform.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        Export as CSV
                    </button>
                    <button onClick={() => openModal('add')} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                        <PlusCircleIcon className="w-5 h-5"/>
                        Add User
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Zone</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tax Card</th>
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user.id} className={user.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER ? 'bg-slate-50' : ''}>
                                <td className="px-6 py-4 font-semibold text-slate-800">
                                    {user.name}
                                    {user.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER && (
                                        <span className="ml-2 text-xs text-slate-500">(Protected)</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4 text-slate-600">{user.role}</td>
                                <td className="px-6 py-4 text-slate-600">{user.zone || 'N/A'}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    {user.role === UserRole.CLIENT ? (
                                        <span className="font-mono text-sm">
                                            {getTaxCardNumber(user.id) || <span className="text-slate-400">Not Set</span>}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">N/A</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        {!(user.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER) && (
                                            <>
                                                <button onClick={() => openModal('edit', user)} title="Edit" className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"><PencilIcon /></button>
                                                <button onClick={() => openModal('reset', user)} title="Reset Password" className="p-2 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-md"><KeyIcon /></button>
                                            </>
                                        )}
                                        {user.role === UserRole.CLIENT && (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_USER) && (
                                            <button onClick={() => openModal('taxCard', user)} title="Set Tax Card" className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                Tax Card
                                            </button>
                                        )}
                                        {!(user.role === UserRole.ADMIN && currentUser?.role === UserRole.SUPER_USER) && (
                                            <button onClick={() => openModal('delete', user)} title="Delete" className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
            <Modal isOpen={!!mode} onClose={closeModal} title={
                mode === 'add' ? 'Add New User' : 
                mode === 'edit' ? 'Edit User' : 
                mode === 'reset' ? 'Reset Password' : 
                mode === 'taxCard' ? 'Set Tax Card Number' :
                'Confirm Deletion'
            }>
                {renderModalContent()}
            </Modal>
        </div>
    )
};

export default UserManagement;