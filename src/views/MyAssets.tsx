import React from 'react';
import { useAppContext } from '../context/AppContext';
import { AssetStatus, Permission } from '../types';
import { TagIcon, CheckCircleIcon, CogIcon } from '../components/Icons';

const MyAssets = () => {
    const { currentUser, assets, hasPermission } = useAppContext();

    if (!hasPermission(Permission.VIEW_OWN_ASSETS)) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-slate-800">No Assets to Display</h2>
                <p className="text-slate-600">You do not have permission to view assets.</p>
            </div>
        );
    }

    const myAssets = assets.filter(asset => asset.assignedToUserId === currentUser?.id);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">My Assigned Assets</h1>
                <p className="text-slate-500 mt-1">A list of all company assets currently assigned to you.</p>
            </div>

            {myAssets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm text-center p-12">
                    <TagIcon className="w-16 h-16 mx-auto text-slate-300" />
                    <h3 className="mt-4 text-xl font-semibold text-slate-800">No Assets Assigned</h3>
                    <p className="mt-1 text-slate-500">You do not currently have any company assets assigned to your account.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myAssets.map(asset => (
                        <div key={asset.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-primary-500">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-slate-800">{asset.name}</h3>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">{asset.type}</span>
                            </div>
                            <p className="font-mono text-sm text-slate-500 mt-1">{asset.identifier}</p>
                            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                                {asset.status === AssetStatus.ASSIGNED && (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircleIcon className="w-5 h-5" />
                                        <span className="text-sm font-semibold">Assigned to you</span>
                                    </div>
                                )}
                                {asset.status === AssetStatus.IN_REPAIR && (
                                     <div className="flex items-center gap-2 text-yellow-600">
                                        <CogIcon className="w-5 h-5 animate-spin" />
                                        <span className="text-sm font-semibold">In Repair</span>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400">
                                    Assigned: {asset.assignmentDate ? new Date(asset.assignmentDate).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyAssets;
