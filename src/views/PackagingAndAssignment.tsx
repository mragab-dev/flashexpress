

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, UserRole, PackagingLogEntry } from '../types';
import { Modal } from '../components/common/Modal';
import { ArchiveBoxIcon } from '../components/Icons';

export default function PackagingAndAssignment() {
    const { shipments, users, assignShipmentToCourier, canCourierReceiveAssignment, addToast, inventoryItems, updateShipmentPackaging } = useAppContext();
    const [activeTab, setActiveTab] = useState<'packaging' | 'assignment'>('packaging');
    const [selectedDate, setSelectedDate] = useState<string>('');
    
    // State for packaging modal
    const [isPackagingModalOpen, setPackagingModalOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [packagingNotes, setPackagingNotes] = useState('');
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const [useBubbleWrap, setUseBubbleWrap] = useState(false);

    const couriers = users.filter(u => (u.roles || []).includes(UserRole.COURIER));
    const boxItems = inventoryItems.filter(i => i.name.toLowerCase().includes('box'));
    const labelItem = inventoryItems.find(i => i.name.toLowerCase().includes('label'));
    const bubbleWrapItem = inventoryItems.find(i => i.name.toLowerCase().includes('bubble wrap'));

    const shipmentsToPackage = shipments
        .filter(s => s.status === ShipmentStatus.WAITING_FOR_PACKAGING)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate));
        
    const shipmentsToAssign = shipments
        .filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate));


    const handleOpenPackagingModal = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setPackagingNotes('');
        setSelectedBoxId(null);
        setUseBubbleWrap(false);
        setPackagingModalOpen(true);
    };

    const handleSavePackaging = () => {
        if (!selectedShipment) return;

        const packagingLog: PackagingLogEntry[] = [];
        
        // 1. Add required label
        if (labelItem) {
            packagingLog.push({ inventoryItemId: labelItem.id, itemName: labelItem.name, quantityUsed: 1 });
        } else {
            addToast('Shipping Label is not available in inventory. Please add it first.', 'error');
            return;
        }

        // 2. Add selected box
        if (selectedBoxId) {
            const box = boxItems.find(b => b.id === selectedBoxId);
            if (box) {
                packagingLog.push({ inventoryItemId: box.id, itemName: box.name, quantityUsed: 1 });
            }
        } else {
            addToast('Please select a box size.', 'error');
            return;
        }

        // 3. Add optional bubble wrap
        if (useBubbleWrap) {
             if (bubbleWrapItem) {
                packagingLog.push({ inventoryItemId: bubbleWrapItem.id, itemName: bubbleWrapItem.name, quantityUsed: 1 });
            } else {
                addToast('Bubble Wrap is not available in inventory.', 'error');
            }
        }
        
        updateShipmentPackaging(selectedShipment.id, packagingLog, packagingNotes);
        setPackagingModalOpen(false);
    };

    const handleAssign = async (shipmentId: string, courierId: string) => {
        if (!courierId) {
            addToast('Please select a courier', 'error');
            return;
        }
        
        try {
            const success = await assignShipmentToCourier(shipmentId, parseInt(courierId));
            if (success) {
                const selectElement = document.querySelector(`select[data-shipment-id="${shipmentId}"]`) as HTMLSelectElement;
                if (selectElement) {
                    selectElement.value = '';
                }
            }
        } catch (error) {
            addToast('Failed to assign shipment', 'error');
        }
    };
    
    const TabButton: React.FC<{
      label: string;
      count: number;
      isActive: boolean;
      onClick: () => void;
    }> = ({ label, count, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
                isActive
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
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
                         <TabButton label="Ready for Assignment" count={shipmentsToAssign.length} isActive={activeTab === 'assignment'} onClick={() => setActiveTab('assignment')} />
                    </div>
                     <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            aria-label="Filter by creation date"
                        />
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate('')}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200"
                                aria-label="Clear date filter"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                
                {activeTab === 'packaging' && (
                    <div className="p-4">
                        {shipmentsToPackage.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsToPackage.map(s => (
                                    <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
                                        <div>
                                            <p className="font-mono text-sm text-slate-600">{s.id}</p>
                                            <p className="font-semibold text-slate-800">{s.recipientName}</p>
                                            <p className="text-sm text-slate-500">{s.toAddress.street}, {s.toAddress.zone}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleOpenPackagingModal(s)}
                                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
                                        >
                                            <ArchiveBoxIcon className="w-5 h-5" />
                                            Package Shipment
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">No shipments are waiting for packaging.</div>
                        )}
                    </div>
                )}
                
                {activeTab === 'assignment' && (
                     <div className="p-4">
                        {shipmentsToAssign.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsToAssign.map(s => {
                                    const availableCouriers = couriers
                                        .filter(c => (c.zones || []).includes(s.toAddress.zone) && canCourierReceiveAssignment(c.id));

                                    return (
                                        <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                                            <p className="font-mono text-sm text-slate-600">{s.id}</p>
                                            <p className="font-semibold text-slate-800">{s.recipientName}</p>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{s.toAddress.zone}</span>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700 mb-1 block">Assign To</label>
                                                <select 
                                                    onChange={(e) => handleAssign(s.id, e.target.value)} 
                                                    defaultValue=""
                                                    data-shipment-id={s.id}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                                                >
                                                    <option value="" disabled>Select available courier...</option>
                                                    {availableCouriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    {availableCouriers.length === 0 && (
                                                        <option value="" disabled>No couriers in {s.toAddress.zone}</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">No packaged shipments are waiting for assignment.</div>
                        )}
                    </div>
                )}
            </div>

            <Modal isOpen={isPackagingModalOpen} onClose={() => setPackagingModalOpen(false)} title="Package Shipment">
                {selectedShipment && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Label</label>
                            <input type="text" value="1 x Shipping Label (Required)" disabled className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Box Size</label>
                            <div className="grid grid-cols-3 gap-2">
                               {boxItems.map(box => (
                                   <button 
                                      key={box.id}
                                      type="button"
                                      onClick={() => setSelectedBoxId(box.id)}
                                      className={`p-3 border-2 rounded-lg text-center ${selectedBoxId === box.id ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400'}`}
                                    >
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Packaging Notes</label>
                            <textarea value={packagingNotes} onChange={e => setPackagingNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" rows={3}></textarea>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setPackagingModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold">Cancel</button>
                            <button onClick={handleSavePackaging} className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700">Confirm Packaging</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
