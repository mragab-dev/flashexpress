
import React from 'react';
import { Shipment, PaymentMethod } from '../../types';
import { LogoIcon } from '../Icons';

export const ShipmentLabel: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
    const Barcode = () => (
        <svg x="0px" y="0px" viewBox="0 0 200 60" className="w-full h-12">
            <rect x="0" y="0" width="4" height="50" fill="#000000" />
            <rect x="7" y="0" width="2" height="50" fill="#000000" />
            <rect x="15" y="0" width="2" height="50" fill="#000000" /><rect x="18" y="0" width="5" height="50" fill="#000000" /><rect x="26" y="0" width="1" height="50" fill="#000000" /><rect x="30" y="0" width="3" height="50" fill="#000000" /><rect x="36" y="0" width="3" height="50" fill="#000000" /><rect x="42" y="0" width="2" height="50" fill="#000000" /><rect x="47" y="0" width="1" height="50" fill="#000000" /><rect x="51" y="0" width="5" height="50" fill="#000000" /><rect x="59" y="0" width="2" height="50" fill="#000000" /><rect x="64" y="0" width="4" height="50" fill="#000000" /><rect x="71" y="0" width="1" height="50" fill="#000000" /><rect x="75" y="0" width="2" height="50" fill="#000000" /><rect x="80" y="0" width="4" height="50" fill="#000000" /><rect x="87" y="0" width="2" height="50" fill="#000000" /><rect x="92" y="0" width="3" height="50" fill="#000000" /><rect x="98" y="0" width="3" height="50" fill="#000000" /><rect x="104" y="0" width="2" height="50" fill="#000000" /><rect x="109" y="0" width="1" height="50" fill="#000000" /><rect x="113" y="0" width="5" height="50" fill="#000000" /><rect x="121" y="0" width="2" height="50" fill="#000000" /><rect x="126" y="0" width="4" height="50" fill="#000000" /><rect x="133" y="0" width="1" height="50" fill="#000000" /><rect x="137" y="0" width="2" height="50" fill="#000000" /><rect x="142" y="0" width="4" height="50" fill="#000000" /><rect x="149" y="0" width="2" height="50" fill="#000000" /><rect x="154" y="0" width="3" height="50" fill="#000000" /><rect x="160" y="0" width="3" height="50" fill="#000000" /><rect x="166" y="0" width="2" height="50" fill="#000000" /><rect x="171" y="0" width="1" height="50" fill="#000000" /><rect x="175" y="0" width="5" height="50" fill="#000000" /><rect x="183" y="0" width="2" height="50" fill="#000000" /><rect x="188" y="0" width="4" height="50" fill="#000000" /><rect x="195" y="0" width="1" height="50" fill="#000000" />
        </svg>
    );

    return (
        <div className="bg-white p-8 border-4 border-dashed border-slate-300 w-full printable-label-container">
            <div className="printable-label" style={{ fontFamily: 'sans-serif', color: 'black' }}>
                <header className="flex justify-between items-center pb-4 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                         <LogoIcon className="w-12 h-12"/>
                         <div>
                            <h1 className="text-2xl font-extrabold text-black">Flash Express</h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">Date: {new Date(shipment.creationDate).toLocaleDateString()}</p>
                        <p className="text-sm">Shipment ID:</p>
                        <p className="font-bold font-mono text-lg">{shipment.id}</p>
                    </div>
                </header>
                <main className="grid grid-cols-2 gap-8 my-8">
                    <div className="pr-8 border-r-2 border-dashed border-slate-400">
                        <h2 className="text-xs font-bold uppercase text-slate-600 mb-2">FROM</h2>
                        <p className="font-bold text-lg">{shipment.clientName}</p>
                        <p>{shipment.fromAddress.street}, {shipment.fromAddress.details}</p>
                        <p>{shipment.fromAddress.city}, {shipment.fromAddress.zone}</p>
                    </div>
                     <div>
                        <h2 className="text-xs font-bold uppercase text-slate-600 mb-2">TO</h2>
                        <p className="font-bold text-xl">{shipment.recipientName}</p>
                        <p className="text-lg">{shipment.toAddress.street}, {shipment.toAddress.details}</p>
                        <p className="text-lg">{shipment.toAddress.city}, {shipment.toAddress.zone}</p>
                        <p className="font-bold text-lg mt-2">Phone: {shipment.recipientPhone}</p>
                    </div>
                </main>
                <footer className="border-t-2 border-black pt-4">
                     <div className="grid grid-cols-2 gap-8">
                        <div>
                             <p className="text-xs uppercase font-bold text-slate-600">Payment Details</p>
                             <p className="text-2xl font-bold">{shipment.paymentMethod}</p>
                             {shipment.paymentMethod === PaymentMethod.COD && <p className="text-3xl font-extrabold text-green-600">{shipment.price.toFixed(2)} EGP</p>}
                             <p className="text-xs uppercase font-bold text-slate-600 mt-4">Package</p>
                             <p>{shipment.packageDescription}{shipment.isLargeOrder && ' (Large Order)'}</p>
                        </div>
                        <div className="text-center">
                            <Barcode />
                            <p className="font-mono tracking-widest text-sm">{shipment.id}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};
