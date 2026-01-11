
import React from 'react';

interface FilterBarProps {
    filters: any;
    setFilters: (filters: any) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    quickFilter: string;
    setQuickFilter: (filter: string) => void;
    auxData: {
        schools: any[];
        programs: any[];
        suppliers: any[];
    };
    onPrintReport: () => void;
    onExportCSV: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    quickFilter,
    setQuickFilter,
    auxData,
    onPrintReport,
    onExportCSV
}) => {
    const clearFilters = () => {
        setFilters({
            school: '',
            program: '',
            supplier: '',
            startDate: '',
            endDate: '',
            nature: '',
            search: ''
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setQuickFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${quickFilter === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                >
                    Todos Lançamentos
                </button>
                <button
                    onClick={() => setQuickFilter('pending_today')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${quickFilter === 'pending_today' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-yellow-500/5 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10'}`}
                >
                    Pendentes de Hoje
                </button>
                <button
                    onClick={() => setQuickFilter('this_month')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${quickFilter === 'this_month' ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-500/5 text-blue-400 border-blue-500/20 hover:bg-blue-500/10'}`}
                >
                    Este Mês
                </button>
                <button
                    onClick={() => setQuickFilter('high_value')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${quickFilter === 'high_value' ? 'bg-red-500 text-white border-red-500' : 'bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500/10'}`}
                >
                    Alto Valor (± R$ 1k)
                </button>

                <div className="flex-1"></div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">{showFilters ? 'close' : 'filter_list'}</span>
                    {showFilters ? 'Fechar Filtros' : 'Filtros Avançados'}
                </button>
            </div>

            {showFilters && (
                <div className="bg-[#111a22] border border-surface-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 items-end animate-in fade-in slide-in-from-top-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Unidade Escolar</label>
                        <select
                            value={filters.school}
                            onChange={e => setFilters({ ...filters, school: e.target.value })}
                            className="w-full bg-[#1c2936] text-white text-xs h-10 px-3 rounded-xl border border-white/10 outline-none focus:border-primary"
                        >
                            <option value="">Todas as Escolas</option>
                            {auxData.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Programa / Recurso</label>
                        <select
                            value={filters.program}
                            onChange={e => setFilters({ ...filters, program: e.target.value })}
                            className="w-full bg-[#1c2936] text-white text-xs h-10 px-3 rounded-xl border border-white/10 outline-none focus:border-primary"
                        >
                            <option value="">Todos</option>
                            {auxData.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data Inicial</label>
                        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="w-full bg-[#1c2936] text-white text-xs h-10 px-3 rounded-xl border border-white/10 outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data Final</label>
                        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="w-full bg-[#1c2936] text-white text-xs h-10 px-3 rounded-xl border border-white/10 outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Natureza</label>
                        <select value={filters.nature} onChange={e => setFilters({ ...filters, nature: e.target.value })} className="w-full bg-[#1c2936] text-white text-xs h-10 px-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                            <option value="">Todas</option>
                            <option value="Custeio">Custeio</option>
                            <option value="Capital">Capital</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fornecedor</label>
                        <select value={filters.supplier} onChange={e => setFilters({ ...filters, supplier: e.target.value })} className="w-full bg-[#1c2936] text-white text-xs h-10 px-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                            <option value="">Todos</option>
                            {auxData.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-3 lg:col-span-4 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Pesquisar por Descrição</label>
                        <input type="text" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="w-full bg-[#1c2936] text-white text-xs h-10 px-4 rounded-xl border border-white/10 outline-none focus:border-primary" placeholder="Digite algo para buscar..." />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2 grid grid-cols-3 gap-2">
                        <button onClick={clearFilters} className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-tighter h-10 rounded-xl hover:bg-white/10 transition-colors">Limpar</button>
                        <button onClick={onPrintReport} className="bg-blue-600 border border-blue-500 text-white text-[10px] font-black uppercase tracking-tighter h-10 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">Relatório</button>
                        <button onClick={onExportCSV} className="bg-emerald-600 border border-emerald-500 text-white text-[10px] font-black uppercase tracking-tighter h-10 rounded-xl hover:bg-emerald-700 transition-colors">CSV</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterBar;
