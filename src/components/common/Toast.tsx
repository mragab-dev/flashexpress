
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Toast } from '../../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '../Icons';

const ToastComponent: React.FC<{ toast: Toast }> = ({ toast }) => {
    const styles = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-primary-600',
    };
    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-white"/>,
        error: <XCircleIcon className="w-6 h-6 text-white"/>,
        info: <InformationCircleIcon className="w-6 h-6 text-white"/>,
    }

    return (
        <div className={`flex items-center gap-4 text-white p-4 pr-6 rounded-xl shadow-2xl animate-fade-in-up ${styles[toast.type]}`}>
           {icons[toast.type]}
           <p className="font-medium">{toast.message}</p>
        </div>
    );
};

export const ToastContainer = () => {
    const { toasts } = useAppContext();
    return (
        <div className="fixed bottom-8 right-8 z-[100] space-y-3">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} />
            ))}
        </div>
    );
};
