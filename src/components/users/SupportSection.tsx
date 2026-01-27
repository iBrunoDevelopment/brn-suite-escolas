import React from 'react';
import { SupportRequest } from '../../hooks/useUsers';

interface SupportSectionProps {
    requests: SupportRequest[];
    onUpdateStatus: (id: string, status: SupportRequest['status']) => void;
}

const SupportSection: React.FC<SupportSectionProps> = ({ requests, onUpdateStatus }) => {
    return (
        <div className="card overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-blue-500/5">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">support_agent</span>
                    Solicitações de Suporte (HelpDesk)
                </h3>
            </div>
            {requests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-slate-800 dark:text-slate-100">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-20">mark_email_read</span>
                    <p>Caixa de entrada vazia.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-700">
                    {requests.map(req => (
                        <div key={req.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all flex flex-col md:flex-row gap-6 text-slate-800 dark:text-slate-100">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${req.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : req.status === 'Em Atendimento' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                        {req.status}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">{new Date(req.created_at).toLocaleString('pt-BR')}</span>
                                </div>
                                <h4 className="font-bold flex flex-wrap items-center gap-2">
                                    {req.name} <span className="text-xs font-normal text-slate-500">({req.email})</span>
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-2xl italic border border-slate-200/50 dark:border-slate-700/50 leading-relaxed">
                                    "{req.message}"
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-primary font-bold text-xs"><span className="material-symbols-outlined text-xs">call</span> {req.phone}</div>
                            </div>
                            <div className="flex flex-row md:flex-col shrink-0 gap-2 items-start md:mt-6">
                                {req.status !== 'Resolvido' && (
                                    <>
                                        <button onClick={() => onUpdateStatus(req.id, 'Em Atendimento')} className="flex-1 md:flex-none px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-black rounded-lg border border-blue-500/30 uppercase transition-all active:scale-95">ATENDER</button>
                                        <button onClick={() => onUpdateStatus(req.id, 'Resolvido')} className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-500 text-[10px] font-black rounded-lg border border-emerald-500/30 uppercase transition-all active:scale-95">RESOLVER</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SupportSection;
