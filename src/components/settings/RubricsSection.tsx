import React from 'react';

interface RubricsSectionProps {
    rubrics: any[];
    programs: any[];
    schools: any[];
    newRubric: any;
    setNewRubric: (data: any) => void;
    editingRubricId: string | null;
    setEditingRubricId: (id: string | null) => void;
    onSave: () => void;
    onEdit: (r: any) => void;
    onDelete: (id: string) => void;
    newProgram: any;
    setNewProgram: (data: any) => void;
    onCreateProgram: () => void;
    onDeleteProgram: (id: string) => void;
    search: string;
    setSearch: (s: string) => void;
    filterProgram: string;
    setFilterProgram: (s: string) => void;
    filterSchool: string;
    setFilterSchool: (s: string) => void;
    loading: boolean;
}

const RubricsSection: React.FC<RubricsSectionProps> = ({
    rubrics, programs, schools,
    newRubric, setNewRubric, editingRubricId, setEditingRubricId,
    onSave, onEdit, onDelete,
    newProgram, setNewProgram, onCreateProgram, onDeleteProgram,
    search, setSearch, filterProgram, setFilterProgram, filterSchool, setFilterSchool,
    loading
}) => {
    return (
        <div className="flex flex-col gap-10 animate-in fade-in">
            <div className="flex flex-col gap-6">
                <h3 className="text-xl font-bold text-white border-b border-surface-border pb-4 uppercase tracking-wider">Gestão de Rubricas (Itens de Despesa)</h3>

                <div className="bg-[#111a22] p-6 rounded-2xl border border-surface-border flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1 lg:col-span-2">
                            <label htmlFor="rubric_name" className="text-xs text-slate-400 font-bold uppercase">Nome da Rubrica</label>
                            <input
                                id="rubric_name"
                                type="text"
                                value={newRubric.name}
                                onChange={e => setNewRubric({ ...newRubric, name: e.target.value })}
                                placeholder="Ex: Material de Expediente"
                                className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rubric_program" className="text-xs text-slate-400 font-bold uppercase">Conta / Programa</label>
                            <select
                                id="rubric_program"
                                value={newRubric.program_id}
                                onChange={e => setNewRubric({ ...newRubric, program_id: e.target.value })}
                                className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                            >
                                <option value="">Selecione...</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rubric_school" className="text-xs text-slate-400 font-bold uppercase">Vincular a Escola (Opcional)</label>
                            <select
                                id="rubric_school"
                                value={newRubric.school_id}
                                onChange={e => setNewRubric({ ...newRubric, school_id: e.target.value })}
                                className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                            >
                                <option value="">Global (Todas as Escolas)</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Natureza Sugerida</label>
                            <div className="flex gap-2 h-full">
                                <button
                                    onClick={() => setNewRubric({ ...newRubric, default_nature: 'Custeio' })}
                                    className={`flex-1 h-[38px] rounded border text-xs font-bold transition-all ${newRubric.default_nature === 'Custeio' ? 'bg-primary text-white border-primary border-b-2' : 'border-surface-border text-slate-400'}`}
                                >Custeio</button>
                                <button
                                    onClick={() => setNewRubric({ ...newRubric, default_nature: 'Capital' })}
                                    className={`flex-1 h-[38px] rounded border text-xs font-bold transition-all ${newRubric.default_nature === 'Capital' ? 'bg-orange-600 text-white border-orange-600 border-b-2' : 'border-surface-border text-slate-400'}`}
                                >Capital</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                        {editingRubricId && (
                            <button onClick={() => { setEditingRubricId(null); setNewRubric({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' }); }} className="bg-surface-dark border border-surface-border text-white px-6 py-2 rounded font-bold text-sm shadow-lg transition-all">
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={onSave}
                            className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95"
                        >
                            {editingRubricId ? 'Salvar Alterações' : 'Cadastrar Rubrica'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mt-6">
                    <div className="flex-1">
                        <input
                            aria-label="Buscar rubrica"
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar rubrica..."
                            className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                    </div>
                    <div className="w-full md:w-56">
                        <select
                            aria-label="Filtrar por Programa"
                            value={filterProgram}
                            onChange={e => setFilterProgram(e.target.value)}
                            className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        >
                            <option value="">Todas as Contas</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:w-56">
                        <select
                            aria-label="Filtrar por Escola"
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                            className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        >
                            <option value="">Todas as Escolas</option>
                            <option value="Global">Global (Sem Escola)</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-2">
                    {loading ? (
                        <div className="text-white text-center py-10 opacity-50 flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined animate-spin">sync</span>
                            Carregando...
                        </div>
                    ) : (
                        rubrics
                            .filter(r =>
                                (!search || r.name.toLowerCase().includes(search.toLowerCase())) &&
                                (!filterProgram || r.program_id === filterProgram) &&
                                (!filterSchool || (filterSchool === 'Global' ? (!r.school_id) : r.school_id === filterSchool))
                            )
                            .map((r) => (
                                <div key={r.id} className="flex items-center p-4 bg-surface-dark border border-surface-border rounded-xl hover:border-slate-500 transition-colors group">
                                    <div className="flex-1 flex flex-col">
                                        <span className="font-bold text-white text-sm">{r.name}</span>
                                        <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">{r.programs?.name || 'Sem Conta'}</span>
                                    </div>

                                    <div className="w-48 hidden md:block">
                                        {r.schools ? (
                                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-400/5 px-2 py-1 rounded w-fit border border-emerald-400/20">
                                                <span className="material-symbols-outlined text-[14px]">school</span>
                                                {r.schools.name}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold px-2 py-1 italic">
                                                <span className="material-symbols-outlined text-[14px]">public</span>
                                                Global
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-32 text-right">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-b-2 ${r.default_nature === 'Capital' ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' : 'text-blue-400 border-blue-400/30 bg-blue-400/10'}`}>
                                            {r.default_nature || 'Custeio'}
                                        </span>
                                    </div>

                                    <div className="w-24 flex justify-end gap-2">
                                        <button onClick={() => onEdit(r)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button onClick={() => onDelete(r.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6 pt-10 border-t border-white/5">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Gestão de Programas / Contas</h3>
                <div className="bg-[#111a22] p-6 rounded-2xl border border-surface-border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 flex flex-col gap-1">
                            <label htmlFor="prog_name" className="text-xs text-slate-400 font-bold uppercase">Nome do Programa</label>
                            <input
                                id="prog_name"
                                type="text"
                                value={newProgram.name}
                                onChange={e => setNewProgram({ ...newProgram, name: e.target.value })}
                                placeholder="Ex: PDDE Básico"
                                className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={onCreateProgram}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-all h-[38px]"
                            >
                                Adicionar Programa
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                        {programs.map(p => (
                            <div key={p.id} className="bg-surface-dark border border-surface-border p-4 rounded-xl flex items-center justify-between group">
                                <span className="font-bold text-white text-sm">{p.name}</span>
                                <button onClick={() => onDeleteProgram(p.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RubricsSection;
