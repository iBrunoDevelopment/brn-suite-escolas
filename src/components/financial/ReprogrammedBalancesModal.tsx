
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TransactionNature } from '../../types';

interface ReprogrammedBalancesModalProps {
    isOpen: boolean;
    onClose: () => void;
    reprogrammedBalances: any[];
    fetchReprogrammedBalances: () => void;
    accessibleSchools: any[];
    programs: any[];
    periods: any[];
}

const ReprogrammedBalancesModal: React.FC<ReprogrammedBalancesModalProps> = ({
    isOpen,
    onClose,
    reprogrammedBalances,
    fetchReprogrammedBalances,
    accessibleSchools,
    programs,
    periods
}) => {
    const [newReprogrammed, setNewReprogrammed] = useState({
        school_id: '', program_id: '', rubric_id: '', nature: TransactionNature.CUSTEIO, period: '', value: ''
    });
    const [isSavingReprogrammed, setIsSavingReprogrammed] = useState(false);
    const [reprogSearch, setReprogSearch] = useState('');
    const [reprogSchoolFilter, setReprogSchoolFilter] = useState('');

    const handleSaveReprogrammed = async () => {
        if (!newReprogrammed.school_id || !newReprogrammed.program_id || !newReprogrammed.value || !newReprogrammed.period) {
            alert('Escola, Programa, Ano/Período e Valor são obrigatórios.');
            return;
        }
        setIsSavingReprogrammed(true);
        try {
            const { error } = await supabase.from('reprogrammed_balances').upsert({
                school_id: newReprogrammed.school_id,
                program_id: newReprogrammed.program_id,
                rubric_id: newReprogrammed.rubric_id || null,
                nature: newReprogrammed.nature,
                period: newReprogrammed.period,
                value: parseFloat(newReprogrammed.value)
            });
            if (error) throw error;
            fetchReprogrammedBalances();
            setNewReprogrammed({ ...newReprogrammed, value: '', rubric_id: '' });
        } catch (error: any) {
            alert(`Erro ao salvar saldo reprogramado: ${error.message}`);
        } finally { setIsSavingReprogrammed(false); }
    };

    const handleDeleteReprogrammed = async (id: string) => {
        if (!confirm('Excluir este saldo reprogramado?')) return;
        await supabase.from('reprogrammed_balances').delete().eq('id', id);
        fetchReprogrammedBalances();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-4xl bg-[#0f172a] border border-blue-500/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh] md:max-h-[90vh]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-500/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <span className="material-symbols-outlined">restart_alt</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white px-2">Saldos Reprogramados</h3>
                            <p className="text-xs text-slate-400 px-2">Gerencie os saldos de exercícios anteriores</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto lg:overflow-hidden flex-1 custom-scrollbar">
                    {/* Form Area */}
                    <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex flex-col gap-4 text-xs h-fit lg:h-full lg:overflow-y-auto custom-scrollbar shrink-0 lg:shrink">
                        <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Novo Registro
                        </h4>
                        <label htmlFor="school_id" className="text-slate-400 uppercase font-black">Escola</label>
                        <select id="school_id" value={newReprogrammed.school_id} onChange={e => setNewReprogrammed({ ...newReprogrammed, school_id: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Selecione...</option>
                            {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <label htmlFor="program_id" className="text-slate-400 uppercase font-black">Programa</label>
                        <select id="program_id" value={newReprogrammed.program_id} onChange={e => setNewReprogrammed({ ...newReprogrammed, program_id: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Selecione...</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="nature" className="text-slate-400 uppercase font-black">Natureza</label>
                                <select id="nature" value={newReprogrammed.nature} onChange={e => setNewReprogrammed({ ...newReprogrammed, nature: e.target.value as TransactionNature })} className="bg-[#1e293b] rounded-lg h-10 px-2 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value={TransactionNature.CUSTEIO}>Custeio</option>
                                    <option value={TransactionNature.CAPITAL}>Capital</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="period" className="text-slate-400 uppercase font-black">Ano</label>
                                <select id="period" value={newReprogrammed.period} onChange={e => setNewReprogrammed({ ...newReprogrammed, period: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-2 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">...</option>
                                    {periods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <label htmlFor="reprog_value" className="text-slate-400 uppercase font-black">Valor R$</label>
                        <input id="reprog_value" type="number" step="0.01" value={newReprogrammed.value} onChange={e => setNewReprogrammed({ ...newReprogrammed, value: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-blue-500 font-mono text-lg" placeholder="0,00" />
                        <button onClick={handleSaveReprogrammed} disabled={isSavingReprogrammed} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[48px] py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2 shrink-0">
                            {isSavingReprogrammed ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : 'Salvar Saldo'}
                        </button>
                    </div>

                    {/* List Area */}
                    <div className="lg:col-span-2 flex flex-col gap-4 h-full lg:overflow-hidden min-h-[400px] lg:min-h-0">
                        <div className="flex flex-col md:flex-row gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">search</span>
                                <input
                                    aria-label="Buscar por escola ou programa"
                                    type="text"
                                    placeholder="Buscar por escola ou programa..."
                                    value={reprogSearch}
                                    onChange={e => setReprogSearch(e.target.value)}
                                    className="w-full bg-[#0f172a] h-9 pl-9 pr-3 rounded-lg text-xs text-white border border-white/10 focus:border-blue-500 outline-none placeholder:text-slate-600"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <select
                                    aria-label="Filtrar por Escola"
                                    value={reprogSchoolFilter}
                                    onChange={e => setReprogSchoolFilter(e.target.value)}
                                    className="w-full bg-[#0f172a] h-9 px-3 rounded-lg text-xs text-white border border-white/10 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Todas as Escolas</option>
                                    {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2 space-y-2 custom-scrollbar">
                            {reprogrammedBalances.filter(rb => {
                                const matchesSearch =
                                    rb.programs?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                    rb.schools?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                    rb.period.toLowerCase().includes(reprogSearch.toLowerCase());
                                const matchesSchool = !reprogSchoolFilter || rb.school_id === reprogSchoolFilter;
                                return matchesSearch && matchesSchool;
                            }).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-500 opacity-50">
                                    <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                                    <p className="text-xs">Nenhum saldo encontrado.</p>
                                </div>
                            ) : (
                                reprogrammedBalances
                                    .filter(rb => {
                                        const matchesSearch =
                                            rb.programs?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                            rb.schools?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                            rb.period.toLowerCase().includes(reprogSearch.toLowerCase());
                                        const matchesSchool = !reprogSchoolFilter || rb.school_id === reprogSchoolFilter;
                                        return matchesSearch && matchesSchool;
                                    })
                                    .map(rb => (
                                        <div key={rb.id} className="bg-white/5 hover:bg-white/10 p-4 rounded-xl flex justify-between items-center group transition-all border border-transparent hover:border-white/10">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">{rb.period}</span>
                                                    <span className="text-white font-bold text-sm truncate max-w-[200px] md:max-w-xs" title={rb.programs?.name}>{rb.programs?.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[10px]">school</span>
                                                    {rb.schools?.name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">{rb.nature}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">{rb.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                <button onClick={() => handleDeleteReprogrammed(rb.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReprogrammedBalancesModal;
