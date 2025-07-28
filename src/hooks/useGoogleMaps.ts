
import { useEffect } from 'react';

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            return resolve();
        }

        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            const handleLoad = () => {
                resolve();
                existingScript.removeEventListener('load', handleLoad);
            };
            existingScript.addEventListener('load', handleLoad);
            return;
        }
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.id = 'google-maps-script';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
            // Check if script is still in DOM before removing, to prevent errors
            const scriptInDom = document.getElementById('google-maps-script');
            if(scriptInDom) {
               document.head.removeChild(scriptInDom);
            }
            reject(new Error('Google Maps script failed to load. Check API key & network.'));
        };
        document.head.appendChild(script);
    });
};


export const useGoogleMaps = (apiKey: string | undefined, addToast: (message: string, type: 'error' | 'success' | 'info') => void) => {
    useEffect(() => {
        if (apiKey) {
            loadGoogleMapsScript(apiKey).catch(error => {
                console.error(error.message);
                addToast(error.message, 'error');
            });
        } else {
            const warningMessage = "Maps API key is missing. Map features are disabled.";
            console.warn(warningMessage);
            addToast(warningMessage, 'error');
        }
    }, [apiKey, addToast]);
};
