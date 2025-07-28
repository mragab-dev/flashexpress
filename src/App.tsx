
import { AppProvider, useAppContext } from './context/AppContext';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { CourierLocationTracker } from './components/specific/CourierLocationTracker';
import { ToastContainer } from './components/common/Toast';
import LoginScreen from './views/Login';
import MainLayout from './layouts/MainLayout';
import { UserRole } from './types';

// This component is now responsible for loading global scripts and deciding which view to show.
const AppContent = () => {
    const { currentUser, addToast } = useAppContext();

    // Use the custom hook to load the Google Maps script
    useGoogleMaps((globalThis as any).process?.env?.API_KEY, addToast);
    
    return (
         <>
            {/* The location tracker is a non-visual component that runs for couriers */}
            {currentUser?.role === UserRole.COURIER && <CourierLocationTracker />}

            {/* Render either the login screen or the main app layout */}
            <div className={`transition-opacity duration-500 ${currentUser ? 'opacity-100' : 'opacity-100'}`}>
                {!currentUser ? <LoginScreen /> : <MainLayout />}
            </div>
            
            {/* The toast container sits on top of everything */}
            <ToastContainer />
        </>
    );
};

// The main App component wraps everything in the AppProvider
const App = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};


export default App;