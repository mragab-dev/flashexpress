import React from 'react';
import { useAppContext } from './context/AppContext';
import { ToastContainer } from './components/common/Toast';
import LoginScreen from './views/Login';
import MainLayout from './layouts/MainLayout';

const AppRoutes = () => {
    const { currentUser, isLoading } = useAppContext();

    React.useEffect(() => {
        // When the app loads, remove landing page specific styles if they exist.
        // The theme provider will handle body styling.
        document.body.className = '';
        document.documentElement.removeAttribute('dir');
        document.documentElement.removeAttribute('lang');
        document.body.style.cursor = 'auto';
    }, []);


    if (isLoading && !currentUser) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
                    <h2 className="text-2xl font-bold mt-4">Loading Data...</h2>
                    <p className="text-muted-foreground">Please wait while we fetch your information.</p>
                </div>
            </div>
        )
    }

    return (
         <>
            <div className={`transition-opacity duration-500 ${currentUser ? 'opacity-100' : 'opacity-100'}`}>
                {!currentUser ? <LoginScreen /> : <MainLayout />}
            </div>
            
            <ToastContainer />
        </>
    );
};

export default AppRoutes;