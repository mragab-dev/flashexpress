
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Asset, Permission, UserRole, AssetType, AssetStatus } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, UserCircleIcon, TrashIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const AssetManagement = () => {
    const { assets, users, hasPermission, addAsset, updateAsset, assignAsset, deleteAsset } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'assign'>('add');
    const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    
    // Form and filter state
    const [formData, setFormData] = useState<Partial<Asset>>({ type: AssetType.DEVICE, name: '', identifier: '' });
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | AssetStatus>('all');
    const [filterAssignee, setFilterAssignee] = useState<'all' | 'unassigned' | number>('all');


    if (!hasPermission(Permission.MANAGE_ASSETS)) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
                <p className="text-slate-600">You do not have permission to manage assets.</p>
            </div>
        );
    }
    
    const assignableUsers = users.filter(u => u.roles.includes(UserRole.COURIER) || u.roles.includes(UserRole.ADMIN) || u.roles.includes(UserRole.SUPER_USER));
    
    const getAssigneeName = (userId?: number) => {
        if (!userId) return 'Unassigned';
        return users.find(u => u.id === userId)?.name || 'Unknown User';
    };

    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const matchesSearch = searchTerm.trim() === '' || 
                                  asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  asset.identifier?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
            
            const matchesAssignee = filterAssignee === 'all' || 
                                    (filterAssignee === 'unassigned' && !asset.assignedToUserId) ||
                                    asset.assignedToUserId === Number(filterAssignee);

            return matchesSearch && matchesStatus && matchesAssignee;
        });
    }, [assets, searchTerm, filterStatus, filterAssignee]);


    const openModal = (mode: 'add' | 'edit' | 'assign', asset?: Asset) => {
        setModalMode(mode);
        setCurrentAsset(asset || null);
        if (asset) {
            setFormData({ type: asset.type, name: asset.name, identifier: asset.identifier, status: asset.status });
            setAssigneeId(asset.assignedToUserId ? String(asset.assignedToUserId) : null);
        } else {
            setFormData({ type: AssetType.DEVICE, name: '', identifier: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentAsset(null);
    };

    const handleDeleteClick = (asset: Asset) => {
        setAssetToDelete(asset);
    };
    
    const confirmDelete = () => {
        if(assetToDelete) {
            deleteAsset(assetToDelete.id);
            setAssetToDelete(null);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            addAsset(formData as Omit<Asset, 'id' | 'status'>);
        } else if (modalMode === 'edit' && currentAsset) {
            updateAsset(currentAsset.id, formData);
        } else if (modalMode === 'assign' && currentAsset) {
            assignAsset(currentAsset.id, assigneeId ? parseInt(assigneeId) : null);
        }
        closeModal();
    };

    const handleExport = () => {
        const headers = ['ID', 'Name', 'Type', 'Identifier', 'Status', 'Assigned To', 'Assignment Date'];
        const data = filteredAssets.map(asset => [
            asset.id,
            asset.name,
            asset.type,
            asset.identifier || 'N/A',
            asset.status,
            getAssigneeName(asset.assignedToUserId),
            asset.assignmentDate ? new Date(asset.assignmentDate).toLocaleDateString() : 'N/A'
        ]);
        exportToCsv(headers, data, 'Asset_Report');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Asset Management</h1>
                    <p className="text-slate-500 mt-1">Manage and assign company assets like vehicles and devices.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleExport}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={() => openModal('add')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
                    >
                        <PlusCircleIcon />
                        Add Asset
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Search by name or identifier..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow px-4 py-2 border border-slate-300 rounded-lg"
                />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="all">All Statuses</option>
                    {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value as any)} className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="all">All Users</option>
                    <option value="unassigned">Unassigned</option>
                    {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-xs font-medium text-slate-500 uppercase">Asset</th>
                            <th className="p-4 text-xs font-medium text-slate-500 uppercase">Type</th>
                            <th className="p-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="p-4 text-xs font-medium text-slate-500 uppercase">Assigned To</th>
                            <th className="p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredAssets.map(asset => (
                            <tr key={asset.id}>
                                <td className="p-4">
                                    <p className="font-semibold">{asset.name}</p>
                                    <p className="text-sm text-slate-500 font-mono">{asset.identifier}</p>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{asset.type}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${asset.status === AssetStatus.AVAILABLE ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{asset.status}</span>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{getAssigneeName(asset.assignedToUserId)}</td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => openModal('edit', asset)} className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md"><PencilIcon /></button>
                                        <button onClick={() => openModal('assign', asset)} className="p-2 text-slate-500 hover:text-green-600 hover:bg-slate-100 rounded-md"><UserCircleIcon /></button>
                                        {hasPermission(Permission.DELETE_ASSET) && (
                                            <button onClick={() => handleDeleteClick(asset)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={
                modalMode === 'add' ? 'Add New Asset' : modalMode === 'edit' ? 'Edit Asset' : 'Assign Asset'
            }>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {modalMode !== 'assign' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Asset Type</label>
                                    <select name="type" value={formData.type} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md">
                                        {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Identifier</label>
                                    <input type="text" name="identifier" value={formData.identifier || ''} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g., License Plate, S/N" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <p className="mb-2">Assign <strong>{currentAsset?.name}</strong> to:</p>
                            <select value={assigneeId || ''} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                                <option value="">Unassigned</option>
                                {assignableUsers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold">Save</button>
                    </div>
                </form>
            </Modal>
             <Modal isOpen={!!assetToDelete} onClose={() => setAssetToDelete(null)} title="Confirm Deletion">
                {assetToDelete && (
                    <div>
                        <p>Are you sure you want to delete the asset <strong>{assetToDelete.name}</strong> ({assetToDelete.identifier})?</p>
                        <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setAssetToDelete(null)} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">Delete Asset</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AssetManagement;
