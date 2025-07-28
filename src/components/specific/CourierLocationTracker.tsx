
import { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { UserRole, GeoLocation } from '../../types';

export const CourierLocationTracker: React.FC = () => {
    const { currentUser, updateUser, addToast } = useAppContext();

    useEffect(() => {
        if (!currentUser || currentUser.role !== UserRole.COURIER) return;

        let watchId: number | null = null;
        
        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation: GeoLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    // Pass `true` for silent update to prevent toast spam
                    updateUser(currentUser.id, { location: newLocation }, true);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    if (error.code === error.PERMISSION_DENIED) {
                        addToast('Location permission denied. Tracking is disabled.', 'error');
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            addToast('Geolocation is not supported by your browser.', 'error');
        }

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [currentUser, updateUser, addToast]);

    return null; // This is a non-visual component
};
