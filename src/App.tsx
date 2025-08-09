

import { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastContainer } from './components/common/Toast';
import LoginScreen from './views/Login';
import MainLayout from './layouts/MainLayout';
import RecipientTracking from './views/RecipientTracking';

// This component is now responsible for deciding which view to show.
const AppContent = () => {
    const { currentUser, isLoading } = useAppContext();
    const [isTrackingView, setIsTrackingView] = useState(false);

    if (isTrackingView) {
        return <RecipientTracking onBackToApp={() => setIsTrackingView(false)} />;
    }

    // Only show the full-page loading screen if we are not yet logged in.
    // This prevents the main layout from being unmounted during background data refreshes.
    if (isLoading && !currentUser) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary-600 mx-auto"></div>
                    <h2 className="text-2xl font-bold text-slate-800 mt-4">Loading Data...</h2>
                    <p className="text-slate-600">Please wait while we fetch your information.</p>
                </div>
            </div>
        )
    }

    return (
         <>
            {/* Render either the login screen or the main app layout */}
            <div className={`transition-opacity duration-500 ${currentUser ? 'opacity-100' : 'opacity-100'}`}>
                {!currentUser ? <LoginScreen onTrackPackageClick={() => setIsTrackingView(true)} /> : <MainLayout />}
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