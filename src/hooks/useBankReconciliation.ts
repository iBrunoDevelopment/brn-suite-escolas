import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';

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
    const queryClient = useQueryClient();
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const { addToast } = useToast();

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

    // Queries
    const { data: auxData = {
        schools: [],
        bankAccounts: [],
        programs: [],
        rubrics: [],
        suppliers: []
    } } = useQuery({
        queryKey: ['reconciliation_aux'],
        queryFn: async () => {
            const [s, b, p, r, sup] = await Promise.all([
                supabase.from('schools').select('id, name').order('name'),
                supabase.from('bank_accounts').select('*').order('name'),
                supabase.from('programs').select('id, name').order('name'),
                supabase.from('rubrics').select('id, name, program_id').order('name'),
                supabase.from('suppliers').select('id, name').order('name')
            ]);
            return {
                schools: s.data || [],
                bankAccounts: b.data || [],
                programs: p.data || [],
                rubrics: r.data || [],
                suppliers: sup.data || []
            };
        },
        staleTime: 1000 * 60 * 30
    });

    const { schools, bankAccounts, programs, rubrics, suppliers } = auxData;

    const { data: systemEntries = [], isLoading: isLoadingSystem, refetch: fetchSystemEntries } = useQuery({
        queryKey: ['system_entries', selectedSchoolId, selectedBankAccountId],
        queryFn: async () => {
            if (!selectedSchoolId) return [];
            let query = supabase.from('financial_entries')
                .select('*')
                .eq('is_reconciled', false)
                .eq('school_id', selectedSchoolId);

            if (selectedBankAccountId) {
                query = query.eq('bank_account_id', selectedBankAccountId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedSchoolId
    });

    // Mutations
    const reconcileMutation = useMutation({
        mutationFn: async ({ bt, entryId }: { bt: BankTransaction, entryId: string }) => {
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
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['system_entries'] });
            setTransactions(prev => prev.filter(t => t.id !== variables.bt.id));
            setShowManualMatch(false);
            setManualMatchBT(null);
        }
    });

    const bulkReconcileMutation = useMutation({
        mutationFn: async (matchedList: BankTransaction[]) => {
            const updates = matchedList.map(bt =>
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
            if (errors.length > 0) throw new Error('Alguns lançamentos falharam na conciliação.');
        },
        onSuccess: (_, matchedList) => {
            queryClient.invalidateQueries({ queryKey: ['system_entries'] });
            const matchedIds = matchedList.map(m => m.id);
            setTransactions(prev => prev.filter(t => !matchedIds.includes(t.id)));
        }
    });

    const quickCreateMutation = useMutation({
        mutationFn: async ({ bt, form }: { bt: BankTransaction, form: any }) => {
            const { error } = await supabase.from('financial_entries').insert({
                school_id: selectedSchoolId,
                bank_account_id: selectedBankAccountId,
                date: bt.date,
                description: form.description || bt.description,
                value: bt.value,
                type: bt.type === 'C' ? 'Entrada' : 'Saída',
                nature: form.nature,
                program_id: form.program_id,
                rubric_id: form.rubric_id,
                supplier_id: form.supplier_id || null,
                status: 'Pago',
                is_reconciled: true,
                reconciled_at: new Date().toISOString(),
                bank_transaction_ref: bt.fitid
            });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['system_entries'] });
            setTransactions(prev => prev.filter(t => t.id !== variables.bt.id));
            setShowQuickCreate(false);
            setQuickCreateBT(null);
        }
    });

    // Parsing Logic
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
            return match ? { ...bt, matched_entry_id: match.id, status: 'matched' as const } : bt;
        });
    };

    // Public Handlers
    const handleFileUpload = async (file: File) => {
        if (!selectedSchoolId || !selectedBankAccountId) {
            addToast('Por favor, selecione a Escola e a Conta Bancária antes de importar o extrato.', 'warning');
            return;
        }

        try {
            const text = await file.text();
            let newBatch: BankTransaction[] = [];
            if (file.name.toLowerCase().endsWith('.ofx')) newBatch = parseOFX(text, uploadType);
            else if (file.name.toLowerCase().endsWith('.csv')) newBatch = parseCSV(text, file.name, uploadType);
            else return addToast('Apenas .OFX ou .CSV são aceitos.', 'error');

            const combined = [...transactions];
            newBatch.forEach(nt => {
                if (!combined.some(t => t.fitid === nt.fitid)) combined.push(nt);
            });

            // Perform auto-match using the latest systemEntries from Query
            const matched = autoMatch(combined, systemEntries);
            setTransactions(matched);
        } catch (e) {
            console.error(e);
        }
    };

    const handleConfirmMatch = async (bt: BankTransaction, customEntryId?: string) => {
        const entryId = customEntryId || bt.matched_entry_id;
        if (!entryId) return;
        reconcileMutation.mutate({ bt, entryId }, {
            onError: (err: any) => addToast('Erro ao conciliar: ' + err.message, 'error'),
            onSuccess: () => addToast('Conciliado com sucesso!', 'success')
        });
    };

    const handleBulkReconcile = async () => {
        const matched = transactions.filter(t => t.status === 'matched' && t.matched_entry_id);
        if (matched.length === 0) return;
        if (!confirm(`Deseja conciliar ${matched.length} lançamentos?`)) return;
        bulkReconcileMutation.mutate(matched, {
            onError: (err: any) => addToast('Erro na conciliação batch: ' + err.message, 'error'),
            onSuccess: () => addToast(`${matched.length} lançamentos conciliados!`, 'success')
        });
    };

    const handleQuickCreateStart = (bt: BankTransaction) => {
        const desc = bt.description.toUpperCase();
        let suggestedProgramId = '', suggestedRubricId = '', suggestedNature = 'Custeio';

        const findRubric = (term: string) => rubrics.find((r: any) => r.name.toUpperCase().includes(term));

        if (bt.extract_type === 'investimento' || desc.includes('RENDIMENTO') || desc.includes('APLIC')) {
            const r = findRubric('RENDIMENTO') || findRubric('APLICAÇÃO');
            if (r) { suggestedRubricId = r.id; suggestedProgramId = r.program_id; }
        } else if (desc.includes('TARIFA') || desc.includes('CESTA')) {
            const r = findRubric('TARIFA') || findRubric('SERVIÇO');
            if (r) { suggestedRubricId = r.id; suggestedProgramId = r.program_id; }
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
        quickCreateMutation.mutate({ bt: quickCreateBT, form: quickForm }, {
            onError: (err: any) => addToast('Erro: ' + err.message, 'error'),
            onSuccess: () => addToast('Lançamento criado e conciliado!', 'success')
        });
    };

    return {
        transactions, setTransactions,
        systemEntries,
        loading: isLoadingSystem,
        isMatching: reconcileMutation.isPending || bulkReconcileMutation.isPending || quickCreateMutation.isPending,
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
