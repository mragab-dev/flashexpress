import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Address, PaymentMethod, Zone, ShipmentPriority, Shipment } from '../types';
import { PlusCircleIcon, UploadIcon, DownloadIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';
import Papa from 'papaparse';

type BulkShipment = Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'fromAddress' | 'status' | 'creationDate' | 'isLargeOrder' | 'price' | 'clientFlatRateFee' | 'courierCommission'>;

const CreateShipment = () => {
    const { currentUser, addShipment, addToast, calculatePriorityPrice } = useAppContext();
    const [activeTab, setActiveTab] = useState('single');
    
    // State for Single Shipment
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [toAddress, setToAddress] = useState<Address>({ street: '', city: 'Cairo', zone: Zone.CAIRO_DOWNTOWN, details: '' });
    const [packageDescription, setPackageDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
    const [priority, setPriority] = useState<ShipmentPriority>(ShipmentPriority.STANDARD);
    const [packageValue, setPackageValue] = useState('');

    // State for Bulk Upload
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<BulkShipment[]>([]);
    const [verificationResults, setVerificationResults] = useState<{ isValid: boolean, errors: string[] }[]>([]);

    // Calculate priority-adjusted shipping fee
    const baseFee = currentUser?.flatRateFee || 0;
    const priorityAdjustedFee = currentUser ? calculatePriorityPrice(baseFee, priority, currentUser) : baseFee;
    const numericPackageValue = parseFloat(packageValue) || 0;
    const totalPrice = numericPackageValue + priorityAdjustedFee;

    const handleSingleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        const shipment: Omit<Shipment, 'id' | 'status' | 'creationDate'> = {
            clientId: currentUser.id,
            clientName: currentUser.name,
            recipientName,
            recipientPhone,
            fromAddress: currentUser.address || { street: '', city: 'Cairo', zone: Zone.CAIRO_DOWNTOWN, details: '' },
            toAddress,
            packageDescription,
            isLargeOrder: false,
            price: totalPrice,
            paymentMethod,
            priority,
            packageValue: numericPackageValue,
            clientFlatRateFee: priorityAdjustedFee, // Use priority-adjusted fee
        };

        addShipment(shipment);
        addToast('Shipment created successfully!', 'success');
        
        // Reset form
        setRecipientName('');
        setRecipientPhone('');
        setToAddress({ street: '', city: 'Cairo', zone: Zone.CAIRO_DOWNTOWN, details: '' });
        setPackageDescription('');
        setPaymentMethod(PaymentMethod.COD);
        setPriority(ShipmentPriority.STANDARD);
        setPackageValue('');
    };

    const getAvailableZones = (city: string) => {
        return Object.values(Zone).filter(z => z.startsWith(city));
    };
    
    const availableZones = getAvailableZones(toAddress.city);

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
                        zone: row['Zone'] as Zone,
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
            if (!shipment.recipientName) errors.push('Recipient Name is required.');
            if (!shipment.recipientPhone) errors.push('Recipient Phone is required.');
            if (!shipment.toAddress.street) errors.push('Recipient Street is required.');
            if (!Object.values(Zone).includes(shipment.toAddress.zone)) errors.push('Invalid Zone.');
            if (!Object.values(PaymentMethod).includes(shipment.paymentMethod)) errors.push('Invalid Payment Method.');
            if (!Object.values(ShipmentPriority).includes(shipment.priority)) errors.push('Invalid Priority.');
            if (isNaN(shipment.packageValue) || shipment.packageValue <= 0) errors.push('Invalid Package Value.');
            
            return { isValid: errors.length === 0, errors };
        });
        setVerificationResults(results);
    };

    const handleBulkUpload = () => {
        if (!currentUser?.address) {
            addToast('Please complete your profile address before creating shipments.', 'error');
            return;
        }

        const validShipments = parsedData.filter((_, index) => verificationResults[index]?.isValid);

        if (validShipments.length === 0) {
            addToast('No valid shipments to upload.', 'error');
            return;
        }
        
        validShipments.forEach(shipment => {
             // Calculate priority-adjusted fee for each shipment
             const priorityAdjustedFee = calculatePriorityPrice(baseFee, shipment.priority, currentUser);
             const totalPrice = shipment.packageValue + priorityAdjustedFee;

            if (shipment.paymentMethod === PaymentMethod.WALLET && (currentUser?.walletBalance ?? 0) < totalPrice) {
                 addToast(`Skipping shipment for ${shipment.recipientName} due to insufficient wallet balance.`, 'error');
                 return;
             }
            
            addShipment({
                ...shipment,
                fromAddress: currentUser.address!,
                 isLargeOrder: false,
                 price: totalPrice,
                 clientFlatRateFee: priorityAdjustedFee, // Use priority-adjusted fee
            });
        });
        
        addToast(`${validShipments.length} shipments uploaded successfully!`, 'success');
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
        
        // Get current user's priority pricing for the template
        const baseFee = currentUser?.flatRateFee || 75;
        const standardFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.STANDARD, currentUser) : baseFee;
        const urgentFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.URGENT, currentUser) : baseFee * 1.5;
        const expressFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.EXPRESS, currentUser) : baseFee * 2.0;
        
        const templateData = [
            headers,
            // Instructions row
            [
                'Enter recipient full name',
                'Enter phone with country code',
                'Enter full street address',
                'Cairo, Giza, Alexandria, or Other',
                'Select from available zones',
                'Additional address details',
                'Describe package contents',
                `${Object.values(PaymentMethod).join(' or ')}`,
                `Standard (${standardFee.toFixed(2)} EGP), Urgent (${urgentFee.toFixed(2)} EGP), Express (${expressFee.toFixed(2)} EGP)`,
                'Package value in EGP'
            ],
            // Example row
            [
                'Ahmed Mohamed',
                '01012345678',
                '123 Tahrir Square',
                'Cairo',
                'Cairo - Downtown (El Alfy)',
                'Apartment 5, Floor 3',
                'Electronics - Mobile Phone',
                'COD',
                'Standard',
                '500.00'
            ],
            // Separator row
            ['=== AVAILABLE OPTIONS ===', '', '', '', '', '', '', '', '', ''],
            // Available cities
            ['CITIES:', Object.values(['Cairo', 'Giza', 'Alexandria', 'Other']).join(', '), '', '', '', '', '', '', '', ''],
            // Available zones (first 10 as example)
            ['ZONES (sample):', Object.values(Zone).slice(0, 10).join(', '), '...and more', '', '', '', '', '', '', ''],
            // Available payment methods
            ['PAYMENT METHODS:', Object.values(PaymentMethod).join(', '), '', '', '', '', '', '', '', ''],
            // Priority pricing explanation
            [
                'PRIORITY PRICING:',
                `Standard: ${standardFee.toFixed(2)} EGP (base rate)`,
                `Urgent: ${urgentFee.toFixed(2)} EGP (${((urgentFee/baseFee)).toFixed(1)}x base)`,
                `Express: ${expressFee.toFixed(2)} EGP (${((expressFee/baseFee)).toFixed(1)}x base)`,
                '', '', '', '', '', ''
            ]
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
        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-sm max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Create Shipments</h2>

            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('single')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'single' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Create Single Shipment
                    </button>
                    <button onClick={() => setActiveTab('bulk')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'bulk' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Bulk Upload Shipments
                    </button>
                </nav>
            </div>

            {activeTab === 'single' && (
                <form onSubmit={handleSingleSubmit} className="space-y-6">
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
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Street Address</label>
                        <input
                            type="text"
                            value={toAddress.street}
                            onChange={(e) => setToAddress((prev) => ({ ...prev, street: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            placeholder="e.g., 123 Main St"
                            required
                        />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                            <select value={toAddress.city} onChange={e => setToAddress(p => ({...p, city: e.target.value as 'Cairo' | 'Giza' | 'Alexandria' | 'Other', zone: getAvailableZones(e.target.value)[0]}))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                               <option value="Cairo">Cairo</option>
                               <option value="Giza">Giza</option>
                               <option value="Alexandria">Alexandria</option>
                               <option value="Other">Other Governorates</option>
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
                               {Object.values(ShipmentPriority).map(p => {
                                   const priorityFee = currentUser ? calculatePriorityPrice(baseFee, p, currentUser) : baseFee;
                                   return (
                                       <option key={p} value={p}>
                                           {p} - {priorityFee.toFixed(2)} EGP
                                       </option>
                                   );
                               })}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                Base fee: {baseFee.toFixed(2)} EGP • Selected: {priorityAdjustedFee.toFixed(2)} EGP
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Price of Package Contents (EGP)</label>
                            <input type="number" value={packageValue} onChange={e => setPackageValue(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" required placeholder="e.g. 500" min="0.01" step="0.01" />
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

                    <div className="p-4 bg-slate-50 rounded-lg text-right">
                        <div className="text-sm text-slate-600">Price of Contents: <span className="font-semibold">{numericPackageValue.toFixed(2)} EGP</span></div>
                        <div className="text-sm text-slate-600">Shipping Fee: <span className="font-semibold">{priorityAdjustedFee.toFixed(2)} EGP</span></div>
                        <div className="text-lg font-bold text-slate-800 mt-1">Total (Price + Shipping): <span className="text-primary-600">{totalPrice.toFixed(2)} EGP</span></div>
                        {paymentMethod === PaymentMethod.COD && <p className="text-xs text-slate-500 mt-1">Total amount to be collected by courier.</p>}
                    </div>

                    <div className="text-right pt-2">
                        <button type="submit" className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition">
                           <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Create Shipment
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'bulk' && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Upload Section */}
                        <div className="space-y-4">
                            <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg text-center">
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-slate-700">
                                    Select a CSV file to upload
                                </label>
                                <input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
                            </div>
                            <div className="flex justify-between items-center">
                                <button onClick={downloadTemplate} className="inline-flex items-center px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700">
                                    <DownloadIcon className="w-5 h-5 mr-2" />
                                    Download Template
                                </button>
                                <button onClick={handleParseAndVerify} disabled={!file} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 disabled:bg-slate-300">
                                    Verify Data
                                </button>
                            </div>
                        </div>

                        {/* Verification Results */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-slate-800 mb-2">Verification Status</h3>
                            {parsedData.length === 0 && <p className="text-sm text-slate-500">Upload a file and click "Verify Data" to see the results.</p>}
                            {parsedData.length > 0 && (
                                <>
                                    <div className={`p-3 rounded-lg mb-4 ${allVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        <p className="font-semibold">{allVerified ? 'All rows are valid and ready for upload.' : 'Some rows have errors. Please fix them before uploading.'}</p>
                                    </div>
                                    <button onClick={handleBulkUpload} disabled={!allVerified} className="w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 disabled:bg-slate-300">
                                        Upload Valid Shipments
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    {parsedData.length > 0 && (
                        <div className="mt-8">
                            {/* Desktop Table */}
                            <div className="overflow-x-auto hidden lg:block">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                            {Object.keys(parsedData[0]).map(key => (
                                                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {parsedData.map((row, index) => (
                                            <tr key={index} className={verificationResults[index]?.isValid ? '' : 'bg-red-50'}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {verificationResults[index]?.isValid ? (
                                                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                                    ) : (
                                                        <div className="relative group">
                                                            <XCircleIcon className="w-6 h-6 text-red-500" />
                                                            <div className="absolute z-10 hidden group-hover:block bg-slate-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 -translate-x-1/2 w-48">
                                                                {verificationResults[index]?.errors.join(' ')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                {Object.values(row).map((value, i) => (
                                                    <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Cards */}
                            <div className="lg:hidden space-y-4">
                                {parsedData.map((row, index) => (
                                    <div key={index} className={`responsive-card ${!verificationResults[index]?.isValid && 'border-red-300 bg-red-50'}`}>
                                        <div className="responsive-card-header">
                                            <div className="font-semibold text-slate-800">{row.recipientName}</div>
                                            {verificationResults[index]?.isValid ? (
                                                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <XCircleIcon className="w-6 h-6 text-red-500" />
                                            )}
                                        </div>
                                        {!verificationResults[index]?.isValid && (
                                            <p className="text-xs text-red-700">{verificationResults[index].errors.join(', ')}</p>
                                        )}
                                        <div className="responsive-card-item">
                                            <div className="responsive-card-label">Phone</div>
                                            <div className="responsive-card-value">{row.recipientPhone}</div>
                                        </div>
                                        <div className="responsive-card-item">
                                            <div className="responsive-card-label">Address</div>
                                            <div className="responsive-card-value">{row.toAddress.street}, {row.toAddress.zone}</div>
                                        </div>
                                         <div className="responsive-card-item">
                                            <div className="responsive-card-label">Package Value</div>
                                            <div className="responsive-card-value">{row.packageValue} EGP</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreateShipment;
