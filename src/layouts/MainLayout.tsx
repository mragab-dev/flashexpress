

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, UserRole, ShipmentStatus } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../views/Dashboard';
import ShipmentsView from '../views/Shipments';
import CreateShipment from '../views/CreateShipment';
import AssignShipments from '../views/AssignShipments';
import CourierTasks from '../views/CourierTasks';
import UserManagement from '../views/UserManagement';
import ManageReturns from '../views/ManageReturns';
import Wallet from '../views/Wallet';
import Financials from '../views/Financials';
import NotificationsLog from '../views/NotificationsLog';
import Profile from '../views/Profile';
import CourierMapView from '../views/CourierMapView';
import { Modal } from '../components/common/Modal';
import { ShipmentLabel } from '../components/common/ShipmentLabel';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { PrinterIcon, ReplyIcon, SwitchHorizontalIcon } from '../components/Icons';

const MainLayout: React.FC = () => {
    const { currentUser, logout, users, updateShipmentStatus, reassignCourier } = useAppContext();
    const [activeView, setActiveView] = useState('dashboard');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [labelShipment, setLabelShipment] = useState<Shipment | null>(null);
    const [returnShipment, setReturnShipment] = useState<Shipment | null>(null);
    
    const [isReassigning, setIsReassigning] = useState(false);
    const [newCourierId, setNewCourierId] = useState<number | null>(null);

    const handleModalClose = () => {
        setSelectedShipment(null);
        setIsReassigning(false);
        setNewCourierId(null);
    }

    const handleReassignConfirm = () => {
        if (selectedShipment && newCourierId) {
            reassignCourier(selectedShipment.id, newCourierId);
            handleModalClose();
        }
    };

    useEffect(() => {
        if(labelShipment){
            document.body.classList.add('printing-label');
        } else {
            document.body.classList.remove('printing-label');
        }
        return () => document.body.classList.remove('printing-label');
    }, [labelShipment])

    if (!currentUser) return null;
    
    const handlePrint = () => {
        window.print();
    }
    
    const handleRequestReturn = () => {
        if(returnShipment) {
            updateShipmentStatus(returnShipment.id, ShipmentStatus.RETURN_REQUESTED);
        }
        setReturnShipment(null);
    };

    const renderActiveView = () => {
        switch (activeView) {
            case 'dashboard': return <Dashboard setActiveView={setActiveView} />;
            case 'shipments': return <ShipmentsView onSelectShipment={setSelectedShipment} />;
            case 'create': return <CreateShipment />;
            case 'assign': return <AssignShipments />;
            case 'tasks': return <CourierTasks />;
            case 'users': return <UserManagement />;
            case 'returns': return <ManageReturns />;
            case 'wallet': return <Wallet />;
            case 'financials': return <Financials />;
            case 'notifications': return <NotificationsLog />;
            case 'profile': return <Profile />;
            case 'map': return <CourierMapView />;
            default: return <Dashboard setActiveView={setActiveView} />;
        }
    }

    return (
        <div className="flex h-screen bg-slate-100">
            <Sidebar role={currentUser.role} activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onLogout={logout} user={currentUser} onNavigate={setActiveView} />
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {renderActiveView()}
                </main>
            </div>
            <Modal isOpen={!!selectedShipment} onClose={handleModalClose} title={`Shipment Details: ${selectedShipment?.id}`}>
                {selectedShipment && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                             <div>
                                <p className="mb-1"><strong>Status:</strong> <ShipmentStatusBadge status={selectedShipment.status} /></p>
                                <p className="text-sm text-slate-600"><strong>From:</strong> {selectedShipment.fromAddress.street}, {selectedShipment.fromAddress.city}</p>
                                <p className="text-sm text-slate-600"><strong>To:</strong> {selectedShipment.toAddress.street}, {selectedShipment.toAddress.city}</p>
                                <p className="text-sm text-slate-600"><strong>Courier:</strong> {users.find(u => u.id === selectedShipment.courierId)?.name || 'Not Assigned'}</p>
                            </div>
                            <div className="flex flex-col gap-2 items-end flex-shrink-0">
                                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CLIENT) && (
                                    <button onClick={() => setLabelShipment(selectedShipment)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition w-full justify-center text-sm">
                                        <PrinterIcon className="w-5 h-5"/>
                                        Print Label
                                    </button>
                                )}
                                {currentUser.role === UserRole.CLIENT && selectedShipment.status === ShipmentStatus.DELIVERED && (
                                     <button onClick={() => setReturnShipment(selectedShipment)} className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-800 font-semibold rounded-lg hover:bg-orange-200 transition w-full justify-center text-sm">
                                        <ReplyIcon className="w-5 h-5"/>
                                        Request Return
                                    </button>
                                )}
                            </div>
                        </div>
                        {selectedShipment.signature && (
                            <div>
                                <strong>Signature:</strong>
                                <img src={selectedShipment.signature} alt="Recipient Signature" className="border rounded-lg mt-2"/>
                            </div>
                        )}
                        {currentUser.role === UserRole.ADMIN && selectedShipment.courierId && ![ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.DELIVERY_FAILED].includes(selectedShipment.status) && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                {!isReassigning ? (
                                    <button onClick={() => setIsReassigning(true)} className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 font-semibold rounded-lg hover:bg-yellow-200 transition text-sm">
                                        <SwitchHorizontalIcon className="w-5 h-5"/>
                                        Re-assign Courier
                                    </button>
                                ) : (
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                                        <h4 className="font-semibold text-slate-700">Select new courier:</h4>
                                        <div className="flex gap-2">
                                            <select 
                                                onChange={(e) => setNewCourierId(parseInt(e.target.value))}
                                                defaultValue=""
                                                className="flex-grow px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="" disabled>Available Couriers...</option>
                                                {users.filter(u => u.role === UserRole.COURIER).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.zone})</option>
                                                ))}
                                            </select>
                                            <button onClick={handleReassignConfirm} disabled={!newCourierId} className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition disabled:bg-slate-400">Save</button>
                                            <button onClick={() => setIsReassigning(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
             <Modal isOpen={!!labelShipment} onClose={() => setLabelShipment(null)} title="Print Shipment Label" size="4xl">
                 {labelShipment && (
                    <div className="flex flex-col gap-6">
                        <ShipmentLabel shipment={labelShipment} />
                        <div className="flex justify-end gap-4 p-4 -mb-6 -mx-6 bg-slate-50 rounded-b-xl">
                           <button onClick={() => setLabelShipment(null)} className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold">
                               Close
                           </button>
                           <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                                <PrinterIcon className="w-5 h-5"/>
                                Print
                           </button>
                        </div>
                    </div>
                 )}
            </Modal>
             <Modal isOpen={!!returnShipment} onClose={() => setReturnShipment(null)} title="Confirm Return Request" size="md">
                 {returnShipment && (
                    <div>
                        <p>Are you sure you want to request a return for shipment <strong>{returnShipment.id}</strong>? A courier will be assigned to pick up the item from <strong>{returnShipment.recipientName}</strong>.</p>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setReturnShipment(null)} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Cancel</button>
                            <button onClick={handleRequestReturn} className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold">Confirm Request</button>
                        </div>
                    </div>
                 )}
            </Modal>
        </div>
    );
};

export default MainLayout;