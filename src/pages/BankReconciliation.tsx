
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole, TransactionNature } from '../types';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';

interface BankTransaction {
    id: string;
    date: string;
    description: string;
    value: number;
    type: 'C' | 'D'; // Credit or Debit
    fitid: string;  // Bank unique transaction ID
    matched_entry_id?: string;
    status: 'pending' | 'matched' | 'new';
    extract_type: 'corrente' | 'investimento';
}

const BankReconciliation: React.FC<{ user: User }> = ({ user }) => {
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [systemEntries, setSystemEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [schools, setSchools] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState(user.schoolId || '');
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [uploadType, setUploadType] = useState<'corrente' | 'investimento'>('corrente');
    const [programs, setPrograms] = useState<any[]>([]);
    const [rubrics, setRubrics] = useState<any[]>([]);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showManualMatch, setShowManualMatch] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [quickCreateBT, setQuickCreateBT] = useState<BankTransaction | null>(null);
    const [manualMatchBT, setManualMatchBT] = useState<BankTransaction | null>(null);
    const [manualSearch, setManualSearch] = useState('');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [quickForm, setQuickForm] = useState({ program_id: '', rubric_id: '', supplier_id: '', description: '', nature: 'Custeio' });

    const accessibleSchools = useAccessibleSchools(user, schools);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const [{ data: schoolsData }, { data: banksData }, { data: progs }, { data: rubs }, { data: suppliersData }] = await Promise.all([
            supabase.from('schools').select('id, name').order('name'),
            supabase.from('bank_accounts').select('*').order('name'),
            supabase.from('programs').select('id, name').order('name'),
            supabase.from('rubrics').select('id, name, program_id').order('name'),
            supabase.from('suppliers').select('id, name').order('name')
        ]);
        if (schoolsData) setSchools(schoolsData);
        if (banksData) setBankAccounts(banksData);
        if (progs) setPrograms(progs);
        if (rubs) setRubrics(rubs);
        if (suppliersData) setSuppliers(suppliersData);
    };

    const fetchSystemEntries = async () => {
        if (!selectedSchoolId) return;

        let query = supabase.from('financial_entries')
            .select('*')
            .eq('is_reconciled', false)
            .eq('school_id', selectedSchoolId);

        if (selectedBankAccountId) {
            query = query.eq('bank_account_id', selectedBankAccountId);
        }

        const { data } = await query;
        if (data) setSystemEntries(data);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        parseFile(file);
    };

    const parseFile = async (file: File) => {
        if (!selectedSchoolId || !selectedBankAccountId) {
            alert('Por favor, selecione a Escola e a Conta Bancária antes de importar o extrato.');
            return;
        }
        setLoading(true);
        try {
            const text = await file.text();
            if (file.name.toLowerCase().endsWith('.ofx')) {
                parseOFX(text, file.name);
            } else if (file.name.toLowerCase().endsWith('.csv')) {
                parseCSV(text, file.name);
            } else {
                alert('Por favor, envie um arquivo .OFX ou .CSV');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const parseOFX = (text: string, fileName: string) => {
        const newTransactions: BankTransaction[] = [];

        // Basic OFX Parser (Regex based for common tags)
        const stmtRows = text.split('<STMTTRN>');
        stmtRows.shift(); // Remove header

        stmtRows.forEach((row, index) => {
            const trntype = row.match(/<TRNTYPE>(.*)/)?.[1]?.trim();
            const dtposted = row.match(/<DTPOSTED>(.*)/)?.[1]?.trim(); // YYYYMMDD
            const trnamt = row.match(/<TRNAMT>(.*)/)?.[1]?.trim();
            const fitid = row.match(/<FITID>(.*)/)?.[1]?.trim() || `idx-${index}`;
            const memo = row.match(/<MEMO>(.*)/)?.[1]?.trim() || row.match(/<NAME>(.*)/)?.[1]?.trim() || 'Sem descrição';

            if (dtposted && trnamt) {
                const year = dtposted.substring(0, 4);
                const month = dtposted.substring(4, 6);
                const day = dtposted.substring(6, 8);
                const date = `${year}-${month}-${day}`;
                const value = parseFloat(trnamt.replace(',', '.'));

                newTransactions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    date,
                    description: memo,
                    value: Math.abs(value),
                    type: value > 0 ? 'C' : 'D',
                    fitid: uploadType === 'investimento' ? `INV-${fitid}` : fitid,
                    status: 'pending',
                    extract_type: uploadType
                });
            }
        });

        const combined = [...transactions];
        newTransactions.forEach(nt => {
            if (!combined.some(t => t.fitid === nt.fitid)) {
                combined.push(nt);
            }
        });

        setTransactions(combined);
        fetchSystemEntries().then(() => {
            autoMatch(combined);
        });
    };

    const parseCSV = (text: string, fileName: string) => {
        const rows = text.split('\n');
        const newTransactions: BankTransaction[] = [];

        // Detect and skip header if present
        let startIdx = 0;
        if (rows[0] && (rows[0].toLowerCase().includes('data') || rows[0].toLowerCase().includes('date'))) {
            startIdx = 1;
        }

        rows.slice(startIdx).forEach((row, index) => {
            const cols = row.split(/[,;]/); // Support both comma and semicolon
            if (cols.length >= 3) {
                // Heuristic mapping (Date, Description, Value)
                // We'll try to find which column is the date and which is the value
                const dateRaw = cols[0]?.trim();
                const desc = cols[1]?.trim() || 'Sem descrição';
                const valueRaw = cols[2]?.trim();

                if (dateRaw && valueRaw) {
                    // Try to normalize date YYYY-MM-DD or DD/MM/YYYY
                    let date = dateRaw;
                    if (dateRaw.includes('/')) {
                        const parts = dateRaw.split('/');
                        if (parts[0].length === 2) date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }

                    const cleanVal = valueRaw.replace(/[R$\s.]/g, '').replace(',', '.');
                    const value = parseFloat(cleanVal);

                    if (!isNaN(value)) {
                        newTransactions.push({
                            id: Math.random().toString(36).substr(2, 9),
                            date,
                            description: desc,
                            value: Math.abs(value),
                            type: value > 0 ? 'C' : 'D',
                            fitid: `csv-${fileName}-${index}`,
                            status: 'pending',
                            extract_type: uploadType
                        });
                    }
                }
            }
        });

        const combined = [...transactions];
        newTransactions.forEach(nt => {
            if (!combined.some(t => t.fitid === nt.fitid)) {
                combined.push(nt);
            }
        });

        setTransactions(combined);
        fetchSystemEntries().then(() => {
            autoMatch(combined);
        });
    };

    const autoMatch = (parsedDocs: BankTransaction[]) => {
        // Simple matching logic: same date (or +/- 3 days) and same absolute value
        const updated = parsedDocs.map(bt => {
            const match = systemEntries.find(se => {
                const dateDiff = Math.abs(new Date(se.date).getTime() - new Date(bt.date).getTime()) / (1000 * 60 * 60 * 24);
                const valueMatch = Math.abs(Number(se.value)) === bt.value;
                const typeMatch = (bt.type === 'C' && se.type === 'Entrada') || (bt.type === 'D' && se.type === 'Saída');
                return dateDiff <= 3 && valueMatch && typeMatch;
            });

            if (match) {
                return { ...bt, matched_entry_id: match.id, status: 'matched' as const };
            }
            return bt;
        });
        setTransactions(updated);
    };

    const handleConfirmMatch = async (bt: BankTransaction, customEntryId?: string) => {
        const entryId = customEntryId || bt.matched_entry_id;
        if (!entryId) return;

        setIsMatching(true);
        try {
            const { error } = await supabase
                .from('financial_entries')
                .update({
                    is_reconciled: true,
                    reconciled_at: new Date().toISOString(),
                    bank_transaction_ref: bt.fitid,
                    status: 'Pago'
                })
                .eq('id', entryId);

            if (error) throw error;

            setTransactions(prev => prev.filter(t => t.id !== bt.id));
            setSystemEntries(prev => prev.filter(e => e.id !== entryId));
            setShowManualMatch(false);
            setManualMatchBT(null);
        } catch (error) {
            alert('Erro ao conciliar: ' + (error as any).message);
        } finally {
            setIsMatching(false);
        }
    };

    const handleBulkReconcile = async () => {
        const matched = transactions.filter(t => t.status === 'matched' && t.matched_entry_id);
        if (matched.length === 0) return;

        if (!confirm(`Deseja conciliar ${matched.length} lançamentos identificados de uma vez?`)) return;

        setIsMatching(true);
        try {
            const updates = matched.map(bt =>
                supabase
                    .from('financial_entries')
                    .update({
                        is_reconciled: true,
                        reconciled_at: new Date().toISOString(),
                        bank_transaction_ref: bt.fitid,
                        status: 'Pago'
                    })
                    .eq('id', bt.matched_entry_id)
            );

            const results = await Promise.all(updates);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) {
                console.error(errors);
                alert('Alguns itens não puderam ser conciliados. Verifique o console.');
            }

            const matchedIds = matched.map(m => m.id);
            const matchedSystemIds = matched.map(m => m.matched_entry_id);

            setTransactions(prev => prev.filter(t => !matchedIds.includes(t.id)));
            setSystemEntries(prev => prev.filter(e => !matchedSystemIds.includes(e.id)));
        } catch (error) {
            alert('Erro na conciliação em lote: ' + (error as any).message);
        } finally {
            setIsMatching(false);
        }
    };

    const handleQuickCreateStart = (bt: BankTransaction) => {
        const desc = bt.description.toUpperCase();
        let suggestedProgramId = '';
        let suggestedRubricId = '';
        let suggestedNature = 'Custeio';

        // Intelligent Suggestions
        if (bt.extract_type === 'investimento' || desc.includes('RENDIMENTO') || desc.includes('APLIC') || desc.includes('JUROS')) {
            const rubric = rubrics.find(r => r.name.toUpperCase().includes('RENDIMENTO') || r.name.toUpperCase().includes('APLICAÇÃO'));
            if (rubric) {
                suggestedRubricId = rubric.id;
                suggestedProgramId = rubric.program_id;
            }
        } else if (desc.includes('TARIFA') || desc.includes('MANUT') || desc.includes('CESTA') || desc.includes('EXTRATO')) {
            const rubric = rubrics.find(r => r.name.toUpperCase().includes('TARIFA') || r.name.toUpperCase().includes('SERVIÇO'));
            if (rubric) {
                suggestedRubricId = rubric.id;
                suggestedProgramId = rubric.program_id;
            }
        } else if (desc.includes('DOC') || desc.includes('TED') || desc.includes('PIX') || desc.includes('PAG')) {
            // Expenses usually match some general rubric if none specific found
            const rubric = rubrics.find(r => r.name.toUpperCase().includes('CONSUMO') || r.name.toUpperCase().includes('SERVIÇO'));
            if (rubric) {
                suggestedRubricId = rubric.id;
                suggestedProgramId = rubric.program_id;
            }
        }

        setQuickCreateBT(bt);
        setQuickForm({
            program_id: suggestedProgramId,
            rubric_id: suggestedRubricId,
            description: bt.description,
            nature: suggestedNature as any
        });
        setShowQuickCreate(true);
    };

    const handleQuickCreate = async () => {
        if (!quickCreateBT || !selectedSchoolId || !selectedBankAccountId) return;

        setIsMatching(true);
        try {
            const { data, error } = await supabase.from('financial_entries').insert({
                school_id: selectedSchoolId,
                bank_account_id: selectedBankAccountId,
                date: quickCreateBT.date,
                description: quickForm.description || quickCreateBT.description,
                value: quickCreateBT.value,
                type: quickCreateBT.type === 'C' ? 'Entrada' : 'Saída',
                nature: quickForm.nature,
                program_id: quickForm.program_id,
                rubric_id: quickForm.rubric_id,
                supplier_id: quickForm.supplier_id || null,
                status: 'Pago',
                is_reconciled: true,
                reconciled_at: new Date().toISOString(),
                bank_transaction_ref: quickCreateBT.fitid
            }).select().single();

            if (error) throw error;

            setTransactions(prev => prev.filter(t => t.id !== quickCreateBT.id));
            setShowQuickCreate(false);
            setQuickCreateBT(null);
        } catch (error) {
            alert('Erro ao criar lançamento: ' + (error as any).message);
        } finally {
            setIsMatching(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <p className="text-slate-400 text-sm mt-1 italic">Compare seu extrato bancário com os lançamentos do sistema.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={() => setShowHelp(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                    <span className="material-symbols-outlined text-sm">help</span>
                    Como pedir os arquivos?
                </button>

                {/* School Filter */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Escola</label>
                    {user.schoolId ? (
                        <div className="bg-card-dark border border-white/5 rounded-xl px-4 py-2 text-xs text-white font-bold w-48 truncate">
                            {schools.find(s => s.id === user.schoolId)?.name || 'Minha Escola'}
                        </div>
                    ) : (
                        <select
                            value={selectedSchoolId}
                            onChange={e => { setSelectedSchoolId(e.target.value); setSelectedBankAccountId(''); }}
                            className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-48"
                        >
                            <option value="">Selecione a Escola</option>
                            {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                </div>

                {/* Bank Account Filter */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Conta Bancária</label>
                    <select
                        value={selectedBankAccountId}
                        disabled={!selectedSchoolId}
                        onChange={e => setSelectedBankAccountId(e.target.value)}
                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-56 disabled:opacity-50"
                    >
                        <option value="">Selecione a Conta</option>
                        {bankAccounts
                            .filter(acc => acc.school_id === selectedSchoolId)
                            .map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_number})</option>)
                        }
                    </select>
                </div>

                {/* Period Hint */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Mês de Referência</label>
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            {transactions.length === 0 ? (
                <div
                    className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-4 transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-white/10 bg-card-dark/30'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]); }}
                >
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-4xl">upload_file</span>
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-bold text-lg">Importar Extrato Bancário</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">Selecione o tipo e importe o extrato de <strong>{new Date(filterMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>.</p>
                    </div>

                    <div className="flex bg-black/20 p-1 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setUploadType('corrente')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadType === 'corrente' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Conta Corrente
                        </button>
                        <button
                            onClick={() => setUploadType('investimento')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadType === 'investimento' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Investimento
                        </button>
                    </div>

                    <label className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer transition-all active:scale-95 shadow-lg shadow-primary/20">
                        Selecionar Arquivo
                        <input type="file" className="hidden" accept=".ofx,.csv" onChange={handleFileUpload} />
                    </label>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Arquivos .OFX ou .CSV são suportados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Bank Transactions List */}
                    <div className="xl:col-span-12">
                        <div className="bg-card-dark rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Movimentações do Extrato</span>
                                    <label className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-500/20 transition-all">
                                        + Adicionar Outro Extrato (Investimento/CC)
                                        <input type="file" className="hidden" accept=".ofx,.csv" onChange={handleFileUpload} />
                                    </label>
                                    {transactions.some(t => t.status === 'matched') && !isMatching && (
                                        <button
                                            onClick={handleBulkReconcile}
                                            className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-[10px]">done_all</span>
                                            Conciliar {transactions.filter(t => t.status === 'matched').length} Identificados
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowReport(true)}
                                        disabled={transactions.length === 0}
                                        className="text-[10px] text-emerald-400 font-bold uppercase hover:underline disabled:opacity-50"
                                    >
                                        Gerar Termo de Conciliação
                                    </button>
                                    <button onClick={() => setTransactions([])} className="text-[10px] text-red-400 font-bold uppercase hover:underline">Limpar Tudo</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-black/20">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição no Banco</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Correspondência</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactions.map(bt => {
                                            const matchedEntry = systemEntries.find(e => e.id === bt.matched_entry_id);
                                            return (
                                                <tr key={bt.id} className="group hover:bg-white/[0.02] transition-all">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-white font-mono">{new Date(bt.date).toLocaleDateString('pt-BR')}</span>
                                                            <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md w-fit ${bt.extract_type === 'corrente' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                                {bt.extract_type === 'corrente' ? 'C. Corrente' : 'Investimento'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs text-white font-bold line-clamp-1">{bt.description}</span>
                                                        <span className="text-[9px] text-slate-600 font-mono">{bt.fitid}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs font-black ${bt.type === 'C' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {bt.type === 'C' ? '+' : '-'} {bt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {bt.status === 'matched' && matchedEntry ? (
                                                            <div className="flex flex-col gap-2 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-2xl relative group/card overflow-hidden">
                                                                <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-[8px] font-black text-white uppercase tracking-tighter rounded-bl-lg transform translate-x-1 -translate-y-1 group-hover/card:translate-x-0 group-hover/card:translate-y-0 transition-transform">95% Match</div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                                        <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-emerald-400 font-bold uppercase truncate max-w-[150px]">{matchedEntry.description}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[9px]">
                                                                    <span className="text-slate-500 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                                                        {new Date(matchedEntry.date).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                    <span className="text-emerald-500 font-black">
                                                                        {Number(matchedEntry.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-amber-500/50 italic p-3 border border-dashed border-amber-500/20 rounded-2xl">
                                                                <span className="material-symbols-outlined text-sm">search</span>
                                                                <span className="text-[10px] font-medium uppercase tracking-tighter">Nenhuma correspondência exata</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col gap-1">
                                                            {bt.status === 'matched' ? (
                                                                <button
                                                                    onClick={() => handleConfirmMatch(bt)}
                                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                                                                >
                                                                    Confirmar Lançamento
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleQuickCreateStart(bt)}
                                                                    className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                                                                >
                                                                    Criar Novo Lançamento
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => { setManualMatchBT(bt); setShowManualMatch(true); }}
                                                                className="px-4 py-1 text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Vincular Manualmente
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Quick Create Modal */}
            {
                showQuickCreate && quickCreateBT && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${quickCreateBT.type === 'C' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        <span className="material-symbols-outlined">{quickCreateBT.type === 'C' ? 'add_circle' : 'remove_circle'}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Lançamento Rápido</h3>
                                        <p className="text-slate-500 text-[10px] uppercase font-black">{quickCreateBT.description}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowQuickCreate(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data do Banco</label>
                                        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white font-mono">{new Date(quickCreateBT.date).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Valor</label>
                                        <div className={`bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-black ${quickCreateBT.type === 'C' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {quickCreateBT.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Descrição</label>
                                    <input
                                        type="text"
                                        value={quickForm.description}
                                        onChange={e => setQuickForm({ ...quickForm, description: e.target.value })}
                                        placeholder={quickCreateBT.description}
                                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Programa</label>
                                    <select
                                        value={quickForm.program_id}
                                        onChange={e => setQuickForm({ ...quickForm, program_id: e.target.value })}
                                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione o Programa</option>
                                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rubrica</label>
                                    <select
                                        value={quickForm.rubric_id}
                                        onChange={e => setQuickForm({ ...quickForm, rubric_id: e.target.value })}
                                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione a Rubrica</option>
                                        {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fornecedor (Opcional)</label>
                                    <select
                                        value={quickForm.supplier_id}
                                        onChange={e => setQuickForm({ ...quickForm, supplier_id: e.target.value })}
                                        className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione o Fornecedor</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <button
                                    onClick={handleQuickCreate}
                                    disabled={isMatching || !quickForm.program_id || !quickForm.rubric_id}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isMatching ? 'Processando...' : 'Confirmar Lançamento e Conciliar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Manual Match Modal */}
            {
                showManualMatch && manualMatchBT && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined">link</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Vincular Manualmente</h3>
                                        <p className="text-slate-500 text-[10px] uppercase font-black">Conciliando: {manualMatchBT.description} ({manualMatchBT.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowManualMatch(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-sm">search</span>
                                    <input
                                        type="text"
                                        value={manualSearch}
                                        onChange={e => setManualSearch(e.target.value)}
                                        placeholder="Buscar por descrição, valor ou código..."
                                        className="w-full bg-card-dark border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>

                                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex flex-col gap-2">
                                        {systemEntries
                                            .filter(e =>
                                                e.description.toLowerCase().includes(manualSearch.toLowerCase()) ||
                                                e.value.toString().includes(manualSearch) ||
                                                (manualMatchBT.type === 'C' ? e.type === 'Entrada' : e.type === 'Saída')
                                            )
                                            .sort((a, b) => {
                                                // Sort by similarity to the target value and date
                                                const aValDiff = Math.abs(Number(a.value) - manualMatchBT.value);
                                                const bValDiff = Math.abs(Number(b.value) - manualMatchBT.value);
                                                if (aValDiff !== bValDiff) return aValDiff - bValDiff;
                                                return new Date(b.date).getTime() - new Date(a.date).getTime();
                                            })
                                            .map(entry => (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => handleConfirmMatch(manualMatchBT, entry.id)}
                                                    className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex justify-between items-center transition-all group"
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-white font-bold group-hover:text-indigo-400 transition-colors uppercase">{entry.description}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] text-slate-500 font-mono">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 font-black uppercase tracking-tighter">
                                                                {entry.program}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-xs font-black ${entry.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {Number(entry.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Selecionar</span>
                                                    </div>
                                                </button>
                                            ))}
                                        {systemEntries.length === 0 && (
                                            <div className="py-12 text-center text-slate-500">
                                                <span className="material-symbols-outlined text-4xl mb-2 block opacity-20">inventory_2</span>
                                                <p className="text-xs">Nenhum lançamento em aberto encontrado para esta escola/conta.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Help Modal */}
            {
                showHelp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3 text-indigo-400">
                                    <span className="material-symbols-outlined text-2xl">info</span>
                                    <h3 className="text-white font-bold text-lg">Guia: Como solicitar os extratos</h3>
                                </div>
                                <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-2xl">close</span>
                                </button>
                            </div>
                            <div className="p-8 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.2em] mb-3">Por que não usar PDF?</h4>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            O PDF é um documento de "imagem". O sistema precisa exportar os dados reais para garantir que centavos não sejam perdidos e que a conciliação seja 100% precisa.
                                        </p>
                                    </section>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                                                <span className="material-symbols-outlined text-emerald-400">description</span>
                                                Arquivo OFX
                                            </div>
                                            <p className="text-slate-500 text-xs">É o formato financeiro universal. Nele, cada transação tem um ID único que evita lançamentos duplicados no sistema.</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                                                <span className="material-symbols-outlined text-blue-400">table_chart</span>
                                                Arquivo CSV / Excel
                                            </div>
                                            <p className="text-slate-500 text-xs">Formato de planilha. Se o banco não oferecer OFX, o CSV é a segunda melhor opção para o processamento automático.</p>
                                        </div>
                                    </div>

                                    <section className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl">
                                        <h4 className="text-white font-bold text-sm mb-4">Texto para enviar às escolas:</h4>
                                        <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-slate-300 relative select-all cursor-pointer group">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white text-[8px] px-2 py-1 rounded">CLIQUE PARA COPIAR</div>
                                            "Prezados, para agilizarmos a prestação de contas no sistema, solicitamos que ao enviarem o extrato mensal, exportem também o arquivo no formato **OFX** (preferencial) ou **CSV**. No seu Internet Banking, basta acessar o extrato e procurar pelo botão 'Exportar' ou 'Salvar como'. Não é necessário que seja apenas em PDF."
                                        </div>
                                    </section>

                                    <div className="space-y-2">
                                        <h4 className="text-slate-300 font-bold text-sm">Passo a passo nos principais bancos:</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="bg-white/5 p-3 rounded-xl text-[10px] text-slate-400"><strong>Banco do Brasil:</strong> Extrato &gt; Salvar em outros formatos &gt; OFX</div>
                                            <div className="bg-white/5 p-3 rounded-xl text-[10px] text-slate-400"><strong>Caixa:</strong> Extrato &gt; Exportar &gt; Gerar arquivo para Gerenciador Financeiro</div>
                                            <div className="bg-white/5 p-3 rounded-xl text-[10px] text-slate-400"><strong>Itaú:</strong> Extrato &gt; Salvar em outros formatos &gt; Money (OFX)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 border-top border-white/5 flex justify-end">
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Entendi, obrigado!
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            {/* Reconciliation Report Modal */}
            {showReport && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in transition-all">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col print:m-0 print:p-0 print:shadow-none print:w-full">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-start print:hidden">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Termo de Conciliação Bancária</h2>
                                <p className="text-slate-500 text-sm font-medium">Relatório detalhado para fins de prestação de contas.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">print</span>
                                    Imprimir PDF
                                </button>
                                <button
                                    onClick={() => setShowReport(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 overflow-y-auto p-12 print:p-8">
                            {/* School & Bank Header */}
                            <div className="flex flex-col gap-6 mb-12">
                                <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidade</span>
                                        <h1 className="text-xl font-black truncate">{schools.find(s => s.id === selectedSchoolId)?.name}</h1>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Referência</span>
                                        <span className="text-lg font-bold">{new Date(filterMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta Bancária</span>
                                        <span className="text-sm font-bold text-slate-700">
                                            {bankAccounts.find(acc => acc.id === selectedBankAccountId)?.bank_name} - {bankAccounts.find(acc => acc.id === selectedBankAccountId)?.name}
                                        </span>
                                        <span className="text-xs text-slate-500">Ag: {bankAccounts.find(acc => acc.id === selectedBankAccountId)?.agency} | Cta: {bankAccounts.find(acc => acc.id === selectedBankAccountId)?.account_number}</span>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Emissão</span>
                                        <span className="text-sm font-bold text-slate-700 font-mono">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-12 print:grid-cols-3">
                                <div className="p-6 rounded-2xl border-2 border-slate-100 flex flex-col gap-1 bg-white">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total no Extrato</span>
                                    <span className="text-xl font-black text-slate-800">
                                        {transactions.reduce((acc, t) => acc + (t.type === 'C' ? t.value : -t.value), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{transactions.length} movimentações</span>
                                </div>
                                <div className="p-6 rounded-2xl border-2 border-emerald-100 flex flex-col gap-1 bg-emerald-50/20">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Conciliados (Ok)</span>
                                    <span className="text-xl font-black text-emerald-600">
                                        {transactions.filter(t => t.status === 'matched' || t.status === 'new').length} Itens
                                    </span>
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase">Validado com o sistema</span>
                                </div>
                                <div className="p-6 rounded-2xl border-2 border-amber-100 flex flex-col gap-1 bg-amber-50/20">
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Pendentes</span>
                                    <span className="text-xl font-black text-amber-600">
                                        {transactions.filter(t => t.status === 'pending').length} Itens
                                    </span>
                                    <span className="text-[9px] text-amber-400 font-bold uppercase">Aguardando ação</span>
                                </div>
                            </div>

                            {/* Detailed Table */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-4">Detalhamento das Operações</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Bancária</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref. Sistema</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transactions.map(t => {
                                            const match = systemEntries.find(se => se.id === t.matched_entry_id);
                                            return (
                                                <tr key={t.id} className="text-xs">
                                                    <td className="px-4 py-4 font-mono text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">{t.description}</span>
                                                            <span className="text-[9px] text-slate-400 font-mono italic">{t.fitid}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`font-black ${t.type === 'C' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {t.type === 'C' ? '+' : '-'} {t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${t.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {t.status === 'matched' ? 'Conciliado' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-slate-400 italic">
                                                        {match ? match.description : '--'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Signatures */}
                            <div className="mt-24 grid grid-cols-2 gap-12 print:mt-16">
                                <div className="flex flex-col items-center gap-2 border-t border-slate-300 pt-4">
                                    <span className="text-xs font-bold text-slate-700">Diretor(a) Escolar</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Assinatura / Carimbo</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 border-t border-slate-300 pt-4">
                                    <span className="text-xs font-bold text-slate-700">Responsável Financeiro</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Assinatura / Carimbo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankReconciliation;
