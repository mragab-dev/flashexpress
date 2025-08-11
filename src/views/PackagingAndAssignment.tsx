// src/views/PackagingAndAssignment.tsx

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, UserRole, PackagingLogEntry } from '../types';
import { Modal } from '../components/common/Modal';
import { ArchiveBoxIcon, TruckIcon } from '../components/Icons';

export default function PackagingAndAssignment() {
    const { 
        shipments, users, assignShipmentToCourier, canCourierReceiveAssignment, addToast, 
        inventoryItems, updateShipmentPackaging, getCourierName, autoAssignShipments,
        bulkPackageShipments, bulkAssignShipments
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<'packaging' | 'assignment'>('packaging');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    
    // State for packaging modal
    const [isPackagingModalOpen, setPackagingModalOpen] = useState(false);
    const [packagingMode, setPackagingMode] = useState<'single' | 'bulk'>('single');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [packagingNotes, setPackagingNotes] = useState('');
    
    // State for single-item packaging
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const [useBubbleWrap, setUseBubbleWrap] = useState(false);

    // State for bulk selections
    const [selectedToPackageIds, setSelectedToPackageIds] = useState<string[]>([]);
    const [selectedToAssignIds, setSelectedToAssignIds] = useState<string[]>([]);
    const [bulkAssignCourierId, setBulkAssignCourierId] = useState<string>('');

    // NEW state for mixed-batch packaging
    const [materialsSummary, setMaterialsSummary] = useState<Record<string, number>>({});

    const couriers = users.filter(u => (u.roles || []).includes(UserRole.COURIER));
    const boxItems = inventoryItems.filter(i => i.name.toLowerCase().includes('box'));
    const labelItem = inventoryItems.find(i => i.name.toLowerCase().includes('label'));
    const bubbleWrapItem = inventoryItems.find(i => i.name.toLowerCase().includes('bubble wrap'));
    const otherPackagingItems = inventoryItems.filter(i => !i.name.toLowerCase().includes('box') && !i.name.toLowerCase().includes('label'));

    const shipmentsToPackage = shipments
        .filter(s => s.status === ShipmentStatus.WAITING_FOR_PACKAGING)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate));
        
    const shipmentsToAssign = shipments
        .filter(s => ![
            ShipmentStatus.DELIVERED,
            ShipmentStatus.DELIVERY_FAILED,
            ShipmentStatus.WAITING_FOR_PACKAGING
        ].includes(s.status))
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate));

    const packagedAndWaiting = shipments.filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT);
    const assignableInList = shipmentsToAssign.filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT);

    const handleOpenPackagingModal = (mode: 'single' | 'bulk', shipment?: Shipment) => {
        setPackagingMode(mode);
        setSelectedShipment(shipment || null);
        setPackagingNotes('');
        setUseBubbleWrap(false);

        if (mode === 'bulk') {
            const initialSummary: Record<string, number> = {};
            inventoryItems.forEach(item => {
                if (item.id.startsWith('inv_')) {
                    initialSummary[item.id] = 0;
                }
            });
            setMaterialsSummary(initialSummary);
        } else {
             setSelectedBoxId(null);
        }
        setPackagingModalOpen(true);
    };

    const handleSaveBulkPackaging = () => {
        const totalBoxes = Object.entries(materialsSummary)
            .filter(([key]) => key.startsWith('inv_box_'))
            .reduce((sum, [, value]) => sum + value, 0);

        if (totalBoxes !== selectedToPackageIds.length) {
            addToast(`Box count (${totalBoxes}) must match selected shipments (${selectedToPackageIds.length}).`, 'error');
            return;
        }

        const finalSummary = { ...materialsSummary };
        if (labelItem) {
            finalSummary[labelItem.id] = (finalSummary[labelItem.id] || 0) + selectedToPackageIds.length;
        } else {
            addToast('Shipping Label item not found in inventory.', 'error');
            return;
        }

        bulkPackageShipments(selectedToPackageIds, finalSummary, packagingNotes);
        setSelectedToPackageIds([]);
        setPackagingModalOpen(false);
    };

    const handleSavePackaging = () => {
        if (packagingMode === 'bulk') {
            handleSaveBulkPackaging();
            return;
        }

        const packagingLog: PackagingLogEntry[] = [];
        if (labelItem) { packagingLog.push({ inventoryItemId: labelItem.id, itemName: labelItem.name, quantityUsed: 1 }); } 
        else { addToast('Shipping Label is out of stock.', 'error'); return; }
        if (selectedBoxId) {
            const box = boxItems.find(b => b.id === selectedBoxId);
            if (box) { packagingLog.push({ inventoryItemId: box.id, itemName: box.name, quantityUsed: 1 }); }
        } else { addToast('Please select a box size.', 'error'); return; }
        if (useBubbleWrap) {
             if (bubbleWrapItem) { packagingLog.push({ inventoryItemId: bubbleWrapItem.id, itemName: bubbleWrapItem.name, quantityUsed: 1 }); } 
             else { addToast('Bubble Wrap is out of stock.', 'error'); }
        }
        
        if (selectedShipment) {
            updateShipmentPackaging(selectedShipment.id, packagingLog, packagingNotes);
        }
        
        setPackagingModalOpen(false);
    };

    const handleAssign = async (shipmentId: string, courierId: string) => {
        if (!courierId) { addToast('Please select a courier', 'error'); return; }
        await assignShipmentToCourier(shipmentId, parseInt(courierId));
    };

    const handleAutoAssign = async () => {
        setIsAutoAssigning(true);
        await autoAssignShipments();
        setIsAutoAssigning(false);
    };

    const handleBulkAssign = () => {
        if (selectedToAssignIds.length === 0 || !bulkAssignCourierId) {
            addToast('Please select shipments and a courier.', 'error'); return;
        }
        const courierIdNum = parseInt(bulkAssignCourierId);
        if (!canCourierReceiveAssignment(courierIdNum)) {
            addToast('Selected courier is restricted.', 'error'); return;
        }
        bulkAssignShipments(selectedToAssignIds, courierIdNum);
        setSelectedToAssignIds([]);
        setBulkAssignCourierId('');
    };

    const handleToggleSelect = (id: string, type: 'package' | 'assign') => {
        const setter = type === 'package' ? setSelectedToPackageIds : setSelectedToAssignIds;
        setter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (type: 'package' | 'assign') => {
        if (type === 'package') {
            setSelectedToPackageIds(selectedToPackageIds.length === shipmentsToPackage.length ? [] : shipmentsToPackage.map(s => s.id));
        } else {
            setSelectedToAssignIds(selectedToAssignIds.length === assignableInList.length ? [] : assignableInList.map(s => s.id));
        }
    };

    // --- New states and functions for Mixed-Batch Packaging ---
    const handleSummaryChange = (itemId: string, quantity: number) => {
        setMaterialsSummary(prev => ({ ...prev, [itemId]: Math.max(0, quantity) }));
    };

    const totalBoxesInSummary = useMemo(() => {
        return Object.entries(materialsSummary)
            .filter(([key]) => key.startsWith('inv_box_'))
            .reduce((sum, [, value]) => sum + value, 0);
    }, [materialsSummary]);
    
    const TabButton: React.FC<{ label: string; count: number; isActive: boolean; onClick: () => void; }> = ({ label, count, isActive, onClick }) => (
        <button onClick={onClick} className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            {label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
        </button>
    );

    return (
        <div className="space-y-6">
            <div>
                 <h1 className="text-3xl font-bold text-slate-800">Packaging & Assignment</h1>
                 <p className="text-slate-500 mt-1">Prepare shipments for delivery and assign them to couriers.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
                 <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex border-b border-slate-200 -m-4 mb-0">
                         <TabButton label="Waiting for Packaging" count={shipmentsToPackage.length} isActive={activeTab === 'packaging'} onClick={() => setActiveTab('packaging')} />
                         <TabButton label="Manage Assignments" count={shipmentsToAssign.length} isActive={activeTab === 'assignment'} onClick={() => setActiveTab('assignment')} />
                    </div>
                     <div className="flex items-center gap-2 w-full md:w-auto">
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" aria-label="Filter by creation date" />
                        {selectedDate && <button onClick={() => setSelectedDate('')} className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200" aria-label="Clear date filter">Clear</button>}
                    </div>
                </div>
                
                {activeTab === 'packaging' && (
                    <div className="p-4 space-y-4">
                        {selectedToPackageIds.length > 0 && (
                            <div className="sticky top-[81px] z-10 bg-primary-50 border border-primary-200 p-3 rounded-lg shadow flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="font-semibold text-primary-800">{selectedToPackageIds.length} shipments selected</div>
                                <button onClick={() => handleOpenPackagingModal('bulk')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                                    <ArchiveBoxIcon className="w-5 h-5" /> Package Selected
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                             <input type="checkbox" onChange={() => handleSelectAll('package')} checked={selectedToPackageIds.length === shipmentsToPackage.length && shipmentsToPackage.length > 0} className="h-4 w-4 rounded" />
                             <label className="text-sm font-medium text-slate-600">Select all</label>
                        </div>
                        {shipmentsToPackage.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsToPackage.map(s => (
                                    <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
                                        <div className="flex gap-3">
                                            <input type="checkbox" checked={selectedToPackageIds.includes(s.id)} onChange={() => handleToggleSelect(s.id, 'package')} className="mt-1 h-4 w-4 rounded" />
                                            <div>
                                                <p className="font-mono text-sm text-slate-600">{s.id}</p>
                                                <p className="font-semibold text-slate-800">{s.recipientName}</p>
                                                <p className="text-sm text-slate-500">{s.toAddress.street}, {s.toAddress.zone}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleOpenPackagingModal('single', s)} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                                            <ArchiveBoxIcon className="w-5 h-5" /> Package Shipment
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="text-center py-12 text-slate-500">No shipments are waiting for packaging.</div>)}
                    </div>
                )}
                
                {activeTab === 'assignment' && (
                     <div className="p-4 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-blue-800">Auto-Assignment</h3>
                                <p className="text-sm text-blue-700">{packagedAndWaiting.length} shipments are packaged and ready to be assigned.</p>
                            </div>
                            <button onClick={handleAutoAssign} disabled={isAutoAssigning || packagedAndWaiting.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-400">
                                <TruckIcon className="w-5 h-5" /> {isAutoAssigning ? 'Assigning...' : 'Auto-Assign All'}
                            </button>
                        </div>
                         {selectedToAssignIds.length > 0 && (
                            <div className="sticky top-[81px] z-10 bg-primary-50 border border-primary-200 p-3 rounded-lg shadow flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="font-semibold text-primary-800">{selectedToAssignIds.length} shipments selected</div>
                                <div className="flex w-full sm:w-auto gap-2">
                                    <select value={bulkAssignCourierId} onChange={e => setBulkAssignCourierId(e.target.value)} className="flex-grow w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white">
                                        <option value="" disabled>Select courier...</option>
                                        {couriers.filter(c => canCourierReceiveAssignment(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={handleBulkAssign} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700">Assign</button>
                                </div>
                            </div>
                        )}
                         <div className="flex items-center gap-3">
                             <input type="checkbox" onChange={() => handleSelectAll('assign')} checked={selectedToAssignIds.length === assignableInList.length && assignableInList.length > 0} className="h-4 w-4 rounded" />
                             <label className="text-sm font-medium text-slate-600">Select all assignable</label>
                        </div>
                        {shipmentsToAssign.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsToAssign.map(s => {
                                    const availableCouriers = couriers.filter(c => (c.zones || []).includes(s.toAddress.zone) && canCourierReceiveAssignment(c.id));
                                    const isAssignable = s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT;
                                    return (
                                        <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 flex flex-col">
                                            <div className="flex gap-3">
                                                {isAssignable && <input type="checkbox" checked={selectedToAssignIds.includes(s.id)} onChange={() => handleToggleSelect(s.id, 'assign')} className="mt-1 h-4 w-4 rounded" />}
                                                <div className="flex-1">
                                                    <p className="font-mono text-sm text-slate-600">{s.id}</p>
                                                    <p className="font-semibold text-slate-800">{s.recipientName}</p>
                                                    {s.courierId && <p className="text-sm text-slate-500">Current Courier: <span className="font-semibold">{getCourierName(s.courierId)}</span></p>}
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{s.toAddress.zone}</span>
                                                </div>
                                            </div>
                                            <div className="flex-grow"></div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700 mb-1 block">{s.courierId ? 'Re-assign To' : 'Assign To'}</label>
                                                <select defaultValue={s.courierId || ""} onChange={(e) => handleAssign(s.id, e.target.value)} data-shipment-id={s.id} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white">
                                                    <option value="" disabled>Select available courier...</option>
                                                    {availableCouriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    {availableCouriers.length === 0 && (<option value="" disabled>No couriers in {s.toAddress.zone}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (<div className="text-center py-12 text-slate-500">No shipments are available for assignment.</div>)}
                    </div>
                )}
            </div>

            <Modal isOpen={isPackagingModalOpen} onClose={() => setPackagingModalOpen(false)} title={packagingMode === 'bulk' ? 'Package Selected Shipments (Mixed Batch)' : 'Package Shipment'}>
                {packagingMode === 'single' ? (
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Label</label>
                            <input type="text" value="1 x Shipping Label (Required)" disabled className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Box Size</label>
                            <div className="grid grid-cols-3 gap-2">
                               {boxItems.map(box => (
                                   <button key={box.id} type="button" onClick={() => setSelectedBoxId(box.id)} className={`p-3 border-2 rounded-lg text-center ${selectedBoxId === box.id ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400'}`}>
                                       <span className="font-semibold">{box.name.replace(' Cardboard Box', '')}</span>
                                       <span className="text-xs block text-slate-500">{box.quantity} in stock</span>
                                   </button>
                               ))}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={useBubbleWrap} onChange={(e) => setUseBubbleWrap(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                <div>
                                    <span className="font-medium text-slate-700">Use Bubble Wrap?</span>
                                    <span className="text-xs block text-slate-500">{bubbleWrapItem?.quantity || 0} rolls in stock</span>
                                </div>
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Packaging Notes (Optional)</label>
                            <textarea value={packagingNotes} onChange={e => setPackagingNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" rows={3}></textarea>
                        </div>
                    </div>
                ) : (
                    // New UI for Mixed-Batch Packaging
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">Enter the total quantity of each material used for the <strong>{selectedToPackageIds.length}</strong> selected shipments. Labels will be added automatically.</p>
                        
                        <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-slate-50 border rounded-lg">
                            {[...boxItems, ...otherPackagingItems].map(item => (
                                <div key={item.id} className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor={item.id} className="font-medium text-slate-700 text-sm">{item.name}</label>
                                    <input 
                                        id={item.id} 
                                        type="number" 
                                        value={materialsSummary[item.id] || 0} 
                                        onChange={e => handleSummaryChange(item.id, parseInt(e.target.value))} 
                                        className="w-full p-2 border border-slate-300 rounded-md" 
                                        min="0"
                                    />
                                    <span className="text-xs text-slate-500">In Stock: {item.quantity}</span>
                                </div>
                            ))}
                        </div>

                        <div className={`p-3 rounded-lg text-sm font-semibold text-center ${totalBoxesInSummary === selectedToPackageIds.length ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Total Boxes Entered: {totalBoxesInSummary} / {selectedToPackageIds.length} Shipments Selected
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Packaging Notes (Optional)</label>
                            <textarea value={packagingNotes} onChange={e => setPackagingNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" rows={3} placeholder="These notes will be applied to all selected shipments."></textarea>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button onClick={() => setPackagingModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold">Cancel</button>
                    <button onClick={handleSavePackaging} disabled={packagingMode === 'bulk' && totalBoxesInSummary !== selectedToPackageIds.length} className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400">Confirm Packaging</button>
                </div>
            </Modal>
        </div>
    );
}