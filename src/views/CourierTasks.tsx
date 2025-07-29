
import React, { useState, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus } from '../types';
import { BarcodeScanner } from '../components/common/BarcodeScanner';
import { SignaturePad } from '../components/common/SignaturePad';
import { Modal } from '../components/common/Modal';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { QrcodeIcon, ReplyIcon } from '../components/Icons';

const CourierTasks = () => {
    const { currentUser, shipments, updateShipmentStatus, addToast } = useAppContext();
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isSignatureModalOpen, setSignatureModalOpen] = useState(false);
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
    const shipmentTaskRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

    if (!currentUser) return null;
    const myDeliveryTasks = shipments.filter(s => s.courierId === currentUser.id && [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status));
    const myReturnTasks = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.RETURN_IN_PROGRESS);

    const handleUpdateStatus = (shipmentId: string, status: ShipmentStatus) => {
        updateShipmentStatus(shipmentId, status);
    };
    
    const handleStartDelivery = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setSignatureModalOpen(true);
    };

    const handleSaveSignature = (signature: string) => {
        if(selectedShipment){
            updateShipmentStatus(selectedShipment.id, ShipmentStatus.DELIVERED, { signature });
        }
        setSignatureModalOpen(false);
        setSelectedShipment(null);
    };

    const handleScanSuccess = useCallback((decodedText: string) => {
        setScannerOpen(false);
        const allTasks = [...myDeliveryTasks, ...myReturnTasks];
        const foundTask = allTasks.find(t => t.id === decodedText);

        if(foundTask) {
            addToast(`Scanned: ${decodedText}. Task is ready.`, 'success');
            const taskElement = shipmentTaskRefs.current[decodedText];
            if(taskElement) {
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedTask(decodedText);
                setTimeout(() => setHighlightedTask(null), 3000); // Remove highlight after 3s
            }
        } else {
            addToast(`Scanned code ${decodedText} not found in your current tasks.`, 'error');
        }
    }, [myDeliveryTasks, myReturnTasks, addToast]);

    const nextAction: Record<ShipmentStatus, { label: string; nextStatus: ShipmentStatus } | null> = {
        [ShipmentStatus.ASSIGNED_TO_COURIER]: null, // Not used anymore - packages go directly to IN_TRANSIT
        [ShipmentStatus.PICKED_UP]: null, // Not used anymore
        [ShipmentStatus.IN_TRANSIT]: { label: 'Mark Out for Delivery', nextStatus: ShipmentStatus.OUT_FOR_DELIVERY },
        [ShipmentStatus.OUT_FOR_DELIVERY]: null, // Special case with two buttons
        [ShipmentStatus.PENDING_ASSIGNMENT]: null,
        [ShipmentStatus.DELIVERED]: null,
        [ShipmentStatus.DELIVERY_FAILED]: null,
        [ShipmentStatus.RETURN_REQUESTED]: null,
        [ShipmentStatus.RETURN_IN_PROGRESS]: null, // Special case
        [ShipmentStatus.RETURNED]: null,
    };
    
    const TaskCard: React.FC<{task: Shipment, isReturn?: boolean}> = ({ task, isReturn = false }) => (
         <div className={`bg-white rounded-xl shadow-sm p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isReturn ? 'border-l-4 border-orange-500' : ''}`}>
            <div>
                <p className="font-mono text-sm text-slate-500 flex items-center gap-2">{isReturn && <ReplyIcon className="w-4 h-4 text-orange-600" />} {task.id}</p>
                <p className="text-lg font-bold text-slate-800">{isReturn ? `Return from: ${task.recipientName}` : `Deliver to: ${task.recipientName}`}</p>
                <p className="text-slate-600">{task.toAddress.street}, {task.toAddress.zone}</p>
                 <p className="text-sm font-semibold text-slate-700 mt-1">Payment: {task.paymentMethod} ({task.price} EGP)</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                <div className="flex-grow"><ShipmentStatusBadge status={task.status} /></div>
                {isReturn ? (
                    <button onClick={() => handleUpdateStatus(task.id, ShipmentStatus.RETURNED)} className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition w-full md:w-auto">
                        Confirm Return Pickup
                    </button>
                ) : (
                    <>
                        {nextAction[task.status] && (
                            <button onClick={() => handleUpdateStatus(task.id, nextAction[task.status]!.nextStatus)} className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition w-full md:w-auto">
                               {nextAction[task.status]!.label}
                            </button>
                        )}
                        {task.status === ShipmentStatus.OUT_FOR_DELIVERY && (
                            <>
                                <button onClick={() => handleStartDelivery(task)} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition w-full md:w-auto">
                                    Mark as Delivered
                                </button>
                                <button onClick={() => handleUpdateStatus(task.id, ShipmentStatus.DELIVERY_FAILED)} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition w-full md:w-auto">
                                    Delivery Failed
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
    
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">My Delivery Tasks</h2>
                <button 
                    onClick={() => setScannerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
                >
                    <QrcodeIcon className="w-5 h-5"/>
                    Scan Package
                </button>
            </div>
             <div className="space-y-4">
                {myDeliveryTasks.length === 0 && <p className="text-slate-500 bg-white p-4 rounded-lg">You have no active delivery tasks.</p>}
                {myDeliveryTasks.map(task => (
                    <div 
                        key={task.id} 
                        ref={el => { shipmentTaskRefs.current[task.id] = el; }}
                        className={`rounded-xl transition-all duration-500 ${highlightedTask === task.id ? 'ring-4 ring-primary-400 ring-offset-2' : ''}`}
                    >
                        <TaskCard task={task} />
                    </div>
                ))}
            </div>
            
            <div>
                 <h2 className="text-2xl font-bold text-slate-800">My Return Tasks</h2>
                 <div className="space-y-4 mt-4">
                    {myReturnTasks.length === 0 && <p className="text-slate-500 bg-white p-4 rounded-lg">You have no active return tasks.</p>}
                    {myReturnTasks.map(task => (
                        <div 
                            key={task.id} 
                            ref={el => { shipmentTaskRefs.current[task.id] = el; }}
                            className={`rounded-xl transition-all duration-500 ${highlightedTask === task.id ? 'ring-4 ring-primary-400 ring-offset-2' : ''}`}
                        >
                            <TaskCard task={task} isReturn />
                        </div>
                    ))}
                </div>
            </div>

             <Modal isOpen={isSignatureModalOpen} onClose={() => setSignatureModalOpen(false)} title="Capture Signature for Proof of Delivery">
                {selectedShipment && <SignaturePad onSave={handleSaveSignature} />}
            </Modal>
             <Modal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} title="Scan Package Barcode">
                <div className="w-full h-96 flex justify-center items-center">
                   {isScannerOpen && <BarcodeScanner onScanSuccess={handleScanSuccess} />}
                </div>
            </Modal>
        </div>
    );
};

export default CourierTasks;
