import React from 'react';
import { School } from '../../types';

interface ClosureSectionProps {
    closureSummary: any[];
    isCalculating: boolean;
    periodName: string;
    setPeriodName: (s: string) => void;
    onExecute: () => void;
    schools: School[];
}

const ClosureSection: React.FC<ClosureSectionProps> = ({ closureSummary, isCalculating, periodName, setPeriodName, onExecute, schools }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="card pb-8 overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-amber-500/5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><span className="material-symbols-outlined text-4xl">event_repeat</span></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Encerramento de Exercício</h3>
                                <p className="text-xs text-slate-500 mt-1 italic">Consolide os saldos atuais e inicie um novo semestre.</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <input type="text" placeholder="Nome do Novo Período" value={periodName} onChange={e => setPeriodName(e.target.value)} className="input-field w-full sm:w-64" />
                            <button onClick={onExecute} disabled={isCalculating || closureSummary.length === 0} className="btn-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 px-8 py-3 flex items-center gap-2 w-full sm:w-auto">
                                <span className="material-symbols-outlined">key_visualizer</span> Executar Encerramento
                            </button>
                        </div>
                    </div>
                </div>
                {isCalculating ? (
                    <div className="p-20 text-center"><span className="material-symbols-outlined animate-spin text-4xl text-amber-500">sync</span><p className="text-sm text-slate-500 mt-4">Calculando saldos...</p></div>
                ) : closureSummary.length === 0 ? (
                    <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest opacity-30"><span className="material-symbols-outlined text-6xl mb-4">info</span><p>Nenhum saldo pendente encontrado.</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-[#0f172a] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Escola / Unidade</th>
                                    <th className="px-8 py-4">Programa</th>
                                    <th className="px-8 py-4 text-right">Saldo Atual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-800 dark:text-slate-100">
                                {closureSummary.map((item, idx) => {
                                    const school = schools.find(s => s.id === item.school_id);
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.02]">
                                            <td className="px-8 py-4"><span className="text-sm font-bold">{school?.name || 'Não identificada'}</span></td>
                                            <td className="px-8 py-4"><span className="text-xs font-black text-slate-500 uppercase">{item.program_id ? item.program_id.slice(0, 8) : 'GERAL'}</span></td>
                                            <td className="px-8 py-4 text-right"><span className={`text-sm font-mono font-bold ${item.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.balance)}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClosureSection;
