// src/views/CreateShipment.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Address, PaymentMethod, ZONES, ShipmentPriority, Shipment, Permission, UserRole } from '../types';
import { PlusCircleIcon, UploadIcon, DownloadIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';
import Papa from 'papaparse';

type BulkShipment = Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'fromAddress' | 'status' | 'creationDate' | 'isLargeOrder' | 'price' | 'clientFlatRateFee' | 'courierCommission'>;

const CreateShipment = () => {
    const { currentUser, users, addShipment, addToast, calculatePriorityPrice, hasPermission, tierSettings } = useAppContext();
    const [activeTab, setActiveTab] = useState('single');

    const canCreateForOthers = hasPermission(Permission.CREATE_SHIPMENTS_FOR_OTHERS);
    const clients = useMemo(() => users.filter(u => u.roles.includes(UserRole.CLIENT)), [users]);
    
    // State for Single Shipment
    const [selectedClientId, setSelectedClientId] = useState<string>(canCreateForOthers ? '' : String(currentUser?.id));
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [toAddress, setToAddress] = useState<Address>({ street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' });
    const [packageDescription, setPackageDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
    const [priority, setPriority] = useState<ShipmentPriority>(ShipmentPriority.STANDARD);
    const [packageValue, setPackageValue] = useState('');
    const [amountReceived, setAmountReceived] = useState('');
    const [amountToCollect, setAmountToCollect] = useState('');

    // State for Bulk Upload
    const [bulkSelectedClientId, setBulkSelectedClientId] = useState<string>(canCreateForOthers ? '' : String(currentUser?.id));
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<BulkShipment[]>([]);
    const [verificationResults, setVerificationResults] = useState<{ isValid: boolean, errors: string[] }[]>([]);

    useEffect(() => {
        if (paymentMethod === PaymentMethod.TRANSFER) {
            setPackageValue('0');
        }
    }, [paymentMethod]);

    const clientForShipment = useMemo(() => {
        if (canCreateForOthers) {
            return clients.find(c => c.id === parseInt(selectedClientId));
        }
        return currentUser;
    }, [canCreateForOthers, selectedClientId, clients, currentUser]);

    // --- Price Calculation with Discount ---
    const numericPackageValue = parseFloat(packageValue) || 0;
    
    const { feeBeforeDiscount, discountPercentage, discountAmount, finalFee } = useMemo(() => {
        if (!clientForShipment) return { feeBeforeDiscount: 0, discountPercentage: 0, discountAmount: 0, finalFee: 0 };
    
        const fee = calculatePriorityPrice(clientForShipment.flatRateFee || 0, priority, clientForShipment);
        
        const applicableTier = clientForShipment.partnerTier
            ? tierSettings.find(t => t.tierName === clientForShipment.partnerTier)
            : null;
        
        const discountPerc = applicableTier ? applicableTier.discountPercentage : 0;
        const discountAmt = fee * (discountPerc / 100);
        const final = fee - discountAmt;

        return { feeBeforeDiscount: fee, discountPercentage: discountPerc, discountAmount: discountAmt, finalFee: final };
    }, [clientForShipment, priority, tierSettings, calculatePriorityPrice]);
    
    const totalPrice = useMemo(() => {
        if (paymentMethod === PaymentMethod.TRANSFER) {
            return parseFloat(amountToCollect) || 0;
        }
        return numericPackageValue + finalFee;
    }, [paymentMethod, finalFee, numericPackageValue, amountToCollect]);


    const handleSingleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientForShipment) {
            addToast(canCreateForOthers ? 'Please select a client.' : 'User not found.', 'error');
            return;
        }
        if (!clientForShipment.address || !clientForShipment.address.street) {
             addToast(`${clientForShipment.name} does not have a complete default address in their profile.`, 'error');
            return;
        }

        const shipment: Omit<Shipment, 'id' | 'status' | 'creationDate'> = {
            clientId: clientForShipment.id,
            clientName: clientForShipment.name,
            recipientName,
            recipientPhone,
            fromAddress: clientForShipment.address,
            toAddress,
            packageDescription,
            isLargeOrder: false,
            price: totalPrice,
            paymentMethod,
            priority,
            packageValue: numericPackageValue,
            clientFlatRateFee: finalFee,
            amountReceived: paymentMethod === PaymentMethod.TRANSFER ? (parseFloat(amountReceived) || 0) : undefined,
            amountToCollect: paymentMethod === PaymentMethod.TRANSFER ? (parseFloat(amountToCollect) || 0) : undefined,
        };

        addShipment(shipment);
        addToast('Shipment created successfully!', 'success');
        
        // Reset form
        if (canCreateForOthers) setSelectedClientId('');
        setRecipientName('');
        setRecipientPhone('');
        setToAddress({ street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' });
        setPackageDescription('');
        setPaymentMethod(PaymentMethod.COD);
        setPriority(ShipmentPriority.STANDARD);
        setPackageValue('');
        setAmountReceived('');
        setAmountToCollect('');
    };

    const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedZone = e.target.value;
        const parentGroup = e.target.options[e.target.selectedIndex]?.parentElement?.getAttribute('label');
        setToAddress(prev => ({ ...prev, zone: selectedZone, city: parentGroup || 'Other' }));
    };

    const allZones = Object.values(ZONES.GreaterCairo.Cairo).concat(Object.values(ZONES.GreaterCairo.Giza));

    // --- Bulk Upload Logic ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setParsedData([]);
            setVerificationResults([]);
        }
    };

    const handleParseAndVerify = () => {
        if (!file) {
            addToast('Please select a file to upload.', 'error');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                const shipments: BulkShipment[] = data.map(row => ({
                    recipientName: row['Recipient Name'],
                    recipientPhone: row['Recipient Phone'],
                    toAddress: {
                        street: row['Recipient Street'],
                        city: row['City'] || 'Cairo',
                        zone: row['Zone'],
                        details: row['Address Details'] || '',
                    },
                    packageDescription: row['Package Description'],
                    paymentMethod: row['Payment Method'] as PaymentMethod,
                    priority: row['Priority'] as ShipmentPriority,
                    packageValue: parseFloat(row['Package Value']),
                }));
                setParsedData(shipments);
                verifyData(shipments);
            }
        });
    };

    const verifyData = (shipments: BulkShipment[]) => {
        const results = shipments.map(shipment => {
            const errors: string[] = [];
            const validPaymentMethods: string[] = [PaymentMethod.COD, PaymentMethod.TRANSFER];

            if (!shipment.recipientName) errors.push('Recipient Name is required.');
            if (!shipment.recipientPhone) errors.push('Recipient Phone is required.');
            if (!shipment.toAddress.street) errors.push('Recipient Street is required.');
            if (!allZones.includes(shipment.toAddress.zone)) errors.push('Invalid Zone.');
            if (!validPaymentMethods.includes(shipment.paymentMethod)) errors.push('Invalid Payment Method. Must be COD or Transfer.');
            if (!Object.values(ShipmentPriority).includes(shipment.priority)) errors.push('Invalid Priority.');
            if (isNaN(shipment.packageValue) || (shipment.paymentMethod === PaymentMethod.COD && shipment.packageValue <= 0)) {
                errors.push('Invalid Package Value for COD.');
            }
            
            return { isValid: errors.length === 0, errors };
        });
        setVerificationResults(results);
    };

    const handleBulkUpload = () => {
        const clientForBulk = users.find(u => u.id === parseInt(bulkSelectedClientId));

        if (!clientForBulk) {
            addToast('Please select a client to upload for.', 'error');
            return;
        }
        if (!clientForBulk.address) {
            addToast(`Client ${clientForBulk.name} does not have a default address.`, 'error');
            return;
        }

        const validShipments = parsedData.filter((_, index) => verificationResults[index]?.isValid);

        if (validShipments.length === 0) {
            addToast('No valid shipments to upload.', 'error');
            return;
        }
        
        validShipments.forEach(shipment => {
             const baseFee = clientForBulk.flatRateFee || 0;
             const priorityAdjustedFee = calculatePriorityPrice(baseFee, shipment.priority, clientForBulk);
             
             let calculatedPrice;
             if (shipment.paymentMethod === PaymentMethod.TRANSFER) {
                 calculatedPrice = 0;
             } else { // COD
                 calculatedPrice = (shipment.packageValue || 0) + priorityAdjustedFee;
             }
            
            addShipment({
                ...shipment,
                 isLargeOrder: false,
                 price: calculatedPrice,
                 clientFlatRateFee: priorityAdjustedFee,
                 clientId: clientForBulk.id,
                 clientName: clientForBulk.name,
                 fromAddress: clientForBulk.address!,
            });
        });
        
        addToast(`${validShipments.length} shipments uploaded successfully for ${clientForBulk.name}!`, 'success');
        setFile(null);
        setParsedData([]);
        setVerificationResults([]);
    };
    
    const downloadTemplate = () => {
        const headers = [
            'Recipient Name', 'Recipient Phone', 
            'Recipient Street', 'City', 'Zone', 'Address Details',
            'Package Description', 'Payment Method', 'Priority', 'Package Value'
        ];
        
        const baseFee = currentUser?.flatRateFee || 75;
        const standardFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.STANDARD, currentUser) : baseFee;
        const urgentFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.URGENT, currentUser) : baseFee * 1.5;
        const expressFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.EXPRESS, currentUser) : baseFee * 2.0;

        const paymentMethodOptions = Object.values(PaymentMethod)
            .filter(method => method !== PaymentMethod.WALLET)
            .join(' or ');
        
        const templateData = [
            headers,
            [
                'Enter recipient full name',
                'Enter phone with country code',
                'Enter full street address',
                'Cairo or Giza',
                'Select from available zones',
                'Additional address details',
                'Describe package contents',
                paymentMethodOptions,
                `Standard (${standardFee.toFixed(2)} EGP), Urgent (${urgentFee.toFixed(2)} EGP), Express (${expressFee.toFixed(2)} EGP)`,
                'Package value in EGP (optional for Transfer)'
            ],
            [
                'Ahmed Mohamed',
                '01012345678',
                '123 Tahrir St',
                'Cairo',
                'Nasr City',
                'Apartment 5, Floor 3',
                'Electronics - Mobile Phone',
                'COD',
                'Standard',
                '500.00'
            ],
        ];
        
        const csv = Papa.unparse(templateData);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'bulk_upload_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const allVerified = verificationResults.length > 0 && verificationResults.every(r => r.isValid);


    return (
        <div className="card max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">Create Shipments</h2>

            <div className="border-b border-border mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('single')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'single' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        Create Single Shipment
                    </button>
                    <button onClick={() => setActiveTab('bulk')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'bulk' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        Bulk Upload Shipments
                    </button>
                </nav>
            </div>

            {activeTab === 'single' && (
                <form onSubmit={handleSingleSubmit} className="space-y-6">
                    {canCreateForOthers && (
                         <div className="p-4 bg-secondary rounded-lg">
                            <label className="block text-sm font-medium text-foreground mb-1">Create Shipment For Client</label>
                            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary" required>
                                <option value="" disabled>Select a client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* Recipient Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Recipient Name</label>
                            <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Recipient Phone</label>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary" placeholder="01xxxxxxxxx" required />
                            <p className="text-xs text-muted-foreground mt-1">Example for Egyptian number: 01012345678</p>
                        </div>
                    </div>
                    {/* Address Info */}
                     <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Recipient Street Address</label>
                        <input type="text" value={toAddress.street} onChange={e => setToAddress(prev => ({ ...prev, street: e.target.value }))} className="w-full px-4 py-2 border border-border rounded-lg" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Zone</label>
                            <select value={toAddress.zone} onChange={handleZoneChange} className="w-full px-4 py-2 border border-border rounded-lg">
                                <optgroup label="Cairo">
                                    {ZONES.GreaterCairo.Cairo.map(z => <option key={z} value={z}>{z}</option>)}
                                </optgroup>
                                <optgroup label="Giza">
                                    {ZONES.GreaterCairo.Giza.map(z => <option key={z} value={z}>{z}</option>)}
                                </optgroup>
                                <optgroup label="Alexandria">
                                     {ZONES.Alexandria.map(z => <option key={z} value={z}>{z}</option>)}
                                </optgroup>
                                <optgroup label="Other">
                                     {ZONES.Other.map(z => <option key={z} value={z}>{z}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Address Details (Apt, Floor, etc.)</label>
                            <input type="text" value={toAddress.details} onChange={e => setToAddress(prev => ({ ...prev, details: e.target.value }))} className="w-full px-4 py-2 border border-border rounded-lg" />
                        </div>
                    </div>

                    {/* Package Info */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Package Description</label>
                        <textarea value={packageDescription} onChange={e => setPackageDescription(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg" rows={2} required></textarea>
                    </div>

                     {/* Financial Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-4 py-2 border border-border rounded-lg">
                                <option value={PaymentMethod.COD}>Cash on Delivery (COD)</option>
                                <option value={PaymentMethod.TRANSFER}>InstaPay (Pre-paid)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as ShipmentPriority)} className="w-full px-4 py-2 border border-border rounded-lg">
                                {Object.values(ShipmentPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Package Value (EGP)</label>
                            <input type="number" step="0.01" value={packageValue} onChange={e => setPackageValue(e.target.value)} disabled={paymentMethod === PaymentMethod.TRANSFER} className="w-full px-4 py-2 border border-border rounded-lg" required />
                        </div>
                    </div>
                    
                    {paymentMethod === PaymentMethod.TRANSFER && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Amount Received from Client</label>
                                <input type="number" step="0.01" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg" placeholder="e.g., 500" required />
                                <p className="text-xs text-muted-foreground mt-1">The amount you already collected.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Amount to Collect from Recipient</label>
                                <input type="number" step="0.01" value={amountToCollect} onChange={e => setAmountToCollect(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg" placeholder="e.g., 200" required />
                                <p className="text-xs text-muted-foreground mt-1">Amount courier will collect (0 if none).</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Pricing Summary */}
                    <div className="p-4 bg-secondary rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Base Shipping Fee:</span>
                            <span className="font-semibold text-foreground">{feeBeforeDiscount.toFixed(2)} EGP</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                <div>
                                    <span className="text-muted-foreground">Partner Discount </span>
                                    <span className="font-semibold">({clientForShipment?.partnerTier} - {discountPercentage}%)</span>
                                </div>
                                <span className="font-semibold">- {discountAmount.toFixed(2)} EGP</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold">Final Shipping Fee:</span>
                            <span className="font-bold text-foreground">{finalFee.toFixed(2)} EGP</span>
                        </div>
                         <div className="flex justify-between text-sm pt-2 border-t border-border">
                            <span className="text-muted-foreground">Package Value:</span>
                            <span className="font-semibold text-foreground">{numericPackageValue.toFixed(2)} EGP</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
                            <span className="text-foreground">Total to Collect (COD):</span>
                            <span className="text-primary">{totalPrice.toFixed(2)} EGP</span>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                        <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition shadow-lg">
                            <PlusCircleIcon />
                            Create Shipment
                        </button>
                    </div>
                </form>
            )}
            {activeTab === 'bulk' && (
                <div className="space-y-6">
                    {canCreateForOthers && (
                        <div className="p-4 bg-secondary rounded-lg">
                            <label className="block text-sm font-medium text-foreground mb-1">Upload Shipments For Client</label>
                            <select value={bulkSelectedClientId} onChange={e => setBulkSelectedClientId(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary" required>
                                <option value="" disabled>Select a client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-2 border-dashed border-border rounded-lg">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                        <button onClick={downloadTemplate} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-accent transition text-sm">
                            <DownloadIcon className="w-4 h-4" /> Download Template
                        </button>
                         <button onClick={handleParseAndVerify} disabled={!file} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-sm disabled:bg-muted">
                            <UploadIcon className="w-4 h-4" /> Verify File
                        </button>
                    </div>

                    {verificationResults.length > 0 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-secondary rounded-lg">
                                <h3 className="font-bold text-lg">Verification Results</h3>
                                <p>{parsedData.length} rows found. {parsedData.length - verificationResults.filter(r => !r.isValid).length} valid shipments.</p>
                            </div>

                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {parsedData.map((shipment, index) => (
                                    <div key={index} className={`p-3 rounded-lg border ${verificationResults[index].isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex items-start gap-3">
                                            {verificationResults[index].isValid ? <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5"/> : <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5"/>}
                                            <div>
                                                <p className="font-semibold">{shipment.recipientName} - {shipment.toAddress.zone}</p>
                                                {!verificationResults[index].isValid && (
                                                    <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                                                        {verificationResults[index].errors.map((err, i) => <li key={i}>{err}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end">
                                 <button onClick={handleBulkUpload} disabled={!allVerified} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition shadow-lg disabled:bg-muted">
                                    <PlusCircleIcon />
                                    Upload Valid Shipments
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreateShipment;
