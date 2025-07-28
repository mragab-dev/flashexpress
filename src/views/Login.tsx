

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { LogoIcon, MailIcon, KeyIcon } from '../components/Icons';

const LoginScreen = ({ onTrackPackageClick }: { onTrackPackageClick: () => void; }) => {
    const { login } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password);
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Panel: Branding & Image */}
            <div className="relative hidden lg:flex flex-col items-center justify-center p-12 bg-login-image text-white">
                <div className="absolute inset-0 bg-slate-900 opacity-60"></div>
                <div className="relative z-10 text-center">
                    <LogoIcon className="w-28 h-28 mx-auto" />
                    <h1 className="mt-6 text-4xl font-bold tracking-tight">Flash Express</h1>
                    <p className="mt-3 text-lg text-slate-300">Your world, delivered faster.</p>
                </div>
            </div>
            
            {/* Right Panel: Login Form */}
            <div className="flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-50">
                <div className="w-full max-w-md">
                    <div className="lg:hidden text-center mb-8">
                        <LogoIcon className="w-20 h-20 mx-auto" />
                        <h1 className="text-3xl font-bold text-slate-800 mt-4">Flash Express</h1>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Login</h2>
                    <p className="mt-2 text-slate-600">Enter your credentials to access your account.</p>
                    
                    <form onSubmit={handleLogin} className="mt-8 space-y-6">
                        {/* Email Input with Icon */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                            <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MailIcon className="h-5 w-5 text-slate-400" />
                                </span>
                                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="you@example.com" required />
                            </div>
                        </div>
                        
                        {/* Password Input with Icon */}
                        <div>
                            <label htmlFor="password"  className="block text-sm font-medium text-slate-700">Password</label>
                             <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <KeyIcon className="h-5 w-5 text-slate-400" />
                                </span>
                                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="••••••••" required />
                            </div>
                        </div>

                        <button type="submit" className="w-full flex justify-center bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-300">
                            Login
                        </button>
                    </form>
                    
                    <p className="text-center text-sm text-slate-500 mt-8">
                        Test with: <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">admin@flash.com</code> / <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">password123</code>
                    </p>
                     <div className="text-center mt-6 text-sm">
                        <span className="text-slate-600">Looking for your package? </span>
                        <button onClick={onTrackPackageClick} className="font-semibold text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-0">
                            Track your shipment here.
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;