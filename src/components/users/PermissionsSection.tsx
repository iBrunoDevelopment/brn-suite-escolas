import React from 'react';
import { UserRole, RolePermission } from '../../types';
import { getRoleBadgeColor } from './UserListSection';

interface PermissionsSectionProps {
    rolePermissions: RolePermission[];
    onTogglePermission: (role: UserRole, resource: RolePermission['resource'], field: string) => void;
    onReset: () => void;
}

const PermissionsSection: React.FC<PermissionsSectionProps> = ({ rolePermissions, onTogglePermission, onReset }) => {
    const resources = ['entries', 'schools', 'reports', 'settings', 'users'] as const;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={onReset} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">restart_alt</span> Restaurar Padrões
                </button>
            </div>
            <div className="card p-6 overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead>
                        <tr className="text-xs text-slate-400 uppercase font-black border-b border-slate-100 dark:border-slate-700">
                            <th className="py-4 px-4 w-48">Cargo</th>
                            {resources.map(res => <th key={res} className="py-4 px-4 text-center">{res}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {Object.values(UserRole).map(role => (
                            <tr key={role}>
                                <td className="py-6 px-4"><span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getRoleBadgeColor(role)}`}>{role}</span></td>
                                {resources.map(resource => {
                                    const perm = rolePermissions.find(rp => rp.role === role && rp.resource === resource);
                                    return (
                                        <td key={resource} className="py-6 px-4">
                                            <div className="flex flex-col gap-1 items-center">
                                                {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map(f => (
                                                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={perm ? (f === 'canView' ? perm.can_view : f === 'canCreate' ? perm.can_create : f === 'canEdit' ? perm.can_edit : perm.can_delete) : false}
                                                            onChange={() => onTogglePermission(role, resource, f)}
                                                            className="w-3 h-3 rounded"
                                                        />
                                                        <span className="text-[9px] font-bold uppercase text-slate-400">{f.replace('can', '')}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PermissionsSection;
