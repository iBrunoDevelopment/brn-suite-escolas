import React from 'react';

interface BanksSectionProps {
    bankAccounts: any[];
    programs: any[];
    schools: any[];
    newBank: any;
    setNewBank: (data: any) => void;
    editingBankId: string | null;
    setEditingBankId: (id: string | null) => void;
    onSave: () => void;
    onEdit: (bank: any) => void;
    onDelete: (id: string) => void;
    search: string;
    setSearch: (s: string) => void;
    filterProgram: string;
    setFilterProgram: (s: string) => void;
    filterSchool: string;
    setFilterSchool: (s: string) => void;
    loading: boolean;
}

const BanksSection: React.FC<BanksSectionProps> = ({
    bankAccounts, programs, schools,
    newBank, setNewBank, editingBankId, setEditingBankId,
    onSave, onEdit, onDelete,
    search, setSearch, filterProgram, setFilterProgram, filterSchool, setFilterSchool,
    loading
}) => {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Contas Bancárias da Instituição</h3>
                {editingBankId && (
                    <button onClick={() => { setEditingBankId(null); setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' }); }} className="text-xs text-primary hover:underline">Cancelar Edição</button>
                )}
            </div>

            <div className="bg-[#111a22] p-6 rounded-xl border border-surface-border flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="bank_display_name" className="text-xs text-slate-400">Nome Identificador (Ex: Conta PDDE Principal)</label>
                        <input id="bank_display_name" type="text" value={newBank.name} onChange={e => setNewBank({ ...newBank, name: e.target.value.toUpperCase() })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="bank_prog" className="text-xs text-slate-400">Vincular a Programa / Conta</label>
                        <select title="Vincular a Programa / Conta" aria-label="Vincular a Programa / Conta" id="bank_prog" value={newBank.program_id} onChange={e => setNewBank({ ...newBank, program_id: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none">
                            <option value="">Selecione...</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="bank_sc" className="text-xs text-slate-400">Escola Responsável</label>
                        <select title="Selecione a Unidade Escolar" aria-label="Selecione a Unidade Escolar" id="bank_school" value={newBank.school_id} onChange={e => setNewBank({ ...newBank, school_id: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-primary w-full shadow-inner">
                            <option value="">Selecione a Escola...</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="bank_fi" className="text-xs text-slate-400">Instituição Financeira (Banco)</label>
                        <input id="bank_fi" type="text" value={newBank.bank_name} onChange={e => setNewBank({ ...newBank, bank_name: e.target.value.toUpperCase() })} placeholder="Ex: Banco do Brasil" className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="bank_ag" className="text-xs text-slate-400">Agência</label>
                        <input id="bank_ag" type="text" value={newBank.agency} onChange={e => setNewBank({ ...newBank, agency: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="bank_acc" className="text-xs text-slate-400">Número da Conta</label>
                        <input id="bank_acc" type="text" value={newBank.account_number} onChange={e => setNewBank({ ...newBank, account_number: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    {editingBankId && (
                        <button onClick={() => { setEditingBankId(null); setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' }); }} className="bg-surface-dark border border-surface-border text-white px-6 py-2 rounded font-bold text-sm">Cancelar</button>
                    )}
                    <button onClick={onSave} className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded font-bold text-sm shadow-lg">
                        {editingBankId ? 'Salvar Alterações' : 'Cadastrar Conta'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input
                        aria-label="Buscar conta"
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar conta..."
                        className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    />
                </div>
                <div className="w-full md:w-56">
                    <select
                        title="Filtrar por Programa"
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
                        title="Filtrar por Escola"
                        aria-label="Filtrar por Escola"
                        value={filterSchool}
                        onChange={e => setFilterSchool(e.target.value)}
                        className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    >
                        <option value="">Todas as Escolas</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankAccounts
                    .filter(b =>
                        (!search || b.name.toLowerCase().includes(search.toLowerCase()) || b.bank_name.toLowerCase().includes(search.toLowerCase())) &&
                        (!filterProgram || b.program_id === filterProgram) &&
                        (!filterSchool || b.school_id === filterSchool)
                    )
                    .map(bank => (
                        <div key={bank.id} className="bg-[#111a22] p-5 rounded-xl border border-surface-border flex justify-between items-center group">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold">{bank.name}</span>
                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black uppercase">{bank.programs?.name}</span>
                                </div>
                                <span className="text-xs text-slate-400">{bank.bank_name} - Ag: {bank.agency} / Cc: {bank.account_number}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">{bank.schools?.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onEdit(bank)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors md:opacity-0 md:group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button onClick={() => onDelete(bank.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default BanksSection;
