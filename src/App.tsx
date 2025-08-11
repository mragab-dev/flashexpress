import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastContainer } from './components/common/Toast';
import LoginScreen from './views/Login';
import MainLayout from './layouts/MainLayout';

// This component is now responsible for deciding which view to show.
const AppContent = () => {
    const { currentUser, isLoading } = useAppContext();

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
                {!currentUser ? <LoginScreen /> : <MainLayout />}
            </div>
            
            {/* The toast container sits on top of everything */}
            <ToastContainer />
        </>
    );
};

// The main App component wraps everything in the AppProvider
const App = () => {
    const isAppRoute = window.location.pathname === '/app.html';

    if (!isAppRoute) {
        // We are on the landing page (index.html), so we don't render the React app.
        // The static HTML will be visible.
        return null;
    }

    // On /app.html, we remove the static content and render the React app.
    useEffect(() => {
        const landingPageElement = document.getElementById('landing-page');
        if (landingPageElement) {
            landingPageElement.remove();
        }
        
        // Reset body styles that might conflict with the app's styles
        document.body.className = ''; 
        document.documentElement.removeAttribute('dir');
        document.documentElement.removeAttribute('lang');
        document.body.style.cursor = 'auto'; // Remove the custom truck cursor
    }, []);

    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};


export default App;