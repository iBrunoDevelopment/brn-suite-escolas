
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TransactionStatus, TransactionNature, User, UserRole } from '../../types';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../lib/imageUtils';

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
    const [activeTab, setActiveTab] = useState<'dados' | 'historico'>('dados');
    const [isUploading, setIsUploading] = useState(false);
    const { addToast } = useToast();

    // Form State
    const [type, setType] = useState<'Entrada' | 'Saída'>('Saída');
    const [category, setCategory] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [date, setDate] = useState('');
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [totalValue, setTotalValue] = useState('');
    const [mainDescription, setMainDescription] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDENTE);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [authNumber, setAuthNumber] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [technicalProcess, setTechnicalProcess] = useState<any>(null);
    const [entryLogs, setEntryLogs] = useState<any[]>([]);
    const [linkedStatement, setLinkedStatement] = useState<any>(null);

    const [isSplitMode, setIsSplitMode] = useState(false);
    const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
    const [singleRubricId, setSingleRubricId] = useState('');
    const [singleNature, setSingleNature] = useState<TransactionNature>(TransactionNature.CUSTEIO);

    const { programs, rubrics: allRubrics, suppliers, bankAccounts, paymentMethods } = auxData;
    const [filteredRubrics, setFilteredRubrics] = useState<any[]>([]);

    const ENTRY_CATEGORIES = ['Repasse / Crédito', 'Rendimento de Aplicação', 'Reembolso / Estorno', 'Doação', 'Outros'];
    const EXIT_CATEGORIES = ['Compra de Produtos', 'Contratação de Serviços', 'Tarifa Bancária', 'Impostos / Tributos', 'Devolução de Recurso (FNDE/Estado)', 'Outros'];
    const ATTACHMENT_CATEGORIES = ['Nota Fiscal', 'Espelho da Nota', 'Comprovante', 'Extrato Bancário', 'CNPJ', 'Certidões', 'Certidão Municipal', 'Certidão Estadual', 'Certidão Federal', 'FGTS', 'Trabalhista', 'Outros'];

    // Derived states
    const isSimplified = category === 'Tarifa Bancária' || category === 'Rendimento de Aplicação';
    const isBankOp = isSimplified || category === 'Reembolso / Estorno' || category === 'Doação' || category === 'Outros';
    const attachLabel = isSimplified ? 'Documentação Simplificada' : 'Documentação Completa';

    // Effects
    useEffect(() => {
        if (selectedProgramId && allRubrics) {
            setFilteredRubrics(allRubrics.filter((r: any) => r.program_id === selectedProgramId));
        } else {
            setFilteredRubrics([]);
        }
    }, [selectedProgramId, allRubrics]);

    useEffect(() => {
        if (isOpen) {
            if (editingId || editingBatchId) {
                fetchEntryData();
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingId, editingBatchId]);

    const resetForm = () => {
        setType('Saída'); setCategory('Compra de Produtos'); setDate(new Date().toISOString().split('T')[0]);
        setTotalValue(''); setMainDescription(''); setSelectedSupplierId(''); setSelectedSchoolId(user.schoolId || '');
        setSelectedProgramId(''); setStatus(TransactionStatus.PENDENTE); setInvoiceDate('');
        setSelectedBankAccountId(''); setSelectedPaymentMethodId(''); setDocumentNumber(''); setAuthNumber('');
        setAttachments([]); setTechnicalProcess(null); setLinkedStatement(null); setIsSplitMode(false); setSplitItems([]);
        setSingleRubricId(''); setSingleNature(TransactionNature.CUSTEIO); setActiveTab('dados');
    };

    const fetchEntryData = async () => {
        if (editingBatchId) {
            const { data: batchItems } = await supabase.from('financial_entries').select('*').eq('batch_id', editingBatchId);
            if (batchItems && batchItems.length > 0) {
                const first = batchItems[0];
                setType(first.type);
                setCategory(first.category || '');
                setSelectedSchoolId(first.school_id);
                setDate(first.date);
                setSelectedProgramId(first.program_id);
                setStatus(first.status);
                setSelectedSupplierId(first.supplier_id || '');
                setInvoiceDate(first.invoice_date || '');
                setSelectedBankAccountId(first.bank_account_id || '');
                setSelectedPaymentMethodId(first.payment_method_id || '');
                setDocumentNumber(first.document_number || '');
                setAuthNumber(first.auth_number || '');
                setAttachments(first.attachments || []);

                // Logic for main description in batch
                let baseDesc = first.description;
                const splitData: SplitItem[] = batchItems.map(item => {
                    const rubric = allRubrics.find((r: any) => r.id === item.rubric_id);
                    // Try to extract original main desc
                    const dashIdx = item.description.lastIndexOf(' - ');
                    if (dashIdx > -1) baseDesc = item.description.substring(0, dashIdx);

                    return {
                        id: item.id,
                        rubricId: item.rubric_id,
                        rubricName: rubric?.name || '',
                        nature: item.nature,
                        value: Math.abs(item.value),
                        description: dashIdx > -1 ? item.description.substring(dashIdx + 3) : ''
                    };
                });
                setMainDescription(baseDesc);
                setTotalValue(splitData.reduce((acc, curr) => acc + curr.value, 0).toString());
                setIsSplitMode(true);
                setSplitItems(splitData);
                fetchEntryLogs(first.id);

                // Fetch linked statement if reconciled
                if (first.is_reconciled && first.bank_account_id) {
                    const entryDate = new Date(first.date);
                    const month = entryDate.getMonth() + 1;
                    const year = entryDate.getFullYear();
                    const { data: stmt } = await supabase.from('bank_statement_uploads')
                        .select('file_url, file_name, pdf_url, pdf_name')
                        .eq('bank_account_id', first.bank_account_id)
                        .eq('month', month)
                        .eq('year', year)
                        .maybeSingle();
                    if (stmt) setLinkedStatement(stmt);
                }
            }
        } else if (editingId) {
            const { data: entry } = await supabase.from('financial_entries').select('*').eq('id', editingId).single();
            if (entry) {
                setType(entry.type);
                setCategory(entry.category || '');
                setSelectedSchoolId(entry.school_id);
                setDate(entry.date);
                setSelectedProgramId(entry.program_id);
                setTotalValue(Math.abs(entry.value).toString());
                setMainDescription(entry.description);
                setSelectedSupplierId(entry.supplier_id || '');
                setStatus(entry.status);
                setInvoiceDate(entry.invoice_date || '');
                setSelectedBankAccountId(entry.bank_account_id || '');
                setSelectedPaymentMethodId(entry.payment_method_id || '');
                setDocumentNumber(entry.document_number || '');
                setAuthNumber(entry.auth_number || '');
                setAttachments(entry.attachments || []);
                setIsSplitMode(false);
                setSingleRubricId(entry.rubric_id || '');
                setSingleNature(entry.nature);
                fetchEntryLogs(entry.id);

                // Fetch linked statement if reconciled
                if (entry.is_reconciled && entry.bank_account_id) {
                    const entryDate = new Date(entry.date);
                    const month = entryDate.getMonth() + 1;
                    const year = entryDate.getFullYear();

                    const { data: stmt } = await supabase
                        .from('bank_statement_uploads')
                        .select('file_url, file_name, pdf_url, pdf_name')
                        .eq('bank_account_id', entry.bank_account_id)
                        .eq('month', month)
                        .eq('year', year)
                        .maybeSingle();

                    if (stmt) setLinkedStatement(stmt);
                }

                // Fetch technical process if exists
                const { data: process } = await supabase.from('accountability_processes').select('*').eq('financial_entry_id', entry.id).maybeSingle();
                if (process) setTechnicalProcess(process);
                else setTechnicalProcess(null);
            }
        }
    };

    const fetchEntryLogs = async (entryId: string) => {
        const { data } = await supabase.from('audit_logs').select('*').eq('entry_id', entryId).order('timestamp', { ascending: false });
        if (data) setEntryLogs(data);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Compress if it's an image
            const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `entries/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, processedFile);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);

            const newAttachment = {
                id: Math.random().toString(36).substring(7),
                name: file.name,
                url: publicUrl,
                category,
                timestamp: new Date().toISOString()
            };

            setAttachments(prev => [...prev, newAttachment]);
        } catch (error: any) {
            addToast(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleSave = async () => {
        if (!selectedSchoolId || !date || !selectedProgramId || !totalValue || !mainDescription) {
            return addToast('Preencha os campos obrigatórios: Escola, Data, Programa, Valor e Descritivo.', 'warning');
        }

        if (user.role === UserRole.DIRETOR && (editingId || editingBatchId)) {
            return addToast('O perfil de Diretor não tem permissão para editar lançamentos existentes.', 'error');
        }

        const valNum = parseFloat(totalValue);

        let originalData: any = null;
        if (editingId) {
            const { data } = await supabase.from('financial_entries').select('*').eq('id', editingId).single();
            originalData = data;
        }

        try {
            let savedId = editingId;
            if (isSplitMode) {
                const totalSplit = splitItems.reduce((acc, curr) => acc + curr.value, 0);
                if (Math.abs(totalSplit - valNum) > 0.01) {
                    return addToast(`O valor total das rubricas (R$ ${totalSplit.toFixed(2)}) deve ser igual ao valor total informado (R$ ${valNum.toFixed(2)}).`, 'warning');
                }

                if (splitItems.some(i => i.value <= 0)) {
                    return addToast('Todos os itens do rateio devem ter um valor maior que zero.', 'warning');
                }

                const batchId = editingBatchId || `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                if (editingBatchId) {
                    await supabase.from('financial_entries').delete().eq('batch_id', editingBatchId);
                }

                if (editingId) {
                    await supabase.from('financial_entries').delete().eq('id', editingId);
                }

                const entriesToSave = splitItems.map(item => ({
                    school_id: selectedSchoolId,
                    program_id: selectedProgramId,
                    date,
                    description: item.description ? `${mainDescription} - ${item.description.toUpperCase()}` : mainDescription,
                    value: item.value * (type === 'Saída' ? -1 : 1),
                    type,
                    status,
                    category,
                    nature: item.nature,
                    rubric_id: item.rubricId || null,
                    supplier_id: selectedSupplierId || null,
                    bank_account_id: selectedBankAccountId || null,
                    payment_method_id: selectedPaymentMethodId || null,
                    invoice_date: invoiceDate || null,
                    document_number: documentNumber || null,
                    auth_number: authNumber || null,
                    attachments,
                    batch_id: batchId
                }));

                const { data: savedEntries, error } = await supabase.from('financial_entries').insert(entriesToSave).select();
                if (error) throw error;

                if (savedEntries && savedEntries.length > 0) {
                    await supabase.from('audit_logs').insert({
                        entry_id: savedEntries[0].id,
                        user_name: user.name,
                        action: editingBatchId ? 'UPDATE' : 'CREATE',
                        details: editingBatchId ? `Edição de lote (rateio) - ID Lote: ${batchId}` : `Criação de lote (rateio) - ID Lote: ${batchId}`
                    });
                }
            } else {
                // Removed rubric requirement as nature is now the primary classification

                const payload = {
                    school_id: selectedSchoolId,
                    program_id: selectedProgramId,
                    date,
                    description: mainDescription,
                    value: valNum * (type === 'Saída' ? -1 : 1),
                    type,
                    status,
                    category,
                    nature: singleNature,
                    rubric_id: singleRubricId || null,
                    supplier_id: selectedSupplierId || null,
                    bank_account_id: selectedBankAccountId || null,
                    payment_method_id: selectedPaymentMethodId || null,
                    invoice_date: invoiceDate || null,
                    document_number: documentNumber || null,
                    auth_number: authNumber || null,
                    attachments,
                    batch_id: null
                };

                const { data: savedData, error } = editingId
                    ? await supabase.from('financial_entries').update(payload).eq('id', editingId).select().single()
                    : await supabase.from('financial_entries').insert([payload]).select().single();

                if (error) throw error;
                savedId = savedData?.id;

                if (savedId) {
                    const changes: any = {};
                    if (editingId && originalData) {
                        const fields = ['description', 'value', 'status', 'date', 'category', 'nature', 'rubric_id', 'supplier_id', 'bank_account_id', 'payment_method_id', 'invoice_date', 'document_number', 'auth_number'];
                        fields.forEach(f => {
                            if (JSON.stringify(originalData[f]) !== JSON.stringify(payload[f as keyof typeof payload])) {
                                changes[f] = { old: originalData[f], new: (payload as any)[f] };
                            }
                        });
                    }

                    await supabase.from('audit_logs').insert({
                        entry_id: savedId,
                        user_name: user.name,
                        action: editingId ? 'UPDATE' : 'CREATE',
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-[32px] shadow-2xl flex flex-col min-h-[600px] max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
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
                            <button onClick={() => setType('Saída')} className={`flex-1 py-3 font-bold rounded-xl transition-all ${type === 'Saída' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-surface-dark text-slate-400'}`}>Saída</button>
                            <button onClick={() => setType('Entrada')} className={`flex-1 py-3 font-bold rounded-xl transition-all ${type === 'Entrada' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-surface-dark text-slate-400'}`}>Entrada</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="totalValue" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Valor R$</label>
                                <input id="totalValue" type="number" value={totalValue} onChange={e => setTotalValue(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white text-lg font-mono outline-none border border-white/5 focus:border-primary" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="entry_date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data</label>
                                <input id="entry_date" type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="school_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Escola</label>
                                <select id="school_id" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" disabled={user.role === UserRole.DIRETOR}>
                                    <option value="">Selecione...</option>
                                    {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="category" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Categoria</label>
                                <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                    {(type === 'Saída' ? EXIT_CATEGORIES : ENTRY_CATEGORIES).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="program_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Programa</label>
                                <select id="program_id" value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                    <option value="">Selecione...</option>
                                    {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {!isSimplified && (
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="supplier_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fornecedor</label>
                                    <select id="supplier_id" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                        <option value="">Selecione...</option>
                                        {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="main_description" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Descrição</label>
                            <input id="main_description" type="text" value={mainDescription} onChange={e => setMainDescription(e.target.value.toUpperCase())} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" placeholder={isBankOp ? "EX: TARIFA BANCÁRIA MENSAL" : "EX: COMPRA DE MATERIAIS"} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="bank_account_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Conta Bancária</label>
                                <select id="bank_account_id" value={selectedBankAccountId} onChange={e => setSelectedBankAccountId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                    <option value="">Selecione...</option>
                                    {bankAccounts.filter((b: any) => b.school_id === selectedSchoolId && b.program_id === selectedProgramId).map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.name} (Ag: {b.agency})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="payment_method_id" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Forma de Pagamento</label>
                                <select id="payment_method_id" value={selectedPaymentMethodId} onChange={e => setSelectedPaymentMethodId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                    <option value="">Selecione...</option>
                                    {paymentMethods.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="status" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as TransactionStatus)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                <option value={TransactionStatus.PENDENTE}>Pendente</option>
                                <option value={TransactionStatus.PAGO}>Pago / Recebido</option>
                                <option value={TransactionStatus.CONCILIADO}>Conciliado</option>
                                <option value={TransactionStatus.ESTORNADO}>Estornado / Cancelado</option>
                            </select>
                        </div>

                        {!isSimplified && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-2"><label htmlFor="document_number" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nº Documento</label><input id="document_number" type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                                <div className="flex flex-col gap-2"><label htmlFor="auth_number" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nº Autenticação</label><input id="auth_number" type="text" value={authNumber} onChange={e => setAuthNumber(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                                <div className="flex flex-col gap-2"><label htmlFor="invoice_date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data da Nota</label><input id="invoice_date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                            </div>
                        )}

                        {/* Classification Area */}
                        <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-white font-bold">Classificação Financeira</h4>
                                <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer">
                                    <input type="checkbox" checked={isSplitMode} onChange={e => setIsSplitMode(e.target.checked)} /> Ativar Rateio
                                </label>
                            </div>
                            {isSplitMode ? (
                                <div className="flex flex-col gap-3">
                                    {splitItems.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 bg-white/[0.02] p-4 rounded-xl border border-white/5 relative group">
                                            <div className="flex flex-col md:flex-row gap-2">
                                                <div className="flex-1">
                                                    <label htmlFor={`rubric_${idx}`} className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Rubrica</label>
                                                    <select id={`rubric_${idx}`} value={item.rubricId} onChange={e => {
                                                        const ns = [...splitItems]; ns[idx].rubricId = e.target.value;
                                                        const rub = allRubrics.find((r: any) => r.id === e.target.value);
                                                        if (rub?.default_nature) ns[idx].nature = rub.default_nature as TransactionNature;
                                                        setSplitItems(ns);
                                                    }} className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary">
                                                        <option value="">Nenhuma / Natureza Direta</option>
                                                        {filteredRubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <label htmlFor={`nature_${idx}`} className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Natureza</label>
                                                    <select id={`nature_${idx}`} value={item.nature} onChange={e => { const ns = [...splitItems]; ns[idx].nature = e.target.value as TransactionNature; setSplitItems(ns) }} className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary">
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
                                                <button onClick={() => setSplitItems(splitItems.filter((_, i) => i !== idx))} className="mt-5 w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
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
                                        <label htmlFor="single_rubric" className="sr-only">Rubrica</label>
                                        <select id="single_rubric" value={singleRubricId} onChange={e => { setSingleRubricId(e.target.value); const rub = allRubrics.find((r: any) => r.id === e.target.value); if (rub?.default_nature) setSingleNature(rub.default_nature as TransactionNature); }} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none w-full border border-white/5 focus:border-primary">
                                            <option value="">Nenhuma / Natureza Direta</option>
                                            {filteredRubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="single_nature" className="sr-only">Natureza</label>
                                        <select id="single_nature" value={singleNature} onChange={e => setSingleNature(e.target.value as TransactionNature)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none w-full border border-white/5 focus:border-primary">
                                            <option value={TransactionNature.CUSTEIO}>Custeio</option>
                                            <option value={TransactionNature.CAPITAL}>Capital</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Attachments Section */}
                        <div className="border-t border-white/5 pt-8 mt-4 bg-white/[0.01] -mx-4 md:-mx-8 px-4 md:px-8 pb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">Documentação do Lançamento</h4>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{attachLabel}</p>
                                    </div>
                                </div>
                                {isUploading && (
                                    <div className="flex items-center gap-2 text-primary animate-pulse">
                                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                        <span className="text-[10px] font-bold uppercase">Enviando...</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const isExtratoAllowed = ['Tarifa Bancária', 'Devolução de Recurso (FNDE/Estado)', 'Repasse / Crédito', 'Rendimento de Aplicação'].includes(category);
                                            const isImposto = category === 'Impostos / Tributos';
                                            const isBankSpecial = ['Tarifa Bancária', 'Rendimento de Aplicação', 'Reembolso / Estorno', 'Repasse / Crédito'].includes(category);

                                            const cats = [
                                                {
                                                    label: isImposto ? 'Guia (DARF/GPS)' : (isBankSpecial ? 'Documento' : 'Nota Fiscal'),
                                                    icon: isImposto ? 'description' : (isBankSpecial ? 'history_edu' : 'receipt_long'),
                                                    restricted: isBankSpecial && category !== 'Reembolso / Estorno' // Não precisa de NF pra tarifa/rendimento
                                                },
                                                { label: 'Comprovante', icon: 'payments' },
                                                { label: 'Espelho da Nota', icon: 'content_copy', restricted: isBankSpecial || isImposto },
                                                { label: 'Extrato Bancário', icon: 'account_balance', restricted: !isExtratoAllowed },
                                                { label: 'Certidões', icon: 'verified', restricted: isBankSpecial }
                                            ].filter(c => !c.restricted);

                                            return cats.map(c => (
                                                <label key={c.label} className="cursor-pointer group flex flex-col items-center justify-center w-[calc(33.33%-8px)] aspect-square bg-white/5 border border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-center p-2">
                                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors mb-1">{c.icon}</span>
                                                    <span className="text-[8px] font-black text-slate-400 group-hover:text-white uppercase leading-tight">{c.label}</span>
                                                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, c.label)} disabled={isUploading} />
                                                </label>
                                            ));
                                        })()}
                                    </div>

                                    <div className="space-y-2 mt-2">
                                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Arquivos Anexados ({attachments.length})</h5>
                                        {attachments.map(att => (
                                            <div key={att.id} className="flex items-center justify-between p-3 bg-black/40 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-slate-500 text-base">attachment</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-white font-bold truncate max-w-[150px]">{att.name}</p>
                                                        <p className="text-[9px] text-primary font-black uppercase tracking-tighter">{att.category}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <a href={att.url} target="_blank" className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><span className="material-symbols-outlined text-base">visibility</span></a>
                                                    <button onClick={() => removeAttachment(att.id)} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all"><span className="material-symbols-outlined text-base">delete</span></button>
                                                </div>
                                            </div>
                                        ))}

                                        {linkedStatement && (
                                            <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all animate-in slide-in-from-left-2 ${linkedStatement.pdf_url ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${linkedStatement.pdf_url ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        <span className="material-symbols-outlined text-base">account_balance</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-white font-bold truncate max-w-[150px]">{linkedStatement.pdf_name || linkedStatement.file_name}</p>
                                                        <p className={`text-[9px] font-black uppercase tracking-tighter ${linkedStatement.pdf_url ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {linkedStatement.pdf_url ? 'Extrato Oficial (PDF)' : 'Extrato de Dados (OFX/CSV)'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a href={linkedStatement.pdf_url || linkedStatement.file_url} target="_blank" className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${linkedStatement.pdf_url ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-white' : 'hover:bg-amber-500/20 text-amber-400 hover:text-white'}`}>
                                                    <span className="material-symbols-outlined text-base">visibility</span>
                                                </a>
                                            </div>
                                        )}
                                        {attachments.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/[0.02] rounded-3xl">
                                                <span className="material-symbols-outlined text-3xl text-slate-700 mb-2">cloud_upload</span>
                                                <p className="text-[10px] text-slate-600 font-bold uppercase">Nenhum documento anexado ainda</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 h-full">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                <span className="material-symbols-outlined text-xl">verified_user</span>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">Vínculo Técnico (RT)</h4>
                                                <p className="text-[9px] text-indigo-400/70 font-black uppercase tracking-widest">Processo de Prestação</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {technicalProcess?.attachments?.map((att: any) => (
                                                <div key={att.id} className="flex items-center justify-between p-3 bg-indigo-950/40 rounded-2xl border border-indigo-500/10 hover:border-indigo-500/40 transition-all group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="material-symbols-outlined text-indigo-500/50 text-base">file_present</span>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] text-indigo-100 font-bold truncate">{att.name}</p>
                                                            <p className="text-[8px] text-indigo-400 font-black uppercase tracking-tighter">{att.category || 'Documento Técnico'}</p>
                                                        </div>
                                                    </div>
                                                    <a href={att.url} target="_blank" className="w-8 h-8 flex items-center justify-center hover:bg-indigo-500/20 rounded-xl text-indigo-400 hover:text-white transition-all">
                                                        <span className="material-symbols-outlined text-base">open_in_new</span>
                                                    </a>
                                                </div>
                                            ))}
                                            {!technicalProcess && (
                                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                                    <span className="material-symbols-outlined text-3xl text-indigo-900 mb-2">inventory_2</span>
                                                    <p className="text-[10px] text-indigo-400/40 font-bold uppercase leading-relaxed">Aguardando vinculação de<br />processo técnico pela GEE</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="flex flex-col gap-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                            {entryLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                                    <span className="material-symbols-outlined text-5xl opacity-20">history_toggle_off</span>
                                    <p className="text-sm italic">Nenhuma alteração registrada.</p>
                                </div>
                            ) : (
                                entryLogs.map((log, idx) => (
                                    <div key={log.id || idx} className="relative pl-10">
                                        <div className="absolute left-0 top-1.5 w-9 h-9 rounded-xl bg-[#1e293b] border border-white/10 flex items-center justify-center z-10">
                                            <span className="material-symbols-outlined text-[18px] text-primary">
                                                {log.action === 'CREATE' ? 'add_circle' : 'edit'}
                                            </span>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-xs font-black text-white uppercase">{log.user_name || 'Sistema'}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {log.action === 'CREATE' ? 'Criação' : 'Alteração'}
                                                </span>
                                            </div>
                                            {log.changes ? (
                                                <div className="flex flex-col gap-2 mt-3">
                                                    {Object.entries(log.changes).map(([field, values]: [string, any]) => (
                                                        <div key={field} className="text-[11px] bg-black/20 rounded-lg p-2 border border-white/[0.02]">
                                                            <span className="text-slate-500 font-bold uppercase">{field}:</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-red-400/70 line-through truncate max-w-[150px]">{String(values.old)}</span>
                                                                <span className="material-symbols-outlined text-[10px] text-slate-700">arrow_forward</span>
                                                                <span className="text-emerald-400 font-bold truncate max-w-[150px]">{String(values.new)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">{log.details}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#1e293b] shrink-0">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-white font-bold hover:bg-white/5 transition-colors">Cancelar</button>
                    {activeTab === 'dados' && (
                        <button onClick={handleSave} className="px-8 py-2 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all">
                            Salvar Lançamento
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EntryFormModal;
