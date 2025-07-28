
import React from 'react';
import { Shipment, ShipmentStatus } from '../../types';
import { ClipboardListIcon, UserCircleIcon, TruckIcon, MapIcon, CheckCircleIcon, XCircleIcon } from '../Icons';

const STATUS_ORDER: ShipmentStatus[] = [
    ShipmentStatus.PENDING_ASSIGNMENT,
    ShipmentStatus.ASSIGNED_TO_COURIER,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
];

const timelineSteps = [
    { status: ShipmentStatus.PENDING_ASSIGNMENT, icon: <ClipboardListIcon />, title: 'Shipment Created', description: 'The shipment request has been received.' },
    { status: ShipmentStatus.ASSIGNED_TO_COURIER, icon: <UserCircleIcon />, title: 'Courier Assigned', description: 'A courier is on their way to pick up the package.' },
    { status: ShipmentStatus.PICKED_UP, icon: <TruckIcon />, title: 'Picked Up', description: 'The courier has collected the package.' },
    { status: ShipmentStatus.IN_TRANSIT, icon: <TruckIcon />, title: 'In Transit', description: 'The package is on its way to the destination city.' },
    { status: ShipmentStatus.OUT_FOR_DELIVERY, icon: <MapIcon />, title: 'Out for Delivery', description: 'The package is on its final leg of the journey.' },
    { status: ShipmentStatus.DELIVERED, icon: <CheckCircleIcon />, title: 'Delivered', description: 'The package has been successfully delivered.' },
];

export const TrackingTimeline: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
    const currentStatusIndex = STATUS_ORDER.indexOf(shipment.status);
    const isFailed = shipment.status === ShipmentStatus.DELIVERY_FAILED;

    return (
        <div className="relative pl-8">
            {/* The vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>

            <div className="space-y-8">
                {timelineSteps.map((step, index) => {
                    const isCompleted = currentStatusIndex >= index;
                    const isCurrent = currentStatusIndex === index;

                    return (
                        <div key={step.status} className="relative flex items-start gap-4">
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full z-10 ${
                                isCompleted ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {React.cloneElement(step.icon, { className: 'w-5 h-5' })}
                            </div>
                            <div className="pt-1">
                                <p className={`font-bold ${isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>{step.title}</p>
                                <p className="text-sm text-slate-600">{step.description}</p>
                                {isCurrent && shipment.deliveryDate && step.status === ShipmentStatus.DELIVERED && (
                                     <p className="text-xs text-green-600 font-medium mt-1">{new Date(shipment.deliveryDate).toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isFailed && (
                     <div className="relative flex items-start gap-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full z-10 bg-red-600 text-white">
                            <XCircleIcon className="w-5 h-5"/>
                        </div>
                        <div className="pt-1">
                            <p className="font-bold text-red-800">Delivery Attempt Failed</p>
                            <p className="text-sm text-slate-600">The courier was unable to deliver the package. They will try again.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
