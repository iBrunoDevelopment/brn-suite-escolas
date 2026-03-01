import * as React from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TransactionStatus, TransactionNature, User, UserRole } from '../../types';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../lib/imageUtils';
import { formatCurrency } from '../../lib/printUtils';

interface SplitItem {
    id: string; rubricId: string; rubricName: string; nature: TransactionNature; value: number; description: string;
}

interface EntryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    editingId: string | null;
    editingBatchId: string | null;
    auxData: any;
    accessibleSchools: any[];
    onSave: () => void;
}

const ENTRY_CATEGORIES = ['Repasse / Crédito', 'Rendimento de Aplicação', 'Reembolso / Estorno', 'Doação', 'Outros'];
const EXIT_CATEGORIES = [
    'Compra de Produtos',
    'Contratação de Serviços',
    'CONTRATO DE SERVIÇOS DE INTERNET',
    'CONTRATO DE AQUISIÇÃO DE GÁS DE COZINHA',
    'Tarifa Bancária',
    'Impostos / Tributos',
    'Devolução de Recurso (FNDE/Estado)',
    'Outros'
];
const ATTACHMENT_CATEGORIES = ['Nota Fiscal', 'Espelho da Nota', 'Comprovante', 'Extrato Bancário', 'CNPJ', 'Certidões', 'Certidão Municipal', 'Certidão Estadual', 'Certidão Federal', 'FGTS', 'Trabalhista', 'Outros'];

