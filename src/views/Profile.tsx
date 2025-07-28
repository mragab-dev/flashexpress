
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, Address, Zone, UserRole, ShipmentStatus, PaymentMethod } from '../types';
import { AddressAutocompleteInput } from '../components/common/AddressAutocompleteInput';
import { StatCard } from '../components/common/StatCard';
import { PencilIcon, TruckIcon, WalletIcon, PackageIcon, ClipboardListIcon } from '../components/Icons';

const Profile = () => {
    const { currentUser, updateUser, shipments } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({});

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                phone: currentUser.phone || '',
                address: currentUser.address || { street: '', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: '' }
            });
        }
    }, [currentUser]);
    
    if (!currentUser) return null;

    const handleAddressChange = (newAddress: Address) => {
        setFormData(prev => ({
            ...prev,
            address: newAddress
        }));
    };
    
    const handleSave = () => {
        updateUser(currentUser.id, formData);
        setIsEditing(false);
    };

    const availableZones = Object.values(Zone).filter(z => z.toLowerCase().startsWith(formData.address?.city.toLowerCase() || ''));

    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-start mb-6">
                <div>
                     <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
                     <p className="text-slate-500 mt-1">View and edit your personal information and default address.</p>
                 </div>
                 {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition">
                         <PencilIcon className="w-5 h-5"/>
                         Edit Profile
                     </button>
                 ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Save Changes</button>
                    </div>
                 )}
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm space-y-8">
                {/* Personal Information */}
                <div className="border-b border-slate-200 pb-8">
                     <h2 className="text-lg font-bold text-slate-800 mb-4">Personal Information</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            {isEditing ? (
                                <input type="text" name="name" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                            ) : (
                                <p className="text-lg text-slate-800 p-2">{currentUser.name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <p className="text-lg text-slate-500 p-2 bg-slate-50 rounded-lg">{currentUser.email}</p>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            {isEditing ? (
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                            ) : (
                                <p className="text-lg text-slate-800 p-2">{currentUser.phone || 'Not set'}</p>
                            )}
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                             <p className="text-lg text-slate-500 p-2 bg-slate-50 rounded-lg">{currentUser.role}</p>
                        </div>
                     </div>
                </div>

                {/* Default Address */}
                <div>
                     <h2 className="text-lg font-bold text-slate-800 mb-4">Default Pickup Address</h2>
                     {isEditing ? (
                        <div className="space-y-4">
                            <AddressAutocompleteInput label="Street Address" value={formData.address!} onChange={handleAddressChange} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                    <select name="address.city" value={formData.address?.city || 'Cairo'} onChange={e => handleAddressChange({...formData.address!, city: e.target.value as 'Cairo' | 'Giza'})} className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100" disabled>
                                       <option value="Cairo">Cairo</option>
                                       <option value="Giza">Giza</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                                    <select name="address.zone" value={formData.address?.zone || ''} onChange={e => handleAddressChange({...formData.address!, zone: e.target.value as Zone})} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                                       {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Apartment, Suite, etc.</label>
                                <input type="text" name="address.details" value={formData.address?.details || ''} onChange={e => handleAddressChange({...formData.address!, details: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                            </div>
                        </div>
                     ) : (
                        currentUser.address ? (
                             <div className="text-lg text-slate-800 p-4 bg-slate-50 rounded-lg">
                                 <p className="font-semibold">{currentUser.address.street}</p>
                                 <p>{currentUser.address.details}</p>
                                 <p>{currentUser.address.city}, {currentUser.address.zone}</p>
                             </div>
                        ) : (
                            <p className="text-slate-500">Please set your default address.</p>
                        )
                     )}
                </div>
                
                {/* Courier-specific statistics */}
                {currentUser.role === UserRole.COURIER && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-4">My Statistics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                title="Total Deliveries" 
                                value={shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.DELIVERED).length}
                                icon={<PackageIcon className="w-6 h-6"/>} 
                                color="#3b82f6" 
                            />
                            <StatCard 
                                title="Active Tasks" 
                                value={shipments.filter(s => s.courierId === currentUser.id && 
                                    [ShipmentStatus.ASSIGNED_TO_COURIER, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)).length}
                                icon={<TruckIcon className="w-6 h-6"/>} 
                                color="#06b6d4" 
                            />
                            <StatCard 
                                title="COD Collected" 
                                value={`${shipments.filter(s => s.courierId === currentUser.id && 
                                    s.status === ShipmentStatus.DELIVERED && 
                                    s.paymentMethod === PaymentMethod.COD)
                                    .reduce((sum, s) => sum + s.price, 0).toFixed(2)} EGP`}
                                icon={<WalletIcon className="w-6 h-6"/>} 
                                color="#16a34a" 
                            />
                            <StatCard 
                                title="My Zone" 
                                value={currentUser.zone || 'Not assigned'}
                                icon={<ClipboardListIcon className="w-6 h-6"/>} 
                                color="#8b5cf6" 
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;