
import React, { useState, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, PaymentMethod } from '../types';
import { BarcodeScanner } from '../components/common/BarcodeScanner';
import { PhotoCapture } from '../components/common/PhotoCapture';
import { Modal } from '../components/common/Modal';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { StatCard } from '../components/common/StatCard';
import { QrcodeIcon, ReplyIcon, WalletIcon, CurrencyDollarIcon, PackageIcon, CheckCircleIcon } from '../components/Icons';

const CourierTasks = () => {
    const { currentUser, shipments, updateShipmentStatus, addToast } = useAppContext();
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isSignatureModalOpen, setSignatureModalOpen] = useState(false);
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
    const [isFailureModalOpen, setFailureModalOpen] = useState(false);
    const [failureShipment, setFailureShipment] = useState<Shipment | null>(null);
    const [failureReason, setFailureReason] = useState('');
    const shipmentTaskRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

    if (!currentUser) return null;
    
    // Filter shipments for current courier
    const myDeliveryTasks = shipments.filter(s => s.courierId === currentUser.id && [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status));
    const myReturnTasks = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.RETURN_IN_PROGRESS);
    const myDeliveredShipments = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.DELIVERED);
    
    // Calculate financial metrics
    const totalCashToCollect = myDeliveryTasks
        .filter(s => s.paymentMethod === PaymentMethod.COD)
        .reduce((sum, s) => sum + s.price, 0);
    
    const totalCommissionEarned = myDeliveredShipments
        .reduce((sum, s) => sum + (s.courierCommission || 0), 0);
    
    const pendingDeliveries = myDeliveryTasks.length;
    
    // Calculate daily delivery chart data (last 30 days)
    const deliveryByDay: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        deliveryByDay[dateString] = 0;
    }

    myDeliveredShipments.forEach(s => {
        if(s.deliveryDate) {
            const dateString = s.deliveryDate.split('T')[0];
            if(deliveryByDay.hasOwnProperty(dateString)) {
                deliveryByDay[dateString]++;
            }
        }
    });
    
    const chartData = Object.entries(deliveryByDay).map(([date, count]) => ({
        date: new Date(date).getDate().toString(),
        count
    }));
    const maxDeliveries = Math.max(...chartData.map(d => d.count), 1);

    const handleUpdateStatus = (shipmentId: string, status: ShipmentStatus) => {
        updateShipmentStatus(shipmentId, status);
    };
    
    const handleStartDelivery = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setSignatureModalOpen(true);
    };

    const handleSavePhoto = (photo: string) => {
        if(selectedShipment){
            updateShipmentStatus(selectedShipment.id, ShipmentStatus.DELIVERED, { deliveryPhoto: photo });
        }
        setSignatureModalOpen(false);
        setSelectedShipment(null);
    };

    const handleStartFailure = (shipment: Shipment) => {
        setFailureShipment(shipment);
        setFailureReason('');
        setFailureModalOpen(true);
    };

    const handleSaveFailure = () => {
        if(failureShipment && failureReason.trim()){
            updateShipmentStatus(failureShipment.id, ShipmentStatus.DELIVERY_FAILED, { failureReason: failureReason.trim() });
            setFailureModalOpen(false);
            setFailureShipment(null);
            setFailureReason('');
        }
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
                                <button onClick={() => handleStartFailure(task)} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition w-full md:w-auto">
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

            {/* Courier Dashboard KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Cash to Collect" 
                    value={`${totalCashToCollect.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#f97316"
                    subtitle={`${myDeliveryTasks.filter(s => s.paymentMethod === PaymentMethod.COD).length} COD packages`}
                />
                <StatCard 
                    title="Commission Earned" 
                    value={`${totalCommissionEarned.toFixed(2)} EGP`} 
                    icon={<CurrencyDollarIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle={`From ${myDeliveredShipments.length} deliveries`}
                />
                <StatCard 
                    title="Pending Deliveries" 
                    value={pendingDeliveries} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#3b82f6"
                    subtitle="Currently assigned"
                />
                <StatCard 
                    title="Total Deliveries" 
                    value={myDeliveredShipments.length} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#8b5cf6"
                    subtitle="All time completed"
                />
            </div>

            {/* Performance Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Performance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{myDeliveredShipments.length}</div>
                        <div className="text-sm text-slate-600">Total Deliveries</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{pendingDeliveries}</div>
                        <div className="text-sm text-slate-600">Pending Deliveries</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">{myDeliveryTasks.filter(s => s.paymentMethod === PaymentMethod.COD).length}</div>
                        <div className="text-sm text-slate-600">COD Packages</div>
                    </div>
                </div>
            </div>

            {/* Daily Deliveries Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Daily Deliveries (Last 30 Days)</h3>
                <div className="h-64 flex items-end gap-2 border-l border-b border-slate-200 pl-4 pb-4">
                   {chartData.map(({ date, count }) => (
                       <div key={date} className="flex-1 h-full flex flex-col justify-end items-center group">
                            <div 
                                className="w-full bg-primary-400 hover:bg-primary-500 transition-colors rounded-t-md relative"
                                style={{ height: `${(count / maxDeliveries) * 100}%` }}
                                title={`Day ${date}: ${count} deliveries`}
                            >
                                {count > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                        {count}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-slate-500 mt-1">{date}</span>
                       </div>
                   ))}
                </div>
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

             <Modal isOpen={isSignatureModalOpen} onClose={() => setSignatureModalOpen(false)} title="Capture Photo for Proof of Delivery">
                {selectedShipment && <PhotoCapture onSave={handleSavePhoto} />}
            </Modal>
             <Modal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} title="Scan Package Barcode">
                <div className="w-full h-96 flex justify-center items-center">
                   {isScannerOpen && <BarcodeScanner onScanSuccess={handleScanSuccess} />}
                </div>
            </Modal>
             <Modal isOpen={isFailureModalOpen} onClose={() => setFailureModalOpen(false)} title="Delivery Failed - Please Provide Reason">
                {failureShipment && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="font-semibold">Shipment: {failureShipment.id}</p>
                            <p className="text-sm text-slate-600">To: {failureShipment.recipientName}</p>
                            <p className="text-sm text-slate-600">{failureShipment.toAddress.street}, {failureShipment.toAddress.zone}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Reason for delivery failure *
                            </label>
                            <textarea
                                value={failureReason}
                                onChange={(e) => setFailureReason(e.target.value)}
                                placeholder="Please explain why the delivery could not be completed..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
                                rows={3}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setFailureModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveFailure}
                                disabled={!failureReason.trim()}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                Mark as Failed
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CourierTasks;
