import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

export interface BankTransaction {
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

export const useBankReconciliation = (user: User) => {
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [systemEntries, setSystemEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Aux Data
    const [schools, setSchools] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [rubrics, setRubrics] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    // Selection/Filters
    const [selectedSchoolId, setSelectedSchoolId] = useState(user.schoolId || '');
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [uploadType, setUploadType] = useState<'corrente' | 'investimento'>('corrente');

    // Modals & UI State
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showManualMatch, setShowManualMatch] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const [quickCreateBT, setQuickCreateBT] = useState<BankTransaction | null>(null);
    const [manualMatchBT, setManualMatchBT] = useState<BankTransaction | null>(null);
    const [manualSearch, setManualSearch] = useState('');
    const [quickForm, setQuickForm] = useState({ program_id: '', rubric_id: '', supplier_id: '', description: '', nature: 'Custeio' });

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

    const parseOFX = (text: string, uploadType: 'corrente' | 'investimento') => {
        const newTransactions: BankTransaction[] = [];
        const stmtRows = text.split('<STMTTRN>');
        stmtRows.shift();

        stmtRows.forEach((row, index) => {
            const trntype = row.match(/<TRNTYPE>(.*)/)?.[1]?.trim();
            const dtposted = row.match(/<DTPOSTED>(.*)/)?.[1]?.trim();
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

        return newTransactions;
    };

    const parseCSV = (text: string, fileName: string, uploadType: 'corrente' | 'investimento') => {
        const rows = text.split('\n');
        const newTransactions: BankTransaction[] = [];
        let startIdx = 0;
        if (rows[0] && (rows[0].toLowerCase().includes('data') || rows[0].toLowerCase().includes('date'))) {
            startIdx = 1;
        }

        rows.slice(startIdx).forEach((row, index) => {
            const cols = row.split(/[,;]/);
            if (cols.length >= 3) {
                const dateRaw = cols[0]?.trim();
                const desc = cols[1]?.trim() || 'Sem descrição';
                const valueRaw = cols[2]?.trim();

                if (dateRaw && valueRaw) {
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

        return newTransactions;
    };

    const autoMatch = (parsedDocs: BankTransaction[], currentSystemEntries: any[]) => {
        return parsedDocs.map(bt => {
            const match = currentSystemEntries.find(se => {
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
    };

    const handleFileUpload = async (file: File) => {
        if (!selectedSchoolId || !selectedBankAccountId) {
            alert('Por favor, selecione a Escola e a Conta Bancária antes de importar o extrato.');
            return;
        }
        setLoading(true);
        try {
            const text = await file.text();
            let newTransactions: BankTransaction[] = [];

            if (file.name.toLowerCase().endsWith('.ofx')) {
                newTransactions = parseOFX(text, uploadType);
            } else if (file.name.toLowerCase().endsWith('.csv')) {
                newTransactions = parseCSV(text, file.name, uploadType);
            } else {
                alert('Por favor, envie um arquivo .OFX ou .CSV');
                return;
            }

            const combined = [...transactions];
            newTransactions.forEach(nt => {
                if (!combined.some(t => t.fitid === nt.fitid)) {
                    combined.push(nt);
                }
            });

            setTransactions(combined);

            // Sync entries after setting transactions
            let currentSystemEntries = systemEntries;
            const query = supabase.from('financial_entries')
                .select('*')
                .eq('is_reconciled', false)
                .eq('school_id', selectedSchoolId);
            const { data } = await (selectedBankAccountId ? query.eq('bank_account_id', selectedBankAccountId) : query);
            if (data) {
                setSystemEntries(data);
                currentSystemEntries = data;
            }

            const matched = autoMatch(combined, currentSystemEntries);
            setTransactions(matched);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
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
            supplier_id: '',
            description: bt.description,
            nature: suggestedNature as any
        });
        setShowQuickCreate(true);
    };

    const handleQuickCreate = async () => {
        if (!quickCreateBT || !selectedSchoolId || !selectedBankAccountId) return;

        setIsMatching(true);
        try {
            const { error } = await supabase.from('financial_entries').insert({
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
            });

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

    return {
        transactions, setTransactions,
        systemEntries,
        loading, isMatching,
        dragActive, setDragActive,
        schools, bankAccounts, programs, rubrics, suppliers,
        selectedSchoolId, setSelectedSchoolId,
        selectedBankAccountId, setSelectedBankAccountId,
        filterMonth, setFilterMonth,
        uploadType, setUploadType,
        showQuickCreate, setShowQuickCreate,
        showManualMatch, setShowManualMatch,
        showHelp, setShowHelp,
        showReport, setShowReport,
        quickCreateBT, setQuickCreateBT,
        manualMatchBT, setManualMatchBT,
        manualSearch, setManualSearch,
        quickForm, setQuickForm,
        handleFileUpload,
        handleConfirmMatch,
        handleBulkReconcile,
        handleQuickCreateStart,
        handleQuickCreate,
        fetchSystemEntries
    };
};
