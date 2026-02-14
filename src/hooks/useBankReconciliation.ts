import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, StatementUpload, TransactionStatus } from '../types';
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
    status: 'pending' | 'matched' | 'new' | 'reconciled';
    extract_type: 'Conta Corrente' | 'Conta Investimento';
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
    const [uploadType, setUploadType] = useState<'Conta Corrente' | 'Conta Investimento'>('Conta Corrente');

    // Modals & UI State
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showManualMatch, setShowManualMatch] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [showCapaModal, setShowCapaModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const [quickCreateBT, setQuickCreateBT] = useState<BankTransaction | null>(null);
    const [manualMatchBT, setManualMatchBT] = useState<BankTransaction | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [manualSearch, setManualSearch] = useState('');
    const [capaForm, setCapaForm] = useState({ revenue: 0, taxes: 0, balance: 0 });
    const [quickForm, setQuickForm] = useState({ program_id: '', rubric_id: '', supplier_id: '', description: '', nature: 'Custeio', category: 'Compras e Serviços' });
    const [showMonthStatus, setShowMonthStatus] = useState(false);

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

    // Auto-select bank account if only one exists for the school
    useEffect(() => {
        if (selectedSchoolId && !selectedBankAccountId && bankAccounts.length > 0) {
            const relevantAccounts = bankAccounts.filter((acc: any) => acc.school_id === selectedSchoolId);
            if (relevantAccounts.length === 1) {
                setSelectedBankAccountId(relevantAccounts[0].id);
            }
        }
    }, [selectedSchoolId, bankAccounts, selectedBankAccountId]);

    useEffect(() => {
        setShowMonthStatus(false);
    }, [selectedSchoolId, selectedBankAccountId, filterMonth]);

    const { data: systemEntries = [], isLoading: isLoadingSystem, refetch: fetchSystemEntries } = useQuery({
        queryKey: ['system_entries', selectedSchoolId, selectedBankAccountId, filterMonth],
        queryFn: async () => {
            if (!selectedSchoolId) return [];

            // Fetch entries for the selected month + 3 previous months to ensure we catch all pendings
            const [year, month] = filterMonth.split('-').map(Number);
            const startDate = new Date(year, month - 4, 1).toISOString().split('T')[0]; // Look back 3-4 months
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            let query = supabase.from('financial_entries')
                .select('*')
                .eq('school_id', selectedSchoolId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false })
                .limit(1000);

            if (selectedBankAccountId) {
                // Return entries that:
                // 1. Belong to this bank account OR have no account yet (NULL)
                // AND (Are NOT reconciled OR were reconciled via bank statement)
                query = query.or(`bank_account_id.eq.${selectedBankAccountId},bank_account_id.is.null`);
                query = query.or(`is_reconciled.eq.false,bank_transaction_ref.not.is.null`);
            } else {
                query = query.eq('is_reconciled', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedSchoolId
    });

    // Reactive Matching: Whenever system entries or transactions change, re-run matching logic.
    // This ensures that Quick Create results are reflected immediately.
    useEffect(() => {
        if (transactions.length > 0 && !isLoadingSystem) {
            const matched = autoMatch(transactions, systemEntries);
            const hasChanges = JSON.stringify(matched) !== JSON.stringify(transactions);
            if (hasChanges) {
                setTransactions(matched);
            }
        }
    }, [systemEntries, isLoadingSystem, transactions.length]); // Include length to trigger on upload

    // Mutations
    const reconcileMutation = useMutation({
        mutationFn: async ({ bt, entryId }: { bt: BankTransaction, entryId: string }) => {
            const { error } = await supabase
                .from('financial_entries')
                .update({
                    is_reconciled: true,
                    reconciled_at: new Date().toISOString(),
                    payment_date: bt.date, // Store the bank date as payment date
                    bank_transaction_ref: bt.fitid,
                    bank_account_id: selectedBankAccountId, // Ensure account is linked
                    status: TransactionStatus.CONCILIADO
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
                        payment_date: bt.date, // Store the bank date as payment date
                        bank_transaction_ref: bt.fitid,
                        bank_account_id: selectedBankAccountId, // Ensure account is linked
                        status: TransactionStatus.CONCILIADO
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
                program_id: form.program_id || null,
                rubric_id: form.rubric_id || null,
                supplier_id: form.supplier_id || null,
                category: form.category || 'Compras e Serviços',
                status: TransactionStatus.CONCILIADO,
                is_reconciled: true,
                reconciled_at: new Date().toISOString(),
                payment_date: bt.date, // Store the bank date as payment date
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

    const recordUploadMutation = useMutation({
        mutationFn: async ({ file, schoolId, bankAccountId, month, year, accountType, capaData, isPdf }: {
            file: File, schoolId: string, bankAccountId: string, month: number, year: number, accountType: string, capaData?: any, isPdf?: boolean
        }) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${schoolId}/${year}/${month}/${accountType.replace(' ', '_')}_${isPdf ? 'DOC' : 'DATA'}_${Date.now()}.${fileExt}`;
            const filePath = fileName;

            // 1. Upload to Storage (Using the 'statements' bucket as per db_schema)
            const { error: uploadError } = await supabase.storage.from('statements').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('statements').getPublicUrl(filePath);

            // 2. Fetch existing to merge (avoid losing PDF if uploading data OR vice versa)
            const { data: existing } = await supabase
                .from('bank_statement_uploads')
                .select('*')
                .eq('bank_account_id', bankAccountId)
                .eq('month', month)
                .eq('year', year)
                .eq('account_type', accountType)
                .maybeSingle();

            const payload: any = {
                ...(existing || {}),
                school_id: schoolId,
                bank_account_id: bankAccountId,
                month,
                year,
                account_type: accountType,
                uploaded_by: user.id
            };

            if (isPdf) {
                payload.pdf_url = publicUrl;
                payload.pdf_name = file.name;
            } else {
                payload.file_url = publicUrl;
                payload.file_name = file.name;
            }

            if (capaData) {
                payload.reported_revenue = capaData.revenue || 0;
                payload.reported_taxes = capaData.taxes || 0;
                payload.reported_balance = capaData.balance || 0;
            }

            // 3. Save record in database
            const { error: dbError } = await supabase.from('bank_statement_uploads').upsert(payload, {
                onConflict: 'bank_account_id, month, year, account_type'
            });

            if (dbError) throw dbError;

            return { publicUrl };
        }
    });

    // Parsing Logic
    const parseOFX = (text: string, fileName: string, uploadTypeShort: 'Conta Corrente' | 'Conta Investimento') => {
        const newTransactions: BankTransaction[] = [];

        // Use a more robust regex to find all <STMTTRN> blocks
        // It matches content starting with <STMTTRN> until the next <STMTTRN> or </STMTTRN> or end of file
        const blockRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
        let match;
        let blockIndex = 0;

        while ((match = blockRegex.exec(text)) !== null) {
            const block = match[1];

            const getTagValue = (tag: string) => {
                const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
                const m = block.match(regex);
                return m ? m[1].trim() : null;
            };

            const dtposted = getTagValue('DTPOSTED');
            const trnamt = getTagValue('TRNAMT');
            const rawFitid = getTagValue('FITID') || `fit-${blockIndex}`;
            const memoSymbol = getTagValue('MEMO') || getTagValue('NAME') || getTagValue('PAYEEID') || 'Sem descrição';

            if (dtposted && trnamt) {
                // Parse date (YYYYMMDD...)
                const year = dtposted.substring(0, 4);
                const month = dtposted.substring(4, 6);
                const day = dtposted.substring(6, 8);
                const date = `${year}-${month}-${day}`;

                // Parse amount (handle both . and ,)
                const amountValue = parseFloat(trnamt.replace(',', '.'));

                if (!isNaN(amountValue) && amountValue !== 0) {
                    const uniqueFitid = `${rawFitid}_${Math.abs(amountValue)}_${blockIndex}`;

                    newTransactions.push({
                        id: Math.random().toString(36).substring(2, 11),
                        date,
                        description: memoSymbol.toUpperCase(),
                        value: Math.abs(amountValue),
                        type: amountValue > 0 ? 'C' : 'D',
                        fitid: uniqueFitid,
                        status: 'new',
                        extract_type: uploadTypeShort
                    });
                }
            }
            blockIndex++;
        }

        // If block parsing failed, try a very permissive line-based split as fallback
        if (newTransactions.length === 0) {
            const legacyBlocks = text.split(/<STMTTRN>/i);
            legacyBlocks.shift();
            legacyBlocks.forEach((block, idx) => {
                const getTagValue = (tag: string) => {
                    const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
                    const m = block.match(regex);
                    return m ? m[1].trim() : null;
                };
                const dt = getTagValue('DTPOSTED');
                const amt = getTagValue('TRNAMT');
                if (dt && amt) {
                    const val = parseFloat(amt.replace(',', '.'));
                    if (!isNaN(val)) {
                        newTransactions.push({
                            id: Math.random().toString(36).substring(2, 11),
                            date: `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`,
                            description: (getTagValue('MEMO') || getTagValue('NAME') || 'Sem descrição').toUpperCase(),
                            value: Math.abs(val),
                            type: val > 0 ? 'C' : 'D',
                            fitid: `${getTagValue('FITID') || 'idx'}_${idx}`,
                            status: 'new',
                            extract_type: uploadTypeShort
                        });
                    }
                }
            });
        }

        // Filter out internal noise but keep everything else
        return newTransactions.filter(t => {
            const desc = t.description.toUpperCase();
            const isFee = /TAR|TARIFA|PIX|IMPOSTO|IOF|CPMF|JUROS|COMISS|MANUTEN/.test(desc);
            if (isFee) return true;

            const isInternal = /RESGATE AUTOMAT|APLICACAO AUTOMAT|APLIC AUTOMAT|RESG AUTOMAT|SALDO DIA|SDO CTA\/APL/.test(desc);
            return !isInternal;
        });
    };

    const parseCSV = (text: string, fileName: string, uploadTypeShort: 'Conta Corrente' | 'Conta Investimento') => {
        const rows = text.split(/\r?\n/).filter(row => row.trim().length > 0);
        const newTransactions: BankTransaction[] = [];
        let startIdx = 0;

        // Try to find header or start from 0 if it looks like data
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
                            extract_type: uploadTypeShort
                        });
                    }
                }
            }
        });
        return newTransactions;
    };

    const autoMatch = (parsedDocs: BankTransaction[], currentSystemEntries: any[]) => {
        return parsedDocs.map(bt => {
            // Priority 1: Exact FITID Match (Already processed)
            const exactMatch = currentSystemEntries.find(se => se.bank_transaction_ref === bt.fitid);
            if (exactMatch) {
                return {
                    ...bt,
                    matched_entry_id: exactMatch.id,
                    status: exactMatch.is_reconciled ? 'reconciled' : 'matched' as any
                };
            }

            // Priority 2: Date + Value Match
            const match = currentSystemEntries.find(se => {
                if (se.is_reconciled) return false; // Don't auto-match already reconciled if no FITID
                const systemDate = se.payment_date || se.date;
                const dateDiff = Math.abs(new Date(systemDate).getTime() - new Date(bt.date).getTime()) / (1000 * 60 * 60 * 24);
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

        const lowName = file.name.toLowerCase();

        // Investment PDF logic - Show Capa de Conferência first
        if (uploadType === 'Conta Investimento' && lowName.endsWith('.pdf')) {
            setPendingFile(file);
            setShowCapaModal(true);
            return;
        }

        try {
            const isPdf = lowName.endsWith('.pdf');
            const [year, month] = filterMonth.split('-').map(Number);

            // 1. Record the upload in DB and storage
            await recordUploadMutation.mutateAsync({
                file,
                schoolId: selectedSchoolId,
                bankAccountId: selectedBankAccountId,
                month,
                year,
                accountType: uploadType,
                isPdf
            });

            // If it's just a PDF, we stop here (no transaction parsing)
            if (isPdf) {
                setShowMonthStatus(true);
                return addToast('Extrato PDF vinculado como documento oficial do mês.', 'success');
            }

            // 2. Parse for conciliation (for data files)
            const text = await file.text();
            let newBatch: BankTransaction[] = [];
            if (lowName.endsWith('.ofx') || lowName.endsWith('.ofc')) newBatch = parseOFX(text, file.name, uploadType);
            else if (lowName.endsWith('.csv')) newBatch = parseCSV(text, file.name, uploadType);
            else return addToast('Para processar dados, use os formatos .OFX, .OFC ou .CSV.', 'error');

            const combined = [...transactions];
            let addedCount = 0;
            newBatch.forEach(nt => {
                if (!combined.some(t => t.fitid === nt.fitid)) {
                    combined.push(nt);
                    addedCount++;
                }
            });

            if (combined.length === 0) {
                return addToast('Nenhuma transação válida encontrada no arquivo. Verifique se o formato está correto.', 'warning');
            }

            const matched = autoMatch(combined, systemEntries);
            setTransactions(matched);

            if (addedCount > 0) {
                addToast(`${addedCount} novas transações processadas com sucesso!`, 'success');
            } else {
                addToast('Arquivo processado, mas todas as transações já tinham sido importadas.', 'info');
            }
        } catch (e: any) {
            console.error(e);
            addToast('Falha no upload/processamento: ' + e.message, 'error');
        }
    };

    const handleConfirmCapa = async () => {
        if (!pendingFile || !selectedSchoolId || !selectedBankAccountId) return;

        try {
            const [year, month] = filterMonth.split('-').map(Number);

            // 1. Record the upload and get the public URL
            const { publicUrl } = await recordUploadMutation.mutateAsync({
                file: pendingFile,
                schoolId: selectedSchoolId,
                bankAccountId: selectedBankAccountId,
                month,
                year,
                accountType: uploadType,
                capaData: capaForm,
                isPdf: true
            });

            // 2. Automate Net Income Entry
            const netIncome = (capaForm.revenue || 0) - (capaForm.taxes || 0);

            if (netIncome > 0) {
                // Determine the last day of the month for the entry
                const lastDay = new Date(year, month, 0).getDate();
                const entryDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                // Get program from bank account for fallback
                const bankAcc = auxData.bankAccounts.find((a: any) => a.id === selectedBankAccountId);

                // Seek a default rubric for "Rendimento" if possible
                const rendimentoRubric = auxData.rubrics.find((r: any) =>
                    r.name.toLowerCase().includes('rendimento') ||
                    r.name.toLowerCase().includes('aplicação')
                );

                await supabase.from('financial_entries').insert({
                    school_id: selectedSchoolId,
                    bank_account_id: selectedBankAccountId,
                    date: entryDate,
                    description: `Rendimento Líquido Aplicação - ${new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
                    value: netIncome,
                    type: 'Entrada',
                    nature: 'Custeio',
                    program_id: rendimentoRubric?.program_id || bankAcc?.program_id || null,
                    rubric_id: rendimentoRubric?.id || null,
                    payment_method_id: null, // Rendimento não tem tipo de pagamento
                    category: 'Rendimento de Aplicação',
                    status: TransactionStatus.CONCILIADO,
                    is_reconciled: true,
                    reconciled_at: new Date().toISOString(),
                    attachments: [{
                        id: Math.random().toString(),
                        name: pendingFile.name,
                        url: publicUrl,
                        type: 'pdf',
                        uploaded_at: new Date().toISOString()
                    }]
                });

                addToast('Rendimento líquido lançado e conciliado!', 'success');
                queryClient.invalidateQueries({ queryKey: ['system_entries'] });
            }

            addToast('Extrato de Investimento vinculado com sucesso!', 'success');
            setShowCapaModal(false);
            setPendingFile(null);
            setCapaForm({ revenue: 0, taxes: 0, balance: 0 });
        } catch (e: any) {
            addToast('Erro ao salvar conferência: ' + e.message, 'error');
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

        let suggestedCategory = 'Compras e Serviços';

        if (bt.extract_type === 'Conta Investimento' || desc.includes('RENDIMENTO') || desc.includes('APLIC') || desc.includes('INVEST')) {
            suggestedCategory = 'Rendimento de Aplicação';
            const r = findRubric('RENDIMENTO') || findRubric('APLICAÇÃO');
            if (r) {
                suggestedRubricId = r.id;
                suggestedProgramId = r.program_id;
                if ((r as any).default_nature) suggestedNature = (r as any).default_nature;
            }
        } else if (desc.includes('TARIFA') || desc.includes('CESTA') || desc.includes('MAN CC') || desc.includes('ENCARGO') || desc.includes('TAXA') || desc.includes('TAR PIX')) {
            suggestedCategory = 'Tarifa Bancária';
            const r = findRubric('TARIFA') || findRubric('SERVIÇO') || findRubric('BANCO');
            if (r) {
                suggestedRubricId = r.id;
                suggestedProgramId = r.program_id;
                if ((r as any).default_nature) suggestedNature = (r as any).default_nature;
            }
        } else if (desc.includes('REPASSE') || desc.includes('CRED OB') || desc.includes('DEPOSITO') || desc.includes('TED') || desc.includes('DOC') || desc.includes('CRED PIX')) {
            if (bt.type === 'C') suggestedCategory = 'Repasse / Crédito';
        }

        setQuickCreateBT(bt);
        setQuickForm({
            program_id: suggestedProgramId,
            rubric_id: suggestedRubricId,
            supplier_id: '',
            category: suggestedCategory,
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
        showCapaModal, setShowCapaModal,
        quickCreateBT, setQuickCreateBT,
        manualMatchBT, setManualMatchBT,
        manualSearch, setManualSearch,
        quickForm, setQuickForm,
        capaForm, setCapaForm,
        showHistory, setShowHistory,
        handleFileUpload,
        handleConfirmCapa,
        handleConfirmMatch,
        handleBulkReconcile,
        handleQuickCreateStart,
        handleQuickCreate,
        fetchSystemEntries,
        showMonthStatus,
        setShowMonthStatus
    };
};
