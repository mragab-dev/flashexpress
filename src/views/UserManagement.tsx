

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, Zone } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, KeyIcon, TrashIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const UserManagement = () => {
    const { users, addUser, updateUser, removeUser, resetPassword } = useAppContext();
    const [mode, setMode] = useState<'add' | 'edit' | 'reset' | 'delete' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});
    
    const openModal = (modalMode: 'add' | 'edit' | 'reset' | 'delete', user?: User) => {
        setMode(modalMode);
        setSelectedUser(user || null);
        setFormData(user ? { ...user } : { role: UserRole.CLIENT, zone: Zone.CAIRO_ZONE_A });
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
        }
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
                           <select name="role" value={formData.role || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                               {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                           </select>
                       </div>
                        {formData.role === UserRole.COURIER && (
                             <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                               <select name="zone" value={formData.zone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                                   {Object.values(Zone).map(z => <option key={z} value={z}>{z}</option>)}
                               </select>
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
                            <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 font-semibold text-slate-800">{user.name}</td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4 text-slate-600">{user.role}</td>
                                <td className="px-6 py-4 text-slate-600">{user.zone || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openModal('edit', user)} title="Edit" className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"><PencilIcon /></button>
                                        <button onClick={() => openModal('reset', user)} title="Reset Password" className="p-2 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-md"><KeyIcon /></button>
                                        <button onClick={() => openModal('delete', user)} title="Delete" className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon /></button>
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
                mode === 'reset' ? 'Reset Password' : 'Confirm Deletion'
            }>
                {renderModalContent()}
            </Modal>
        </div>
    )
};

export default UserManagement;