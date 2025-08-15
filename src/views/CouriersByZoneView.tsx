// src/views/CouriersByZoneView.tsx

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Permission, UserRole, ZONES, ShipmentStatus, Shipment } from '../types';
import { TruckIcon, PhoneIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { Modal } from '../components/common/Modal';
import { ShipmentList } from '../components/specific/ShipmentList';

const CouriersByZoneView = () => {
    const { users, shipments, hasPermission } = useAppContext();
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [modalShipments, setModalShipments] = useState<Shipment[] | null>(null);
    const [modalTitle, setModalTitle] = useState('');

    if (!hasPermission(Permission.VIEW_COURIERS_BY_ZONE)) {
        return <div className="p-8 text-center">Access Denied.</div>;
    }

    const couriers = useMemo(() => users.filter(u => u.roles.includes(UserRole.COURIER)), [users]);
    const allZones = useMemo(() => {
        const zones = new Set<string>();
        couriers.forEach(c => (c.zones || []).forEach(z => zones.add(z)));
        return Array.from(zones).sort();
    }, [couriers]);

    const couriersInZone = useMemo(() => {
        if (!selectedZone) return [];
        return couriers
            .filter(c => (c.zones || []).includes(selectedZone))
            .map(courier => {
                const pendingTasks = shipments.filter(s => 
                    s.courierId === courier.id && 
                    [ShipmentStatus.ASSIGNED_TO_COURIER, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)
                ).length;
                
                const stats = { isRestricted: false }; // Simplified for now
                return { ...courier, pendingTasks, isRestricted: stats.isRestricted };
            });
    }, [selectedZone, couriers, shipments]);

    const handleViewTasks = (courierId: number, courierName: string) => {
        const tasks = shipments.filter(s => 
            s.courierId === courierId && 
            [ShipmentStatus.ASSIGNED_TO_COURIER, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)
        );
        setModalShipments(tasks);
        setModalTitle(`Pending Tasks for ${courierName}`);
    };

    const handleExport = () => {
        if (!selectedZone) return;
        const headers = ['Courier Name', 'Phone', 'Status', 'Pending Tasks'];
        const data = couriersInZone.map(c => [
            c.name,
            c.phone || 'N/A',
            c.isRestricted ? 'Restricted' : 'Active',
            c.pendingTasks
        ]);
        exportToCsv(headers, data, `Couriers_in_${selectedZone.replace(/\s/g, '_')}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Couriers by Zone</h1>
                    <p className="text-slate-500 mt-1">View available couriers and their workload in a specific zone.</p>
                </div>
                 <button 
                    onClick={handleExport}
                    disabled={!selectedZone}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-slate-400"
                >
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export CSV
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <label htmlFor="zone-select" className="block text-sm font-medium text-slate-700 mb-2">Select a Zone to View Couriers</label>
                <select 
                    id="zone-select"
                    value={selectedZone || ''} 
                    onChange={e => setSelectedZone(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                    <option value="" disabled>-- Select a Zone --</option>
                    {allZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                </select>
            </div>
            
            {!selectedZone ? (
                <div className="text-center py-16 text-slate-500 bg-white rounded-xl shadow-sm">
                    <TruckIcon className="w-16 h-16 mx-auto text-slate-300" />
                    <p className="mt-4 font-semibold">Please select a zone</p>
                    <p className="text-sm">Choose a zone from the dropdown to see assigned couriers.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800">Available Couriers in {selectedZone}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Courier</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Phone</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-medium text-slate-500 uppercase">Pending Tasks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {couriersInZone.map(courier => (
                                    <tr key={courier.id}>
                                        <td className="p-4 font-semibold">{courier.name}</td>
                                        <td className="p-4 text-sm text-slate-600">
                                            <a href={`tel:${courier.phone}`} className="flex items-center gap-2 hover:text-primary-600">
                                                <PhoneIcon className="w-4 h-4" />
                                                {courier.phone || 'N/A'}
                                            </a>
                                        </td>
                                        <td className="p-4">
                                            {courier.isRestricted ? 
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Restricted</span> : 
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                                            }
                                        </td>
                                        <td className="p-4 font-mono font-semibold text-center">
                                            <button
                                                onClick={() => handleViewTasks(courier.id, courier.name)}
                                                className="font-mono font-semibold text-primary-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                                                disabled={courier.pendingTasks === 0}
                                            >
                                                {courier.pendingTasks}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {couriersInZone.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                No couriers are assigned to this zone.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={!!modalShipments} onClose={() => setModalShipments(null)} title={modalTitle} size="4xl">
                <div className="max-h-[70vh] overflow-y-auto">
                    <ShipmentList shipments={modalShipments || []} />
                </div>
            </Modal>
        </div>
    );
};

export default CouriersByZoneView;