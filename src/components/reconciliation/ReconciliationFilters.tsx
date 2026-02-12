import React from 'react';
import { User } from '../../types';

interface ReconciliationFiltersProps {
    user: User;
    schools: any[];
    accessibleSchools: any[];
    bankAccounts: any[];
    selectedSchoolId: string;
    setSelectedSchoolId: (id: string) => void;
    selectedBankAccountId: string;
    setSelectedBankAccountId: (id: string) => void;
    filterMonth: string;
    setFilterMonth: (m: string) => void;
    onShowHelp: () => void;
    onShowHistory: () => void;
}

const ReconciliationFilters: React.FC<ReconciliationFiltersProps> = ({
    user, schools, accessibleSchools, bankAccounts,
    selectedSchoolId, setSelectedSchoolId,
    selectedBankAccountId, setSelectedBankAccountId,
    filterMonth, setFilterMonth,
    onShowHelp, onShowHistory
}) => {
    return (
        <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-card-dark/30 p-4 md:p-6 rounded-3xl border border-white/5 shadow-xl">
            <button
                onClick={onShowHelp}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all w-full md:w-auto justify-center"
            >
                <span className="material-symbols-outlined text-sm">help</span>
                Como pedir os arquivos?
            </button>

            <button
                onClick={onShowHistory}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all w-full md:w-auto justify-center border border-white/5"
            >
                <span className="material-symbols-outlined text-sm">history</span>
                Histórico
            </button>

            {/* School Filter */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label htmlFor="filter-school" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Escola</label>
                {user.schoolId ? (
                    <div className="bg-card-dark border border-white/5 rounded-xl px-4 py-2 text-xs text-white font-bold truncate">
                        {schools.find(s => s.id === user.schoolId)?.name || 'Minha Escola'}
                    </div>
                ) : (
                    <select
                        title="Selecione a Escola"
                        aria-label="Selecione a Escola"
                        id="filter-school"
                        value={selectedSchoolId}
                        onChange={e => { setSelectedSchoolId(e.target.value); setSelectedBankAccountId(''); }}
                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full"
                    >
                        <option value="">Selecione a Escola</option>
                        {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
            </div>

            {/* Bank Account Filter */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label htmlFor="filter-bank" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Conta Bancária</label>
                <select
                    title="Selecione a Conta Bancária"
                    aria-label="Selecione a Conta Bancária"
                    id="filter-bank"
                    value={selectedBankAccountId}
                    disabled={!selectedSchoolId}
                    onChange={e => setSelectedBankAccountId(e.target.value)}
                    className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full disabled:opacity-50"
                >
                    <option value="">Selecione a Conta</option>
                    {bankAccounts
                        .filter(acc => acc.school_id === selectedSchoolId)
                        .map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_number})</option>)
                    }
                </select>
            </div>

            {/* Period Filter (Month/Year Selects for Compatibility) */}
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Mês de Referência</label>
                <div className="flex gap-2">
                    <select
                        title="Selecionar Mês"
                        aria-label="Selecionar Mês"
                        value={filterMonth.split('-')[1] || ''}
                        onChange={e => {
                            const [y] = filterMonth.split('-');
                            setFilterMonth(`${y || new Date().getFullYear()}-${e.target.value}`);
                        }}
                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const m = (i + 1).toString().padStart(2, '0');
                            const label = new Date(2000, i).toLocaleString('pt-BR', { month: 'long' });
                            return <option key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                        })}
                    </select>
                    <select
                        title="Selecionar Ano"
                        aria-label="Selecionar Ano"
                        value={filterMonth.split('-')[0] || ''}
                        onChange={e => {
                            const [, m] = filterMonth.split('-');
                            setFilterMonth(`${e.target.value}-${m || (new Date().getMonth() + 1).toString().padStart(2, '0')}`);
                        }}
                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                        {Array.from({ length: 5 }, (_, i) => {
                            const y = (new Date().getFullYear() - 2 + i).toString();
                            return <option key={y} value={y}>{y}</option>;
                        })}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default ReconciliationFilters;
