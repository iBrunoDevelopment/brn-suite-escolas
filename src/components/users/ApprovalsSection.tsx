import React from 'react';
import { User, UserRole } from '../../types';

interface ApprovalsSectionProps {
    users: User[];
    onEdit: (u: User) => void;
}

const ApprovalsSection: React.FC<ApprovalsSectionProps> = ({ users, onEdit }) => {
    const pendingApprovals = users.filter(u => u.active === false || (u.role === UserRole.CLIENTE && !u.schoolId));

    return (
        <div className="card overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-primary/5">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">verified_user</span>
                    Usuários Aguardando Liberação
                </h3>
            </div>
            {pendingApprovals.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-20">sentiment_satisfied</span>
                    <p>Parabéns! Não há aprovações pendentes.</p>
                </div>
            ) : (
                <div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4">Nome / Email</th>
                                    <th className="px-6 py-4">Motivo da Retenção</th>
                                    <th className="px-6 py-4 text-right">Ação Rápida</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {pendingApprovals.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-100">
                                        <td className="px-6 py-4">
                                            <p className="font-bold">{u.name}</p>
                                            <p className="text-xs text-slate-400">{u.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {!u.active && <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">lock</span> CONTA INATIVA</span>}
                                                {u.role === UserRole.CLIENTE && !u.schoolId && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">school</span> SEM ESCOLA VINCULADA</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEdit(u)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-all flex items-center gap-2 ml-auto">
                                                <span className="material-symbols-outlined text-xs">how_to_reg</span> VINCULAR E ATIVAR
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                        {pendingApprovals.map(u => (
                            <div key={u.id} className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white leading-tight">{u.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">{u.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {!u.active && <span className="bg-rose-500/10 text-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter">INATIVA</span>}
                                        {u.role === UserRole.CLIENTE && !u.schoolId && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter">SEM VÍNCULO</span>}
                                    </div>
                                </div>
                                <button onClick={() => onEdit(u)} className="w-full py-3 bg-emerald-500 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/20">
                                    <span className="material-symbols-outlined text-sm">how_to_reg</span> VINCULAR E ATIVAR
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalsSection;
