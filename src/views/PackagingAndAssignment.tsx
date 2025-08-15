// src/views/PackagingAndAssignment.tsx

import React, { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, UserRole, PackagingLogEntry, ZONES } from '../types';
import { Modal } from '../components/common/Modal';
import { ArchiveBoxIcon, TruckIcon, PrinterIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

interface PackagingAndAssignmentProps {
    setLabelShipment: Dispatch<SetStateAction<Shipment | null>>;
}

export default function PackagingAndAssignment({ setLabelShipment }: PackagingAndAssignmentProps) {
    const { 
        shipments, users, assignShipmentToCourier, canCourierReceiveAssignment, addToast, 
        inventoryItems, updateShipmentPackaging, getCourierName, autoAssignShipments,
        bulkPackageShipments, bulkAssignShipments, updateShipmentStatus, bulkUpdateShipmentStatus
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<'packaging' | 'assignment' | 'transit' | 'delivery'>('packaging');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedZone, setSelectedZone] = useState<string>('all');
    const [searchId, setSearchId] = useState<string>('');
    const [selectedCourierId, setSelectedCourierId] = useState<string>('all');
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    
    const [isPackagingModalOpen, setPackagingModalOpen] = useState(false);
    const [packagingMode, setPackagingMode] = useState<'single' | 'bulk'>('single');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [packagingNotes, setPackagingNotes] = useState('');
    
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

    const [selectedToPackageIds, setSelectedToPackageIds] = useState<string[]>([]);
    const [selectedToAssignIds, setSelectedToAssignIds] = useState<string[]>([]);
    const [selectedForTransitIds, setSelectedForTransitIds] = useState<string[]>([]);
    const [selectedForDeliveryIds, setSelectedForDeliveryIds] = useState<string[]>([]);
    const [bulkAssignCourierId, setBulkAssignCourierId] = useState<string>('');

    const [materialsSummary, setMaterialsSummary] = useState<Record<string, number>>({});

    const couriers = users.filter(u => (u.roles || []).includes(UserRole.COURIER));
    const boxItems = inventoryItems.filter(i => i.name.toLowerCase().includes('box'));
    const labelItem = inventoryItems.find(i => i.name.toLowerCase().includes('label'));
    const otherPackagingItems = inventoryItems.filter(i => !i.name.toLowerCase().includes('box') && !i.name.toLowerCase().includes('label') && !i.name.toLowerCase().includes('bubble'));
    
    const allZones = useMemo(() => {
        const zoneSet = new Set<string>();
        Object.values(ZONES).forEach(gov => {
            if (Array.isArray(gov)) {
                gov.forEach(z => zoneSet.add(z));
            } else {
                Object.values(gov).forEach(cityZones => cityZones.forEach(z => zoneSet.add(z)));
            }
        });
        return Array.from(zoneSet).sort();
    }, []);

    const shipmentsToPackage = shipments
        .filter(s => s.status === ShipmentStatus.WAITING_FOR_PACKAGING)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate))
        .filter(s => !searchId.trim() || s.id.toLowerCase().includes(searchId.trim().toLowerCase()));

    const shipmentsToAssign = shipments
        .filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate))
        .filter(s => selectedZone === 'all' || s.toAddress.zone === selectedZone)
        .filter(s => !searchId.trim() || s.id.toLowerCase().includes(searchId.trim().toLowerCase()));
    
    const shipmentsForTransit = shipments
        .filter(s => s.status === ShipmentStatus.ASSIGNED_TO_COURIER)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate))
        .filter(s => !searchId.trim() || s.id.toLowerCase().includes(searchId.trim().toLowerCase()))
        .filter(s => selectedCourierId === 'all' || s.courierId === parseInt(selectedCourierId));
        
    const shipmentsForDelivery = shipments
        .filter(s => s.status === ShipmentStatus.IN_TRANSIT)
        .filter(s => !selectedDate || s.creationDate.startsWith(selectedDate))
        .filter(s => !searchId.trim() || s.id.toLowerCase().includes(searchId.trim().toLowerCase()))
        .filter(s => selectedCourierId === 'all' || s.courierId === parseInt(selectedCourierId));

    const handleOpenPackagingModal = (mode: 'single' | 'bulk', shipment?: Shipment) => {
        setPackagingMode(mode);
        setSelectedShipment(shipment || null);
        setPackagingNotes('');
        if (mode === 'bulk') {
            const initialSummary: Record<string, number> = {};
            inventoryItems.forEach(item => { if (item.id.startsWith('inv_')) { initialSummary[item.id] = 0; } });
            setMaterialsSummary(initialSummary);
        } else {
             setSelectedBoxId(null);
        }
        setPackagingModalOpen(true);
    };

    const handleSaveBulkPackaging = () => {
        const totalBoxes = Object.entries(materialsSummary).filter(([key]) => key.startsWith('inv_box_')).reduce((sum, [, value]) => sum + value, 0);
        if (totalBoxes !== selectedToPackageIds.length) {
            addToast(`Box count (${totalBoxes}) must match selected shipments (${selectedToPackageIds.length}).`, 'error');
            return;
        }
        const finalSummary = { ...materialsSummary };
        if (labelItem) { finalSummary[labelItem.id] = (finalSummary[labelItem.id] || 0) + selectedToPackageIds.length; } 
        else { addToast('Shipping Label item not found in inventory.', 'error'); return; }
        bulkPackageShipments(selectedToPackageIds, finalSummary, packagingNotes);
        setSelectedToPackageIds([]);
        setPackagingModalOpen(false);
    };

    const handleSavePackaging = () => {
        if (packagingMode === 'bulk') { handleSaveBulkPackaging(); return; }
        const packagingLog: PackagingLogEntry[] = [];
        if (labelItem) { packagingLog.push({ inventoryItemId: labelItem.id, itemName: labelItem.name, quantityUsed: 1 }); } 
        else { addToast('Shipping Label is out of stock.', 'error'); return; }
        if (selectedBoxId) {
            const box = boxItems.find(b => b.id === selectedBoxId);
            if (box) { packagingLog.push({ inventoryItemId: box.id, itemName: box.name, quantityUsed: 1 }); }
        } else { addToast('Please select a box size.', 'error'); return; }
        if (selectedShipment) { updateShipmentPackaging(selectedShipment.id, packagingLog, packagingNotes); }
        setPackagingModalOpen(false);
    };

    const handleAssign = async (shipmentId: string, courierId: string) => {
        if (!courierId) { addToast('Please select a courier', 'error'); return; }
        await assignShipmentToCourier(shipmentId, parseInt(courierId));
    };

    const handleAutoAssign = async () => { setIsAutoAssigning(true); await autoAssignShipments(); setIsAutoAssigning(false); };

    const handleBulkAssign = () => {
        if (selectedToAssignIds.length === 0 || !bulkAssignCourierId) { addToast('Please select shipments and a courier.', 'error'); return; }
        const courierIdNum = parseInt(bulkAssignCourierId);
        if (!canCourierReceiveAssignment(courierIdNum)) { addToast('Selected courier is restricted.', 'error'); return; }
        bulkAssignShipments(selectedToAssignIds, courierIdNum);
        setSelectedToAssignIds([]);
        setBulkAssignCourierId('');
    };
    
    const handleBulkStatusUpdate = (ids: string[], status: ShipmentStatus) => {
        bulkUpdateShipmentStatus(ids, status);
        if (status === ShipmentStatus.IN_TRANSIT) setSelectedForTransitIds([]);
        if (status === ShipmentStatus.OUT_FOR_DELIVERY) setSelectedForDeliveryIds([]);
    };

    const handleToggleSelect = (id: string, type: 'package' | 'assign' | 'transit' | 'delivery') => {
        const setters = {
            package: setSelectedToPackageIds, assign: setSelectedToAssignIds,
            transit: setSelectedForTransitIds, delivery: setSelectedForDeliveryIds,
        };
        setters[type](prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (type: 'package' | 'assign' | 'transit' | 'delivery') => {
        const lists = {
            package: shipmentsToPackage, assign: shipmentsToAssign,
            transit: shipmentsForTransit, delivery: shipmentsForDelivery,
        };
        const selections = {
            package: selectedToPackageIds, assign: selectedToAssignIds,
            transit: selectedForTransitIds, delivery: selectedForDeliveryIds,
        };
        const setter = {
            package: setSelectedToPackageIds, assign: setSelectedToAssignIds,
            transit: setSelectedForTransitIds, delivery: setSelectedForDeliveryIds,
        }[type];

        setter(selections[type].length === lists[type].length ? [] : lists[type].map(s => s.id));
    };

    const handleSummaryChange = (itemId: string, quantity: number) => { setMaterialsSummary(prev => ({ ...prev, [itemId]: Math.max(0, quantity) })); };
    
    const handleExport = () => {
        let dataToExport: Shipment[] = [];
        let fileName = 'Shipment_Report';
        let headers: string[] = ['ID', 'Client', 'Recipient', 'Phone', 'Zone', 'Status', 'Creation Date'];

        switch (activeTab) {
            case 'packaging':
                dataToExport = shipmentsToPackage;
                fileName = 'Waiting_for_Packaging';
                break;
            case 'assignment':
                dataToExport = shipmentsToAssign;
                fileName = 'Waiting_for_Assignment';
                break;
            case 'transit':
                dataToExport = shipmentsForTransit;
                fileName = 'Waiting_for_In_Transit';
                headers.push('Courier');
                break;
            case 'delivery':
                dataToExport = shipmentsForDelivery;
                fileName = 'Waiting_for_Out_for_Delivery';
                headers.push('Courier');
                break;
        }

        if (dataToExport.length === 0) {
            addToast('No data to export for the current view.', 'info');
            return;
        }

        const body = dataToExport.map(s => {
            const row: (string | number | undefined)[] = [
                s.id,
                s.clientName,
                s.recipientName,
                s.recipientPhone,
                s.toAddress.zone,
                s.status,
                new Date(s.creationDate).toLocaleString()
            ];
            if (activeTab !== 'packaging') {
                row.push(getCourierName(s.courierId));
            }
            return row;
        });

        exportToCsv(headers, body, fileName);
    };

    const totalBoxesInSummary = useMemo(() => Object.entries(materialsSummary).filter(([key]) => key.startsWith('inv_box_')).reduce((sum, [, value]) => sum + value, 0), [materialsSummary]);
    
    const TabButton: React.FC<{ label: string; count: number; isActive: boolean; onClick: () => void; }> = ({ label, count, isActive, onClick }) => (
        <button onClick={onClick} className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            {label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
        </button>
    );

    const ShipmentCard: React.FC<{ shipment: Shipment, children: React.ReactNode, onSelect: () => void, isSelected: boolean, showCheckbox?: boolean }> = ({ shipment, children, onSelect, isSelected, showCheckbox=true }) => (
         <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex gap-3">
                {showCheckbox && <input type="checkbox" checked={isSelected} onChange={onSelect} className="mt-1 h-4 w-4 rounded" />}
                <div>
                    <p className="font-mono text-sm text-slate-600">{shipment.id}</p>
                    <p className="font-semibold text-slate-800">{shipment.recipientName}</p>
                    <p className="text-sm text-slate-500">{shipment.toAddress.street}, {shipment.toAddress.zone}</p>
                    {shipment.courierId && <p className="text-sm text-slate-500 mt-1">Courier: <span className="font-semibold">{getCourierName(shipment.courierId)}</span></p>}
                </div>
            </div>
            <div className="mt-4">{children}</div>
        </div>
    );
    
    const BulkActionBar: React.FC<{ count: number; children: React.ReactNode }> = ({ count, children }) => (
         <div className="sticky top-[81px] z-10 bg-primary-50 border border-primary-200 p-3 rounded-lg shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="font-semibold text-primary-800">{count} shipments selected</div>
            {children}
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div>
                 <h1 className="text-3xl font-bold text-slate-800">Packaging & Assignment</h1>
                 <p className="text-slate-500 mt-1">Prepare shipments for delivery and assign them to couriers.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
                 <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 flex-wrap">
                    <div className="flex border-b border-slate-200 -m-4 mb-0 overflow-x-auto">
                         <TabButton label="Waiting for Packaging" count={shipmentsToPackage.length} isActive={activeTab === 'packaging'} onClick={() => setActiveTab('packaging')} />
                         <TabButton label="Waiting for Assignment" count={shipmentsToAssign.length} isActive={activeTab === 'assignment'} onClick={() => setActiveTab('assignment')} />
                         <TabButton label="Waiting for In Transit" count={shipmentsForTransit.length} isActive={activeTab === 'transit'} onClick={() => setActiveTab('transit')} />
                         <TabButton label="Waiting for Out for Delivery" count={shipmentsForDelivery.length} isActive={activeTab === 'delivery'} onClick={() => setActiveTab('delivery')} />
                    </div>
                     <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                        <input 
                            type="text"
                            placeholder="Search by Shipment ID..."
                            value={searchId}
                            onChange={e => setSearchId(e.target.value)}
                            className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                        {activeTab === 'assignment' && (
                             <select 
                                value={selectedZone} 
                                onChange={e => setSelectedZone(e.target.value)}
                                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                            >
                                <option value="all">All Zones</option>
                                {allZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                            </select>
                        )}
                        {(activeTab === 'transit' || activeTab === 'delivery') && (
                            <select
                                value={selectedCourierId}
                                onChange={e => setSelectedCourierId(e.target.value)}
                                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                            >
                                <option value="all">All Couriers</option>
                                {couriers.map(courier => <option key={courier.id} value={courier.id}>{courier.name}</option>)}
                            </select>
                        )}
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg" aria-label="Filter by creation date" />
                        {selectedDate && <button onClick={() => setSelectedDate('')} className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200" aria-label="Clear date filter">Clear</button>}
                        <button 
                            onClick={handleExport}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                            <DocumentDownloadIcon className="w-5 h-5"/>
                            Export CSV
                        </button>
                    </div>
                </div>
                
                {activeTab === 'packaging' && (
                    <div className="p-4 space-y-4">
                        {selectedToPackageIds.length > 0 && (
                            <BulkActionBar count={selectedToPackageIds.length}>
                                <button onClick={() => handleOpenPackagingModal('bulk')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                                    <ArchiveBoxIcon className="w-5 h-5" /> Package Selected
                                </button>
                            </BulkActionBar>
                        )}
                        <div className="flex items-center gap-3">
                             <input type="checkbox" onChange={() => handleSelectAll('package')} checked={selectedToPackageIds.length === shipmentsToPackage.length && shipmentsToPackage.length > 0} className="h-4 w-4 rounded" />
                             <label className="text-sm font-medium text-slate-600">Select all</label>
                        </div>
                        {shipmentsToPackage.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsToPackage.map(s => (
                                    <ShipmentCard key={s.id} shipment={s} onSelect={() => handleToggleSelect(s.id, 'package')} isSelected={selectedToPackageIds.includes(s.id)}>
                                        <button onClick={() => handleOpenPackagingModal('single', s)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                                            <ArchiveBoxIcon className="w-5 h-5" /> Package Shipment
                                        </button>
                                    </ShipmentCard>
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
                                <p className="text-sm text-blue-700">{shipmentsToAssign.length} shipments are packaged and ready to be assigned.</p>
                            </div>
                            <button onClick={handleAutoAssign} disabled={isAutoAssigning || shipmentsToAssign.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-400">
                                <TruckIcon className="w-5 h-5" /> {isAutoAssigning ? 'Assigning...' : 'Auto-Assign All'}
                            </button>
                        </div>
                         {selectedToAssignIds.length > 0 && (
                            <BulkActionBar count={selectedToAssignIds.length}>
                                <div className="flex w-full sm:w-auto gap-2">
                                    <select value={bulkAssignCourierId} onChange={e => setBulkAssignCourierId(e.target.value)} className="flex-grow w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white">
                                        <option value="" disabled>Select courier...</option>
                                        {couriers.filter(c => canCourierReceiveAssignment(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={handleBulkAssign} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700">Assign</button>
                                </div>
                            </BulkActionBar>
                        )}
                         <div className="flex items-center gap-3">
                             <input type="checkbox" onChange={() => handleSelectAll('assign')} checked={selectedToAssignIds.length === shipmentsToAssign.length && shipmentsToAssign.length > 0} className="h-4 w-4 rounded" />
                             <label className="text-sm font-medium text-slate-600">Select all</label>
                        </div>
                        {shipmentsToAssign.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsToAssign.map(s => (
                                    <ShipmentCard key={s.id} shipment={s} onSelect={() => handleToggleSelect(s.id, 'assign')} isSelected={selectedToAssignIds.includes(s.id)}>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setLabelShipment(s)} className="p-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition" title="Print Label">
                                                <PrinterIcon className="w-5 h-5" />
                                            </button>
                                            <select defaultValue="" onChange={(e) => handleAssign(s.id, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                                                <option value="" disabled>Assign to courier...</option>
                                                {couriers.filter(c => (c.zones || []).includes(s.toAddress.zone) && canCourierReceiveAssignment(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </ShipmentCard>
                                ))}
                            </div>
                        ) : (<div className="text-center py-12 text-slate-500">No shipments are waiting for assignment.</div>)}
                    </div>
                )}

                {activeTab === 'transit' && (
                    <div className="p-4 space-y-4">
                        {selectedForTransitIds.length > 0 && (
                            <BulkActionBar count={selectedForTransitIds.length}>
                                <button onClick={() => handleBulkStatusUpdate(selectedForTransitIds, ShipmentStatus.IN_TRANSIT)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                                    Mark Selected as In Transit
                                </button>
                            </BulkActionBar>
                        )}
                        <div className="flex items-center gap-3">
                             <input type="checkbox" onChange={() => handleSelectAll('transit')} checked={selectedForTransitIds.length === shipmentsForTransit.length && shipmentsForTransit.length > 0} className="h-4 w-4 rounded" />
                             <label className="text-sm font-medium text-slate-600">Select all</label>
                        </div>
                        {shipmentsForTransit.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsForTransit.map(s => (
                                    <ShipmentCard key={s.id} shipment={s} onSelect={() => handleToggleSelect(s.id, 'transit')} isSelected={selectedForTransitIds.includes(s.id)}>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setLabelShipment(s)} className="p-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition" title="Print Label">
                                                <PrinterIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => updateShipmentStatus(s.id, ShipmentStatus.IN_TRANSIT)} className="flex-grow w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                                                Mark In Transit
                                            </button>
                                        </div>
                                    </ShipmentCard>
                                ))}
                            </div>
                        ) : (<div className="text-center py-12 text-slate-500">No shipments are waiting to be marked as "In Transit".</div>)}
                    </div>
                )}

                {activeTab === 'delivery' && (
                    <div className="p-4 space-y-4">
                        {selectedForDeliveryIds.length > 0 && (
                            <BulkActionBar count={selectedForDeliveryIds.length}>
                                <button onClick={() => handleBulkStatusUpdate(selectedForDeliveryIds, ShipmentStatus.OUT_FOR_DELIVERY)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition">
                                    Mark Selected as Out for Delivery
                                </button>
                            </BulkActionBar>
                        )}
                         <div className="flex items-center gap-3">
                             <input type="checkbox" onChange={() => handleSelectAll('delivery')} checked={selectedForDeliveryIds.length === shipmentsForDelivery.length && shipmentsForDelivery.length > 0} className="h-4 w-4 rounded" />
                             <label className="text-sm font-medium text-slate-600">Select all</label>
                        </div>
                        {shipmentsForDelivery.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shipmentsForDelivery.map(s => (
                                    <ShipmentCard key={s.id} shipment={s} onSelect={() => handleToggleSelect(s.id, 'delivery')} isSelected={selectedForDeliveryIds.includes(s.id)}>
                                         <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setLabelShipment(s)} className="p-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition" title="Print Label">
                                                <PrinterIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => updateShipmentStatus(s.id, ShipmentStatus.OUT_FOR_DELIVERY)} className="flex-grow w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition">
                                                Mark Out for Delivery
                                            </button>
                                        </div>
                                    </ShipmentCard>
                                ))}
                            </div>
                        ) : (<div className="text-center py-12 text-slate-500">No shipments are waiting to be marked as "Out for Delivery".</div>)}
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Packaging Notes (Optional)</label>
                            <textarea value={packagingNotes} onChange={e => setPackagingNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" rows={3}></textarea>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">Enter the total quantity of each material used for the <strong>{selectedToPackageIds.length}</strong> selected shipments. Labels will be added automatically.</p>
                        <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-slate-50 border rounded-lg">
                            {[...boxItems, ...otherPackagingItems].map(item => (
                                <div key={item.id} className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor={item.id} className="font-medium text-slate-700 text-sm">{item.name}</label>
                                    <input id={item.id} type="number" value={materialsSummary[item.id] || 0} onChange={e => handleSummaryChange(item.id, parseInt(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md" min="0"/>
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