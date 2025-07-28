

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Address, PaymentMethod, Zone, ShipmentPriority } from '../types';
import { AddressAutocompleteInput } from '../components/common/AddressAutocompleteInput';
import { PlusCircleIcon } from '../components/Icons';

const CreateShipment = () => {
    const { currentUser, addShipment, addToast } = useAppContext();
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [toAddress, setToAddress] = useState<Address>({ street: '', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: '' });
    const [packageDescription, setPackageDescription] = useState('');
    const [isLargeOrder, setIsLargeOrder] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
    const [priority, setPriority] = useState<ShipmentPriority>(ShipmentPriority.STANDARD);
    const [packageValue, setPackageValue] = useState(0);

    const price = isLargeOrder ? 300 : 75;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser?.address) {
            addToast('Please complete your profile address before creating a shipment.', 'error');
            return;
        }
        
        if (paymentMethod === PaymentMethod.WALLET && (currentUser?.walletBalance ?? 0) < price) {
            addToast(`Insufficient funds. Your balance is ${(currentUser?.walletBalance ?? 0).toFixed(2)} EGP.`, 'error');
            return;
        }
        
        addShipment({ recipientName, recipientPhone, fromAddress: currentUser.address, toAddress, packageDescription, isLargeOrder, price, paymentMethod, priority, packageValue });
        
        // Reset form
        setRecipientName(''); setRecipientPhone('');
        setToAddress({ street: '', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: '' });
        setPackageDescription(''); setIsLargeOrder(false); setPaymentMethod(PaymentMethod.COD);
        setPriority(ShipmentPriority.STANDARD); setPackageValue(0);
    };
    
    const availableZones = Object.values(Zone).filter(z => z.toLowerCase().startsWith(toAddress.city.toLowerCase()));

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Create a New Shipment</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
                        <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Phone</label>
                        <input type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                </div>
                {/* Address Info */}
                 <AddressAutocompleteInput label="Recipient Street Address" value={toAddress} onChange={setToAddress} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <select value={toAddress.city} onChange={e => setToAddress(p => ({...p, city: e.target.value as 'Cairo' | 'Giza'}))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-slate-100" disabled>
                           <option value="Cairo">Cairo</option>
                           <option value="Giza">Giza</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                        <select value={toAddress.zone} onChange={e => setToAddress(p => ({...p, zone: e.target.value as Zone}))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                           {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>
                 </div>
                 {/* Package Info */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Package Description</label>
                    <textarea value={packageDescription} onChange={e => setPackageDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" rows={3}></textarea>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Package Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value as ShipmentPriority)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                           {Object.values(ShipmentPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Package Value (EGP)</label>
                        <input type="number" value={packageValue} onChange={e => setPackageValue(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center">
                        <input id="largeOrder" type="checkbox" checked={isLargeOrder} onChange={e => setIsLargeOrder(e.target.checked)} className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"/>
                        <label htmlFor="largeOrder" className="ml-2 block text-sm text-slate-900">This is a large order</label>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                        Price: <span className="text-primary-600">{price} EGP</span>
                    </div>
                </div>
                 {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                    <div className="flex gap-4">
                       {Object.values(PaymentMethod).map(method => (
                           <button type="button" key={method} onClick={() => setPaymentMethod(method)} className={`px-4 py-2 rounded-lg border-2 transition font-semibold ${paymentMethod === method ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-700 border-slate-300 hover:border-primary-500'}`}>
                               {method}
                           </button>
                       ))}
                    </div>
                </div>
                <div className="text-right pt-2">
                    <button type="submit" className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition">
                       <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Create Shipment
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateShipment;