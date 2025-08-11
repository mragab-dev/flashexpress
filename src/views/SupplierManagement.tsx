// src/views/SupplierManagement.tsx

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Supplier, SupplierTransaction, Permission } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon, DocumentDownloadIcon, WalletIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { StatCard } from '../components/common/StatCard';

const SupplierManagement = () => {
    const { suppliers, supplierTransactions, addSupplier, updateSupplier, deleteSupplier, addSupplierTransaction, deleteSupplierTransaction, hasPermission } = useAppContext();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>({});

    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionData, setTransactionData] = useState<{ type: 'Payment' | 'Credit', amount: number, description: string }>({ type: 'Payment', amount: 0, description: '' });
    
    if (!hasPermission(Permission.MANAGE_SUPPLIERS)) {
        return <div className="text-center p-8">Access Denied.</div>;
    }

    const totalPaidToSuppliers = useMemo(() => {
        return supplierTransactions.filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0);
    }, [supplierTransactions]);
    
    const openModal = (mode: 'add' | 'edit', supplier?: Supplier) => {
        setModalMode(mode);
        setCurrentSupplier(supplier || null);
        setFormData(supplier || {});
        setIsModalOpen(true);
    };

    const openTransactionModal = (supplier: Supplier) => {
        setCurrentSupplier(supplier);
        setTransactionModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            addSupplier(formData as Omit<Supplier, 'id'>);
        } else if (currentSupplier) {
            updateSupplier(currentSupplier.id, formData);
        }
        setIsModalOpen(false);
    };

    const handleTransactionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentSupplier && transactionData.amount > 0) {
            addSupplierTransaction({
                supplier_id: currentSupplier.id,
                date: new Date().toISOString(),
                ...transactionData
            });
            setTransactionModalOpen(false);
            setTransactionData({ type: 'Payment', amount: 0, description: '' });
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Supplier Management</h1>
                <button onClick={() => openModal('add')} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg"><PlusCircleIcon /> Add Supplier</button>
            </div>
            
            <StatCard title="Total Paid to Suppliers" value={`${totalPaidToSuppliers.toFixed(2)} EGP`} icon={<WalletIcon />} color="#10b981" />
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Total Paid</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {suppliers.map(supplier => {
                            const totalPaid = supplierTransactions.filter(t => t.supplier_id === supplier.id && t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0);
                            return (
                                <tr key={supplier.id}>
                                    <td className="p-4 font-semibold">{supplier.name}</td>
                                    <td className="p-4 text-sm">{supplier.contact_person} ({supplier.phone})</td>
                                    <td className="p-4 font-mono">{totalPaid.toFixed(2)} EGP</td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => openTransactionModal(supplier)} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">Log Payment</button>
                                            <button onClick={() => openModal('edit', supplier)} className="p-2"><PencilIcon /></button>
                                            <button onClick={() => deleteSupplier(supplier.id)} className="p-2"><TrashIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? 'Add Supplier' : 'Edit Supplier'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Supplier Name" className="w-full p-2 border rounded" required />
                    <input name="contact_person" value={formData.contact_person || ''} onChange={e => setFormData({...formData, contact_person: e.target.value})} placeholder="Contact Person" className="w-full p-2 border rounded" />
                    <input name="phone" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone" className="w-full p-2 border rounded" />
                    <input name="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email" className="w-full p-2 border rounded" />
                    <textarea name="address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Address" className="w-full p-2 border rounded"></textarea>
                    <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Save</button>
                </form>
            </Modal>
            
            <Modal isOpen={isTransactionModalOpen} onClose={() => setTransactionModalOpen(false)} title={`Log Transaction for ${currentSupplier?.name}`}>
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                    <select value={transactionData.type} onChange={e => setTransactionData({...transactionData, type: e.target.value as any})} className="w-full p-2 border rounded">
                        <option value="Payment">Payment</option>
                        <option value="Credit">Credit</option>
                    </select>
                    <input type="number" value={transactionData.amount} onChange={e => setTransactionData({...transactionData, amount: parseFloat(e.target.value)})} placeholder="Amount" className="w-full p-2 border rounded" required />
                    <input value={transactionData.description} onChange={e => setTransactionData({...transactionData, description: e.target.value})} placeholder="Description (optional)" className="w-full p-2 border rounded" />
                    <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Log Transaction</button>
                </form>
            </Modal>
        </div>
    );
};

export default SupplierManagement;
