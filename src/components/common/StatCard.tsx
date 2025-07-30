import React from 'react';

export const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
    onClick?: () => void;
}> = ({ title, value, icon, color, subtitle, onClick }) => (
    <div 
        className={`bg-white p-5 rounded-xl shadow-sm flex items-center justify-between border-l-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300' : ''}`} 
        style={{borderColor: color}}
        onClick={onClick}
    >
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10`} style={{ color: color, backgroundColor: `${color}1A` }}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-7 h-7' })}
        </div>
    </div>
);