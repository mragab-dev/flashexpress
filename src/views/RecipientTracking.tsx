import React, { useState } from 'react';
import { Shipment } from '../types';
import { LogoIcon, PhoneIcon } from '../components/Icons';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { TrackingTimeline } from '../components/specific/TrackingTimeline';

interface RecipientTrackingProps {
    onBackToApp: () => void;
}

const RecipientTracking: React.FC<RecipientTrackingProps> = ({ onBackToApp }) => {
    const [trackingId, setTrackingId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTrackPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setShipment(null);
        setError(null);

        if (!trackingId.trim() || !phoneNumber.trim()) {
            setError('Please enter both a tracking ID and phone number.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    trackingId: trackingId,
                    phone: phoneNumber,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `No shipment found with those details.`);
            }

            const foundShipment = await response.json();
            setShipment(foundShipment);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="p-4 border-b border-slate-200 bg-white">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <LogoIcon className="w-9 h-9" />
                        <h1 className="text-xl font-bold text-slate-800">Flash Express Tracking</h1>
                    </div>
                    <button onClick={onBackToApp} className="text-sm font-semibold text-primary-600 hover:text-primary-800">
                        Back to Portal
                    </button>
                </div>
            </header>
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-6xl mx-auto">
                    {!shipment ? (
                        <div className="w-full max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-slate-800 text-center">Track Your Shipment</h2>
                            <p className="text-slate-600 text-center mt-2 mb-8">Enter the shipment ID and your phone number to see its status.</p>
                            
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
                                    <strong className="font-bold">Tracking Failed: </strong>
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleTrackPackage} className="space-y-6">
                                <div>
                                    <label htmlFor="trackingId" className="block text-sm font-medium text-slate-700">Shipment ID</label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-4V3a1 1 0 00-1-1H9zm-1 4a1 1 0 100 2 1 1 0 000-2zM8 9a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" /></svg>
                                        </span>
                                        <input id="trackingId" type="text" value={trackingId} onChange={e => setTrackingId(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g., FLS123456" required />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700">Phone Number (Sender or Recipient)</label>
                                    <div className="relative mt-1">
                                         <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <PhoneIcon className="h-5 w-5 text-slate-400" />
                                        </span>
                                        <input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g., 01012345678" required />
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-300 disabled:bg-slate-400">
                                    {isLoading ? 'Searching...' : 'Track Now'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in-up">
                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-200">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Shipment Details</h2>
                                    <p className="font-mono text-slate-600">{shipment.id}</p>
                                </div>
                                <ShipmentStatusBadge status={shipment.status} />
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-4">
                                     <div>
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase">From</h3>
                                        <p className="text-lg font-medium text-slate-800">{shipment.clientName}</p>
                                        <p className="text-slate-600">{shipment.fromAddress.street}, {shipment.fromAddress.city}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase">To</h3>
                                        <p className="text-lg font-medium text-slate-800">{shipment.recipientName}</p>
                                        <p className="text-slate-600">{shipment.toAddress.street}, {shipment.toAddress.city}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase">Last Updated</h3>
                                        <p className="text-lg font-medium text-slate-800">{new Date(shipment.creationDate).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                     <h3 className="text-xl font-bold text-slate-800 mb-4">Tracking History</h3>
                                    <TrackingTimeline shipment={shipment} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RecipientTracking;