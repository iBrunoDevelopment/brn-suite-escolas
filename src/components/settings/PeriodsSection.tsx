import React from 'react';

interface PeriodsSectionProps {
    periods: any[];
    newPeriod: any;
    setNewPeriod: (data: any) => void;
    isSavingPeriod: boolean;
    onSave: () => void;
    onToggle: (id: string, current: boolean) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

const PeriodsSection: React.FC<PeriodsSectionProps> = ({
    periods, newPeriod, setNewPeriod, isSavingPeriod, onSave, onToggle, onDelete, loading
}) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in">
            <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <span className="material-symbols-outlined text-3xl">calendar_month</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">Períodos do Sistema</h3>
                    <p className="text-slate-400 text-sm italic">Padronize os semestres e anos para registros de saldo e relatórios.</p>
                </div>
            </div>

            <div className="bg-[#111a22] p-6 rounded-2xl border border-surface-border flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="period_name" className="text-xs text-slate-400 font-bold uppercase mb-1 block">Nome do Período</label>
                        <input
                            id="period_name"
                            type="text"
                            value={newPeriod.name}
                            onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })}
                            placeholder="Ex: 2025.1 ou 2025 - 2º Semestre"
                            className="w-full bg-surface-dark border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={onSave}
                            disabled={isSavingPeriod}
                            className="w-full h-[46px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSavingPeriod ? 'Salvando...' : 'Adicionar Período'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {periods.map(p => (
                        <div key={p.id} className="bg-surface-dark border border-surface-border rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                                <span className={`font-bold ${p.is_active ? 'text-white' : 'text-slate-500'}`}>{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onToggle(p.id, p.is_active)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors ${p.is_active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}
                                >
                                    {p.is_active ? 'Ativo' : 'Inativo'}
                                </button>
                                <button
                                    onClick={() => onDelete(p.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {periods.length === 0 && !loading && (
                        <div className="md:col-span-2 text-center py-8 text-slate-500 italic border border-dashed border-slate-700 rounded-2xl">
                            Nenhum período cadastrado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PeriodsSection;
