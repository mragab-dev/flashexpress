
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, Address, ZONES } from '../types';
import { PencilIcon } from '../components/Icons';

const Profile = () => {
    const { currentUser, updateUser } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({});

    const getAvailableZones = (city: string): string[] => {
        if (city === 'Cairo') return ZONES.GreaterCairo.Cairo;
        if (city === 'Giza') return ZONES.GreaterCairo.Giza;
        if (city === 'Alexandria') return ZONES.Alexandria;
        if (city === 'Other') return ZONES.Other;
        return [];
    };
    
    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                phone: currentUser.phone || '',
                address: currentUser.address || { street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' }
            });
        }
    }, [currentUser]);
    
    if (!currentUser) return null;

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('address.')) {
            const field = name.split('.')[1] as keyof Address;
            let newAddress = { ...formData.address!, [field]: value };

            if (field === 'city') {
                const newCity = value as string;
                const availableZonesForNewCity = getAvailableZones(newCity);
                const firstZoneForCity = availableZonesForNewCity.length > 0 ? availableZonesForNewCity[0] : '';
                newAddress.zone = firstZoneForCity;
            }

            setFormData(prev => ({ ...prev, address: newAddress }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSave = () => {
        updateUser(currentUser.id, formData);
        setIsEditing(false);
    };

    const availableZones = getAvailableZones(formData.address?.city || 'Cairo');

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
                                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
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
                                <>
                                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" placeholder="01xxxxxxxxx"/>
                                    <p className="text-xs text-slate-500 mt-1">Example for Egyptian number: 01012345678</p>
                                </>
                            ) : (
                                <p className="text-lg text-slate-800 p-2">{currentUser.phone || 'Not set'}</p>
                            )}
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                             <p className="text-lg text-slate-500 p-2 bg-slate-50 rounded-lg">{(currentUser.roles || []).join(' & ')}</p>
                        </div>
                     </div>
                </div>

                {/* Default Address */}
                <div>
                     <h2 className="text-lg font-bold text-slate-800 mb-4">Default Pickup Address</h2>
                     {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                                <input
                                    type="text"
                                    name="address.street"
                                    value={formData.address?.street || ''}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                    <select name="address.city" value={formData.address?.city || 'Cairo'} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                                       <option value="Cairo">Cairo</option>
                                       <option value="Giza">Giza</option>
                                       <option value="Alexandria">Alexandria</option>
                                       <option value="Other">Other Governorates</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                                    <select name="address.zone" value={formData.address?.zone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                                       {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Apartment, Suite, etc.</label>
                                <input type="text" name="address.details" value={formData.address?.details || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
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
            </div>
        </div>
    );
};

export default Profile;
