
import React, { useState, useEffect, useRef } from 'react';
import { Address, Zone } from '../../types';

declare global {
  interface Window {
    google: any;
  }
}

export const AddressAutocompleteInput: React.FC<{
    label: string;
    value: Address;
    onChange: (newAddress: Address) => void;
}> = ({ label, value, onChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(value.street);

    useEffect(() => {
        if (value.street !== inputValue) {
            setInputValue(value.street);
        }
    }, [value.street, inputValue]);

    useEffect(() => {
        if (!window.google || !inputRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'eg' },
            fields: ['address_components'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.address_components) return;

            const streetNumber = place.address_components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
            const route = place.address_components.find((c: any) => c.types.includes('route'))?.long_name || '';
            const newStreet = `${streetNumber} ${route}`.trim();
            setInputValue(newStreet);

            const cityComponent = place.address_components.find((c: any) => c.types.includes('administrative_area_level_1'));
            let newCity: 'Cairo' | 'Giza' | 'Alexandria' | 'Other' = value.city;
            if (cityComponent?.long_name.includes('Cairo')) newCity = 'Cairo';
            if (cityComponent?.long_name.includes('Giza')) newCity = 'Giza';

            const firstZoneForCity = Object.values(Zone).find(z => z.toLowerCase().startsWith(newCity.toLowerCase()));

            onChange({
                ...value,
                street: newStreet,
                city: newCity,
                zone: firstZoneForCity || value.zone,
            });
        });

        return () => {
            if (window.google && autocomplete) {
                window.google.maps.event.clearInstanceListeners(autocomplete);
                 // Clean up PAC container
                const pacContainers = document.getElementsByClassName('pac-container');
                 while (pacContainers.length > 0) {
                    pacContainers[0].remove();
                }
            }
        };
    }, [onChange, value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        onChange({ ...value, street: e.target.value });
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Start typing a street address..."
                required
            />
        </div>
    );
};