const EntryFormModal: React.FC<EntryFormModalProps> = ({
    isOpen,
    onClose,
    user,
    editingId,
    editingBatchId,
    auxData,
    accessibleSchools,
    onSave
}) => {
    // UI States
    const [activeTab, setActiveTab] = React.useState<'dados' | 'historico'>('dados');
    const [isUploading, setIsUploading] = React.useState(false);
    const { addToast } = useToast();

    // Form State
    const [type, setType] = React.useState<'Entrada' | 'Saída'>('Saída');
    const [category, setCategory] = React.useState('');
    const [selectedSchoolId, setSelectedSchoolId] = React.useState('');
    const [date, setDate] = React.useState('');
    const [selectedProgramId, setSelectedProgramId] = React.useState('');
    const [totalValue, setTotalValue] = React.useState('');
    const [mainDescription, setMainDescription] = React.useState('');
    const [selectedSupplierId, setSelectedSupplierId] = React.useState('');
    const [status, setStatus] = React.useState<TransactionStatus>(TransactionStatus.PENDENTE);
    const [invoiceDate, setInvoiceDate] = React.useState('');
    const [paymentDate, setPaymentDate] = React.useState('');
    const [selectedBankAccountId, setSelectedBankAccountId] = React.useState('');
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = React.useState('');
    const [documentNumber, setDocumentNumber] = React.useState('');
    const [authNumber, setAuthNumber] = React.useState('');
    const [attachments, setAttachments] = React.useState<any[]>([]);
    const [technicalProcess, setTechnicalProcess] = React.useState<any>(null);
    const [entryLogs, setEntryLogs] = React.useState<any[]>([]);
    const [linkedStatement, setLinkedStatement] = React.useState<any>(null);
    const [selectedContractId, setSelectedContractId] = React.useState('');
    const [schoolContracts, setSchoolContracts] = React.useState<any[]>([]);

    const [isSplitMode, setIsSplitMode] = React.useState(false);
    const [splitItems, setSplitItems] = React.useState<SplitItem[]>([]);
    const [singleRubricId, setSingleRubricId] = React.useState('');
    const [singleNature, setSingleNature] = React.useState<TransactionNature>(TransactionNature.CUSTEIO);

    const { programs, rubrics: allRubrics, suppliers, bankAccounts, paymentMethods } = auxData;

    const filteredRubrics = React.useMemo(() => {
        if (selectedProgramId && allRubrics) {
            return allRubrics.filter((r: any) => r.program_id === selectedProgramId);
        }
        return [];
    }, [selectedProgramId, allRubrics]);

    const isSimplified = React.useMemo(() => {
        const simplifiedCats = [
            'Tarifa Bancária',
            'Rendimento de Aplicação',
            'Devolução de Recurso (FNDE/Estado)',
            'Repasse / Crédito',
            'Doação',
            'Impostos / Tributos',
            'Reembolso / Estorno'
        ];
        return simplifiedCats.some(cat => category?.trim().toUpperCase() === cat.trim().toUpperCase());
    }, [category]);

    const isBankOp = React.useMemo(() => {
        const bankCats = ['Tarifa Bancária', 'Rendimento de Aplicação', 'Repasse / Crédito'];
        return bankCats.some(cat => category?.trim().toUpperCase() === cat.trim().toUpperCase());
    }, [category]);

    const attachLabel = type === 'Entrada' ? 'Anexar Comprovante de Crédito' : 'Anexar Documentos de Despesa';

    React.useEffect(() => {
        if (isOpen) {
            if (editingId || editingBatchId) {
                fetchEntryData();
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingId, editingBatchId]);

    // Force valid category when type changes
    React.useEffect(() => {
        if (!isOpen) return;
        const validCategories = type === 'Saída' ? EXIT_CATEGORIES : ENTRY_CATEGORIES;
        if (!validCategories.includes(category)) {
            setCategory(validCategories[0]);
        }
    }, [type, isOpen]);

    React.useEffect(() => {
        if (!isOpen || !selectedSchoolId || !selectedSupplierId) {
            setSchoolContracts([]);
            return;
        }
        const fetchContracts = async () => {
            const { data } = await supabase
                .from('supplier_contracts')
                .select('*, financial_entries(value)')
                .eq('school_id', selectedSchoolId)
                .eq('supplier_id', selectedSupplierId)
                .eq('status', 'Ativo');

            const processed = (data || []).map((c: any) => {
                const executed_value = (c.financial_entries || []).reduce((acc: number, entry: any) => acc + Math.abs(entry.value), 0);
                return { ...c, executed_value };
            });
            setSchoolContracts(processed);
        };
        fetchContracts();
    }, [selectedSchoolId, selectedSupplierId, isOpen]);

    const resetForm = () => {
        setType('Saída'); setCategory('Compra de Produtos'); setDate(new Date().toISOString().split('T')[0]);
        setTotalValue(''); setMainDescription(''); setSelectedSupplierId(''); setSelectedSchoolId(user.schoolId || '');
        setSelectedProgramId(''); setStatus(TransactionStatus.PENDENTE); setInvoiceDate('');
        setSelectedBankAccountId(''); setSelectedPaymentMethodId(''); setDocumentNumber(''); setAuthNumber('');
        setPaymentDate('');
        setAttachments([]); setTechnicalProcess(null); setLinkedStatement(null); setIsSplitMode(false); setSplitItems([]);
        setSingleRubricId(''); setSingleNature(TransactionNature.CUSTEIO); setActiveTab('dados');
        setSelectedContractId('');
    };

    const fetchEntryData = async () => {
        try {
            if (editingBatchId) {
                const { data: entries, error } = await supabase
                    .from('financial_entries')
                    .select('*, schools(name), programs(name), suppliers(name), bank_accounts(name, agency, account_number)')
                    .eq('batch_id', editingBatchId);

                if (error) throw error;
                if (entries && entries.length > 0) {
                    const first = entries[0];
                    setIsSplitMode(true);
                    setType(first.type === 'Entrada' ? 'Entrada' : 'Saída');
                    setCategory(first.category);
                    setSelectedSchoolId(first.school_id);
                    setSelectedProgramId(first.program_id);
                    setDate(first.date);
                    setStatus(first.status);
                    setInvoiceDate(first.invoice_date || '');
                    setSelectedBankAccountId(first.bank_account_id || '');
                    setSelectedPaymentMethodId(first.payment_method_id || '');
                    setDocumentNumber(first.document_number || '');
                    setAuthNumber(first.auth_number || '');
                    setPaymentDate(first.payment_date || '');
                    setAttachments(first.attachments || []);
                    setSelectedContractId(first.contract_id || '');
                    const descParts = first.description.split(' - ');
                    setMainDescription(descParts[0]);
                    setSplitItems(entries.map((e: any) => ({
                        id: e.id,
                        rubricId: e.rubric_id || '',
                        rubricName: e.rubrics?.name || '',
                        nature: e.nature,
                        value: Math.abs(e.value),
                        description: e.description.split(' - ')[1] || ''
                    })));
                    const total = entries.reduce((acc: number, e: any) => acc + Math.abs(e.value), 0);
                    setTotalValue(total.toString());
                    fetchLinkedStatement(first.bank_account_id, first.payment_date || first.date);
                }
            } else if (editingId) {
                const { data, error } = await supabase
                    .from('financial_entries')
                    .select('*, schools(name), programs(name), suppliers(name), bank_accounts(name, agency, account_number)')
                    .eq('id', editingId)
                    .single();

                if (error) throw error;
                if (data) {
                    setIsSplitMode(false);
                    setType(data.type === 'Entrada' ? 'Entrada' : 'Saída');
                    setCategory(data.category);
                    setSelectedSchoolId(data.school_id);
                    setSelectedProgramId(data.program_id);
                    setDate(data.date);
                    setTotalValue(Math.abs(data.value).toString());
                    setMainDescription(data.description);
                    setSelectedSupplierId(data.supplier_id || '');
                    setStatus(data.status);
                    setInvoiceDate(data.invoice_date || '');
                    setSelectedBankAccountId(data.bank_account_id || '');
                    setSelectedPaymentMethodId(data.payment_method_id || '');
                    setDocumentNumber(data.document_number || '');
                    setAuthNumber(data.auth_number || '');
                    setPaymentDate(data.payment_date || '');
                    setAttachments(data.attachments || []);
                    setSingleRubricId(data.rubric_id || '');
                    setSelectedContractId(data.contract_id || '');
                    setSingleNature(data.nature);
                    fetchLinkedStatement(data.bank_account_id, data.payment_date || data.date);
                }
            }
            fetchLogs();
            fetchTechnicalProcess();
        } catch (error: any) {
            addToast(`Erro ao carregar dados: ${error.message}`, 'error');
        }
    };

    // Re-fetch linked statement if account or date changes during editing
    React.useEffect(() => {
        if (isOpen && selectedBankAccountId && (paymentDate || date)) {
            fetchLinkedStatement();
        }
    }, [selectedBankAccountId, date, paymentDate]);

    const fetchLogs = async () => {
        const id = editingId || (editingBatchId ? editingBatchId : null);
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .or(`entry_id.eq.${editingId},details.ilike.%${editingBatchId}%`)
                .order('timestamp', { ascending: false });
            if (error) throw error;
            setEntryLogs(data || []);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        }
    };

    const fetchTechnicalProcess = async () => {
        if (!selectedSchoolId || !selectedProgramId || !date) return;
        try {
            const year = new Date(date).getFullYear();
            const { data, error } = await supabase
                .from('accountability_processes')
                .select('*')
                .eq('school_id', selectedSchoolId)
                .eq('program_id', selectedProgramId)
                .eq('year', year)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            setTechnicalProcess(data);
        } catch (error) {
            console.error('Erro ao buscar processo técnico:', error);
        }
    };

    const fetchLinkedStatement = async (accId?: string, entryDateStr?: string) => {
        const targetAccId = accId || selectedBankAccountId;
        const targetDate = entryDateStr || paymentDate || date;

        if (!targetAccId || !targetDate) {
            setLinkedStatement(null);
            return;
        }

        try {
            // Get month and year from the date string (YYYY-MM-DD or similar)
            // Using split to avoid timezone shifts of new Date()
            const parts = targetDate.split('-');
            if (parts.length < 2) return;

            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);

            const { data, error } = await supabase
                .from('bank_statement_uploads')
                .select('*')
                .eq('bank_account_id', targetAccId)
                .eq('month', month)
                .eq('year', year)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setLinkedStatement(data);
        } catch (error) {
            console.error('Erro ao buscar extrato vinculado:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, cat: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            let fileToUpload: File | Blob = file;
            if (file.type.startsWith('image/')) {
                fileToUpload = await compressImage(file);
            }
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `entries/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, fileToUpload);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);
            const newAttachment = {
                id: Math.random().toString(),
                name: file.name,
                category: cat,
                url: publicUrl,
                timestamp: new Date().toISOString()
            };
            setAttachments([...attachments, newAttachment]);
            addToast('Upload concluído com sucesso!', 'success');
        } catch (error: any) {
            addToast(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(attachments.filter(a => a.id !== id));
    };

    const handleSave = async () => {
        if (!selectedSchoolId || !selectedProgramId || !date || !totalValue || !mainDescription) {
            addToast('Preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        const valNum = parseFloat(totalValue);
        if (isNaN(valNum)) {
            addToast('Valor inválido.', 'warning');
            return;
        }
        if (isSplitMode) {
            const splitTotal = splitItems.reduce((acc, item) => acc + item.value, 0);
            if (Math.abs(splitTotal - valNum) > 0.01) {
                addToast(`A soma dos itens (R$ ${splitTotal.toFixed(2)}) deve ser igual ao valor total (R$ ${valNum.toFixed(2)}).`, 'warning');
                return;
            }
            if (splitItems.some(item => !item.nature || item.value <= 0)) {
                addToast('Todos os itens do rateio devem ter natureza e valor positivo.', 'warning');
                return;
            }
        } else {
            if (!singleNature) {
                addToast('A natureza é obrigatória.', 'warning');
                return;
            }
        }
        try {
            const batchId = editingBatchId || (isSplitMode ? Math.random().toString(36).substring(7) : null);
            let originalData: any = null;
            if (editingId) {
                const { data } = await supabase.from('financial_entries').select('*').eq('id', editingId).single();
                originalData = data;
            }
            if (isSplitMode) {
                if (editingBatchId) {
                    await supabase.from('financial_entries').delete().eq('batch_id', editingBatchId);
                }
                const entriesToSave = splitItems.map(item => ({
                    school_id: selectedSchoolId,
                    program_id: selectedProgramId,
                    date,
                    description: item.description ? `${mainDescription} - ${item.description.toUpperCase()}` : mainDescription,
                    value: item.value * (type === 'Saída' ? -1 : 1),
                    type, status, category, nature: item.nature, rubric_id: item.rubricId || null,
                    supplier_id: selectedSupplierId || null, bank_account_id: selectedBankAccountId || null,
                    payment_method_id: selectedPaymentMethodId || null, invoice_date: invoiceDate || null,
                    document_number: documentNumber || null, auth_number: authNumber || null,
                    payment_date: paymentDate || null,
                    attachments, batch_id: batchId,
                    contract_id: selectedContractId || null
                }));
                const { data: savedEntries, error } = await supabase.from('financial_entries').insert(entriesToSave).select();
                if (error) throw error;
                if (savedEntries && savedEntries.length > 0) {
                    await supabase.from('audit_logs').insert({
                        entry_id: savedEntries[0].id, user_name: user.name, action: editingBatchId ? 'UPDATE' : 'CREATE',
                        details: editingBatchId ? `Edição de lote (rateio) - ID Lote: ${batchId}` : `Criação de lote (rateio) - ID Lote: ${batchId}`
                    });
                }
            } else {
                const payload = {
                    school_id: selectedSchoolId, program_id: selectedProgramId, date, description: mainDescription,
                    value: valNum * (type === 'Saída' ? -1 : 1), type, status, category, nature: singleNature,
                    rubric_id: singleRubricId || null, supplier_id: selectedSupplierId || null,
                    bank_account_id: selectedBankAccountId || null, payment_method_id: selectedPaymentMethodId || null,
                    invoice_date: invoiceDate || null, document_number: documentNumber || null,
                    auth_number: authNumber || null, payment_date: paymentDate || null,
                    attachments, batch_id: null,
                    contract_id: selectedContractId || null
                };
                const { data: savedData, error } = editingId
                    ? await supabase.from('financial_entries').update(payload).eq('id', editingId).select().single()
                    : await supabase.from('financial_entries').insert([payload]).select().single();
                if (error) throw error;
                const savedId = savedData?.id;
                if (savedId) {
                    const changes: any = {};
                    if (editingId && originalData) {
                        const fields = ['description', 'value', 'status', 'date', 'category', 'nature', 'rubric_id', 'supplier_id', 'bank_account_id', 'payment_method_id', 'invoice_date', 'document_number', 'auth_number', 'payment_date'];
                        fields.forEach(f => { if (JSON.stringify(originalData[f]) !== JSON.stringify(payload[f as keyof typeof payload])) { changes[f] = { old: originalData[f], new: (payload as any)[f] }; } });
                    }
                    await supabase.from('audit_logs').insert({
                        entry_id: savedId, user_name: user.name, action: editingId ? 'UPDATE' : 'CREATE',
                        changes: editingId ? (Object.keys(changes).length > 0 ? changes : null) : null,
                        details: editingId ? 'Alteração de dados cadastrais' : 'Criação do lançamento'
                    });
                }
            }
            onSave();
            addToast('Lançamento salvo com sucesso!', 'success');
            onClose();
        } catch (err: any) {
            addToast(`Erro ao salvar: ${err.message}`, 'error');
        }
    };

    const schoolOptions = React.useMemo(() => accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>), [accessibleSchools]);
    const programOptions = React.useMemo(() => programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>), [programs]);
    const supplierOptions = React.useMemo(() => suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>), [suppliers]);
    const bankAccountOptions = React.useMemo(() => bankAccounts.filter((b: any) => b.school_id === selectedSchoolId && b.program_id === selectedProgramId).map((b: any) => (<option key={b.id} value={b.id}>{b.name} ({b.account_number})</option>)), [bankAccounts, selectedSchoolId, selectedProgramId]);
    const paymentMethodOptions = React.useMemo(() => paymentMethods.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>), [paymentMethods]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-[32px] shadow-2xl flex flex-col min-h-[600px] max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 md:p-8 border-b border-white/5 flex flex-col gap-6 shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">edit_note</span>
                            {editingId || editingBatchId ? 'Editar Lançamento' : 'Novo Lançamento'}
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    {(editingId || editingBatchId) && (
                        <div className="flex gap-1 bg-black/20 p-1 rounded-xl w-fit self-center">
                            <button onClick={() => setActiveTab('dados')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dados' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Dados Gerais</button>
                            <button onClick={() => setActiveTab('historico')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'historico' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Histórico ({entryLogs.length})</button>
                        </div>
                    )}
                </div>

                {activeTab === 'dados' ? (
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 custom-scrollbar">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setType('Saída')}
                                className={`flex-1 py-3 font-bold rounded-xl transition-all ${type === 'Saída' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-surface-dark text-slate-400'}`}
                            >
                                Saída
                            </button>
                            <button
                                onClick={() => setType('Entrada')}
                                className={`flex-1 py-3 font-bold rounded-xl transition-all ${type === 'Entrada' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-surface-dark text-slate-400'}`}
                            >
                                Entrada
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2"><label htmlFor="totalValue" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Valor R$</label><input id="totalValue" type="number" value={totalValue} onChange={e => setTotalValue(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white text-lg font-mono outline-none border border-white/5 focus:border-primary" /></div>
                            <div className="flex flex-col gap-2"><label htmlFor="entry_date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data</label><input id="entry_date" type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="entry_school_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Escola</label>
                                <select
                                    title="Selecione a Escola"
                                    id="entry_school_id"
                                    aria-label="Selecione a Escola"
                                    value={selectedSchoolId}
                                    onChange={e => setSelectedSchoolId(e.target.value)}
                                    className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                    disabled={user.role === UserRole.DIRETOR}
                                >
                                    <option value="">Selecione...</option>
                                    {schoolOptions}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="entry_category" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Categoria</label>
                                <select
                                    title="Selecione a Categoria"
                                    aria-label="Selecione a Categoria"
                                    id="entry_category"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                >
                                    {(type === 'Saída' ? EXIT_CATEGORIES : ENTRY_CATEGORIES).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="entry_program_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Programa</label>
                                <select
                                    title="Selecione o Programa"
                                    aria-label="Selecione o Programa"
                                    id="entry_program_id"
                                    value={selectedProgramId}
                                    onChange={e => setSelectedProgramId(e.target.value)}
                                    className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                >
                                    <option value="">Selecione...</option>
                                    {programOptions}
                                </select>
                            </div>
                            {!isSimplified && (
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="entry_supplier_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fornecedor</label>
                                    <select
                                        title="Selecione o Fornecedor"
                                        aria-label="Selecione o Fornecedor"
                                        id="entry_supplier_id"
                                        value={selectedSupplierId}
                                        onChange={e => setSelectedSupplierId(e.target.value)}
                                        className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                    >
                                        <option value="">Selecione...</option>
                                        {supplierOptions}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label htmlFor="main_description" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Descrição</label>
                            <input
                                id="main_description"
                                type="text"
                                value={mainDescription}
                                onChange={e => setMainDescription(e.target.value.toUpperCase())}
                                className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                placeholder={isBankOp ? "EX: TARIFA BANCÁRIA MENSAL" : "EX: COMPRA DE MATERIAIS"}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="entry_bank_account_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Conta Bancária</label>
                                <select
                                    title="Selecione a Conta Bancária"
                                    aria-label="Selecione a Conta Bancária"
                                    id="entry_bank_account_id"
                                    value={selectedBankAccountId}
                                    onChange={e => setSelectedBankAccountId(e.target.value)}
                                    className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                >
                                    <option value="">Selecione...</option>
                                    {bankAccountOptions}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="entry_payment_method_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Forma de Pagamento</label>
                                <select
                                    title="Selecione a Forma de Pagamento"
                                    aria-label="Selecione a Forma de Pagamento"
                                    id="entry_payment_method_id"
                                    value={selectedPaymentMethodId}
                                    onChange={e => setSelectedPaymentMethodId(e.target.value)}
                                    className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                                >
                                    <option value="">Selecione...</option>
                                    {paymentMethodOptions}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label htmlFor="entry_status" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Status</label>
                            <select
                                title="Selecione o Status"
                                aria-label="Selecione o Status"
                                id="entry_status"
                                value={status}
                                onChange={e => setStatus(e.target.value as TransactionStatus)}
                                className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"
                            >
                                <option value={TransactionStatus.PENDENTE}>Pendente</option>
                                <option value={TransactionStatus.PAGO}>Pago / Recebido</option>
                                <option value={TransactionStatus.CONCILIADO}>Conciliado</option>
                                <option value={TransactionStatus.ESTORNADO}>Estornado / Cancelado</option>
                            </select>
                        </div>
                        {!isSimplified && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="document_number" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nº Documento</label>
                                        <input id="document_number" type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="auth_number" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nº Autenticação</label>
                                        <input id="auth_number" type="text" value={authNumber} onChange={e => setAuthNumber(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="invoice_date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data da Nota</label>
                                        <input id="invoice_date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="payment_date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data do Pagamento</label>
                                        <input id="payment_date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
                            <div className="flex justify-between items-center"><h4 className="text-white font-bold">Classificação Financeira</h4><label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer"><input type="checkbox" aria-label="Ativar Rateio" checked={isSplitMode} onChange={e => setIsSplitMode(e.target.checked)} /> Ativar Rateio</label></div>
                            {isSplitMode ? (
                                <div className="flex flex-col gap-3">
                                    {splitItems.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 bg-white/[0.02] p-4 rounded-xl border border-white/5 relative group">
                                            <div className="flex flex-col md:flex-row gap-2">
                                                <div className="flex-1">
                                                    <label htmlFor={`entry_rubric_${idx}`} className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Rubrica</label>
                                                    <select
                                                        title="Selecione a Rubrica"
                                                        aria-label="Selecione a Rubrica"
                                                        id={`entry_rubric_${idx}`}
                                                        value={item.rubricId}
                                                        onChange={e => {
                                                            const ns = [...splitItems];
                                                            ns[idx].rubricId = e.target.value;
                                                            const rub = allRubrics.find((r: any) => r.id === e.target.value);
                                                            if (rub?.default_nature) ns[idx].nature = rub.default_nature as TransactionNature;
                                                            setSplitItems(ns);
                                                        }}
                                                        className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary"
                                                    >
                                                        <option value="">Nenhuma / Natureza Direta</option>
                                                        {filteredRubrics.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                                                    </select>
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <label htmlFor={`entry_nature_${idx}`} className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Natureza</label>
                                                    <select
                                                        title="Selecione a Natureza"
                                                        aria-label="Selecione a Natureza"
                                                        id={`entry_nature_${idx}`}
                                                        value={item.nature}
                                                        onChange={e => {
                                                            const ns = [...splitItems];
                                                            ns[idx].nature = e.target.value as TransactionNature;
                                                            setSplitItems(ns)
                                                        }}
                                                        className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary"
                                                    >
                                                        <option value={TransactionNature.CUSTEIO}>Custeio</option>
                                                        <option value={TransactionNature.CAPITAL}>Capital</option>
                                                    </select>
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <label htmlFor={`value_${idx}`} className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Valor R$</label>
                                                    <input id={`value_${idx}`} type="number" step="0.01" value={item.value} onChange={e => { const ns = [...splitItems]; ns[idx].value = parseFloat(e.target.value) || 0; setSplitItems(ns) }} className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none font-mono focus:border-primary" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1">
                                                    <label htmlFor={`desc_${idx}`} className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Comp. Descrição</label>
                                                    <input id={`desc_${idx}`} type="text" value={item.description} onChange={e => { const ns = [...splitItems]; ns[idx].description = e.target.value; setSplitItems(ns) }} className="bg-[#1e293b] text-white text-[10px] h-8 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary uppercase" placeholder="Ex: Item X" />
                                                </div>
                                                <button onClick={() => setSplitItems(splitItems.filter((_, i) => i !== idx))} className="mt-5 w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => setSplitItems([...splitItems, { id: Math.random().toString(), rubricId: '', rubricName: '', nature: TransactionNature.CUSTEIO, value: 0, description: '' }])} className="w-full py-3 rounded-xl border-2 border-dashed border-white/5 text-primary hover:border-primary/30 hover:bg-primary/5 transition-all font-bold text-xs flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">add_circle</span> Adicionar Nova Classificação
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label htmlFor="entry_single_rubric" className="sr-only">Rubrica</label>
                                        <select
                                            title="Selecione a Rubrica"
                                            aria-label="Selecione a Rubrica"
                                            id="entry_single_rubric"
                                            value={singleRubricId}
                                            onChange={e => {
                                                setSingleRubricId(e.target.value);
                                                const rub = allRubrics.find((r: any) => r.id === e.target.value);
                                                if (rub?.default_nature) setSingleNature(rub.default_nature as TransactionNature);
                                            }}
                                            className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none w-full border border-white/5 focus:border-primary"
                                        >
                                            <option value="">Nenhuma / Natureza Direta</option>
                                            {filteredRubrics.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="entry_single_nature" className="sr-only">Natureza</label>
                                        <select
                                            title="Selecione a Natureza"
                                            aria-label="Selecione a Natureza"
                                            id="entry_single_nature"
                                            value={singleNature}
                                            onChange={e => setSingleNature(e.target.value as TransactionNature)}
                                            className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none w-full border border-white/5 focus:border-primary"
                                        >
                                            <option value={TransactionNature.CUSTEIO}>Custeio</option>
                                            <option value={TransactionNature.CAPITAL}>Capital</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-white/5 pt-8 mt-4 bg-white/[0.01] -mx-4 md:-mx-8 px-4 md:px-8 pb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined">description</span></div>
                                    <div><h4 className="text-white font-bold">Documentação do Lançamento</h4><p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{attachLabel}</p></div>
                                </div>
                                {isUploading && (<div className="flex items-center gap-2 text-primary animate-pulse"><span className="material-symbols-outlined text-sm animate-spin">sync</span><span className="text-[10px] font-bold uppercase">Enviando...</span></div>)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const isImposto = category === 'Impostos / Tributos';
                                            const cats = [];

                                            // Guia para Impostos (Substitui Nota Fiscal)
                                            if (isImposto) {
                                                cats.push({ label: 'Guia (DARF/GPS)', icon: 'description' });
                                            }
                                            // Nota Fiscal apenas se NÃO for simplificado
                                            else if (!isSimplified) {
                                                cats.push({ label: 'Nota Fiscal', icon: 'receipt_long' });
                                                cats.push({ label: 'Espelho da Nota', icon: 'content_copy' });
                                            }

                                            // Comprovante: Obrigatório para Doação e Devolução, ou se não for simplificado
                                            if (['Doação', 'Devolução de Recurso (FNDE/Estado)'].includes(category) || !isSimplified) {
                                                cats.push({ label: 'Comprovante', icon: 'payments' });
                                            }

                                            // Extrato Bancário: Apenas para os simplificados (como solicitado: "só do extrato")
                                            if (isSimplified) {
                                                cats.push({ label: 'Extrato Bancário', icon: 'account_balance' });
                                            }

                                            // Certidões: Apenas se NÃO for simplificado
                                            if (!isSimplified) {
                                                cats.push({ label: 'Certidões', icon: 'verified' });
                                            }

                                            // Caso especial para Reembolso / Estorno (que não está no isSimplified mas pode precisar de extrato)
                                            if (category === 'Reembolso / Estorno' && !isSimplified) {
                                                cats.push({ label: 'Extrato Bancário', icon: 'account_balance' });
                                            }

                                            return cats.map(c => (
                                                <label key={c.label} className="cursor-pointer group flex flex-col items-center justify-center w-[calc(33.33%-8px)] aspect-square bg-white/5 border border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-center p-2">
                                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors mb-1">{c.icon}</span>
                                                    <span className="text-[8px] font-black text-slate-400 group-hover:text-white uppercase leading-tight">{c.label}</span>
                                                    <input type="file" aria-label={`Anexar ${c.label}`} className="hidden" onChange={e => handleFileUpload(e, c.label)} disabled={isUploading} />
                                                </label>
                                            ));
                                        })()}
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Arquivos Anexados ({attachments.length})</h5>
                                        {attachments.map(att => (
                                            <div key={att.id} className="flex items-center justify-between p-3 bg-black/40 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-slate-500 text-base">attachment</span></div><div className="min-w-0"><p className="text-xs text-white font-bold truncate max-w-[150px]">{att.name}</p><p className="text-[9px] text-primary font-black uppercase tracking-tighter">{att.category}</p></div></div>
                                                <div className="flex gap-1"><a href={att.url} target="_blank" className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><span className="material-symbols-outlined text-base">visibility</span></a><button onClick={() => removeAttachment(att.id)} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all"><span className="material-symbols-outlined text-base">delete</span></button></div>
                                            </div>
                                        ))}
                                        {linkedStatement && (
                                            <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all animate-in slide-in-from-left-2 ${linkedStatement.pdf_url ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'}`}>
                                                <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${linkedStatement.pdf_url ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}><span className="material-symbols-outlined text-base">account_balance</span></div><div className="min-w-0"><p className="text-xs text-white font-bold truncate max-w-[150px]">{linkedStatement.pdf_name || linkedStatement.file_name}</p><p className={`text-[9px] font-black uppercase tracking-tighter ${linkedStatement.pdf_url ? 'text-emerald-400' : 'text-amber-400'}`}>{linkedStatement.pdf_url ? 'Extrato Oficial (PDF)' : 'Extrato de Dados (OFX/CSV)'}</p></div></div>
                                                <a href={linkedStatement.pdf_url || linkedStatement.file_url} target="_blank" className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${linkedStatement.pdf_url ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-white' : 'hover:bg-amber-500/20 text-amber-400 hover:text-white'}`}><span className="material-symbols-outlined text-base">visibility</span></a>
                                            </div>
                                        )}
                                        {attachments.length === 0 && (<div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/[0.02] rounded-3xl"><span className="material-symbols-outlined text-3xl text-slate-700 mb-2">cloud_upload</span><p className="text-[10px] text-slate-600 font-bold uppercase">Nenhum documento anexado ainda</p></div>)}
                                    </div>
                                </div>
                            </div>

                            {schoolContracts.length > 0 && (
                                <div className="mt-6 p-6 md:p-8 bg-primary/5 border border-primary/20 rounded-[32px] overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <span className="material-symbols-outlined text-8xl">history_edu</span>
                                    </div>
                                    <label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4 block leading-none">Contrato de Repasse de Serviços</label>
                                    <div className="relative z-10">
                                        <select
                                            title="Selecione o Contrato"
                                            value={selectedContractId}
                                            onChange={e => {
                                                const contractId = e.target.value;
                                                setSelectedContractId(contractId);
                                                const contract = schoolContracts.find(c => c.id === contractId);
                                                if (contract) {
                                                    setSelectedProgramId(contract.program_id);
                                                    setSingleRubricId(contract.rubric_id || '');
                                                    setTotalValue(Math.abs(contract.monthly_value).toString());

                                                    // Format: 03/2025 - DESCRIPTION
                                                    const identifier = contract.contract_number
                                                        ? `${contract.contract_number} - ${contract.description}`
                                                        : contract.description;
                                                    setMainDescription(identifier.toUpperCase());
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl h-14 px-5 pr-12 text-white text-sm focus:border-primary outline-none transition-all appearance-none font-bold"
                                        >
                                            <option value="">Nenhum Contrato Selecionado</option>
                                            {schoolContracts.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.contract_number ? `${c.contract_number} - ` : ''}{c.description.substring(0, 60)}{c.description.length > 60 ? '...' : ''} ({formatCurrency(c.monthly_value)}/mês)
                                                </option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none">expand_more</span>
                                    </div>

                                    {selectedContractId && (
                                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {(() => {
                                                const c = schoolContracts.find(con => con.id === selectedContractId);
                                                if (!c) return null;
                                                const total = c.total_value || 0;
                                                const executed = c.executed_value || 0;
                                                const progress = total > 0 ? (executed / total) * 100 : 0;
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Execução do Contrato</p>
                                                                <p className="text-xs font-black text-white">{formatCurrency(executed)} <span className="opacity-40">/ {formatCurrency(total)}</span></p>
                                                            </div>
                                                            <p className={`text-xs font-black transition-colors duration-500 ${progress < 30 ? 'text-red-500' :
                                                                progress < 60 ? 'text-yellow-500' :
                                                                    progress < 90 ? 'text-orange-500' : 'text-green-500'
                                                                }`}>{progress.toFixed(1)}%</p>
                                                        </div>
                                                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                            <div
                                                                className={`h-full transition-all duration-500 ${progress < 30 ? 'bg-red-500' :
                                                                    progress < 60 ? 'bg-yellow-500' :
                                                                        progress < 90 ? 'bg-orange-500' : 'bg-green-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(100, progress)}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
                                                            <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                                                            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Saldo disponível para execução</p>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="flex flex-col gap-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                            {entryLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4"><span className="material-symbols-outlined text-5xl opacity-20">history_toggle_off</span><p className="text-sm italic">Nenhuma alteração registrada.</p></div>
                            ) : (
                                entryLogs.map((log, idx) => (
                                    <div key={log.id || idx} className="relative pl-10">
                                        <div className="absolute left-0 top-1.5 w-9 h-9 rounded-xl bg-[#1e293b] border border-white/10 flex items-center justify-center z-10"><span className="material-symbols-outlined text-[18px] text-primary">{log.action === 'CREATE' ? 'add_circle' : 'edit'}</span></div>
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div><span className="text-xs font-black text-white uppercase">{log.user_name || 'Sistema'}</span><p className="text-[10px] text-slate-500 mt-0.5">{new Date(log.timestamp).toLocaleString('pt-BR')}</p></div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{log.action === 'CREATE' ? 'Criação' : 'Alteração'}</span>
                                            </div>
                                            {log.changes ? (
                                                <div className="flex flex-col gap-2 mt-3">
                                                    {Object.entries(log.changes).map(([field, values]: [string, any]) => (
                                                        <div key={field} className="text-[11px] bg-black/20 rounded-lg p-2 border border-white/[0.02]"><span className="text-slate-500 font-bold uppercase">{field}:</span> <span className="text-red-400 line-through mx-1">{String(values.old)}</span> <span className="text-emerald-400">{String(values.new)}</span></div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic mt-2">{log.details || 'Sem detalhes adicionais.'}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 md:p-8 border-t border-white/5 flex justify-end gap-3 bg-blue-500/5 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-slate-400 hover:bg-white/5 font-bold transition-all">Cancelar</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">Salvar Lançamento</button>
                </div>
            </div>
        </div>
    );
};

export default EntryFormModal;
