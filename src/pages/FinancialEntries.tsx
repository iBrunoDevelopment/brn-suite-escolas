
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { generateRelatorioGerencialHTML } from '../lib/reportUtils';
import { TransactionStatus, TransactionNature, User, UserRole } from '../types';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';
import StatsCards from '../components/financial/StatsCards';
import FilterBar from '../components/financial/FilterBar';
import FinancialTable from '../components/financial/FinancialTable';
import { useFinancialEntries, FinancialEntryExtended } from '../hooks/useFinancialEntries';

interface SplitItem {
    id: string; rubricId: string; rubricName: string; nature: TransactionNature; value: number; description: string;
}

const FinancialEntries: React.FC<{ user: User }> = ({ user }) => {
    // Hooks & Data from useFinancialEntries
    const [filters, setFilters] = useState({
        school: '',
        program: '',
        supplier: '',
        startDate: '',
        endDate: '',
        nature: '',
        search: ''
    });
    const [quickFilter, setQuickFilter] = useState('all');
    const { entries, stats, auxData, loading, refresh } = useFinancialEntries(user, { ...filters, quick: quickFilter });

    // UI States
    const [showForm, setShowForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'dados' | 'historico'>('dados');

    // Destructure auxData for easier access
    const { schools, programs, rubrics: allRubrics, suppliers, bankAccounts, paymentMethods } = auxData;
    const [filteredRubrics, setFilteredRubrics] = useState<any[]>([]);
    const [periods, setPeriods] = useState<any[]>([]);

    // Permissions
    const entryPerm = usePermissions(user, 'entries');
    const accessibleSchools = useAccessibleSchools(user, schools);

    // Reprogrammed Balances State
    const [showReprogrammedModal, setShowReprogrammedModal] = useState(false);
    const [reprogrammedBalances, setReprogrammedBalances] = useState<any[]>([]);
    const [newReprogrammed, setNewReprogrammed] = useState({
        school_id: '', program_id: '', rubric_id: '', nature: TransactionNature.CUSTEIO, period: '', value: ''
    });
    const [isSavingReprogrammed, setIsSavingReprogrammed] = useState(false);
    const [reprogSearch, setReprogSearch] = useState('');
    const [reprogSchoolFilter, setReprogSchoolFilter] = useState('');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
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
    const [isUploading, setIsUploading] = useState(false);
    const [entryLogs, setEntryLogs] = useState<any[]>([]);

    const [isSplitMode, setIsSplitMode] = useState(false);
    const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
    const [singleRubricId, setSingleRubricId] = useState('');
    const [singleNature, setSingleNature] = useState<TransactionNature>(TransactionNature.CUSTEIO);

    const ENTRY_CATEGORIES = ['Repasse / Crédito', 'Rendimento de Aplicação', 'Reembolso / Estorno', 'Doação', 'Outros'];
    const EXIT_CATEGORIES = ['Compra de Produtos', 'Contratação de Serviços', 'Tarifa Bancária', 'Impostos / Tributos', 'Devolução de Recurso (FNDE/Estado)', 'Outros'];
    const ATTACHMENT_CATEGORIES = ['Nota Fiscal', 'Comprovante', 'Extrato Bancário', 'Certidão Municipal', 'Certidão Estadual', 'Certidão Federal', 'FGTS', 'Trabalhista', 'Outros'];

    // Initial Fetch (Periods & Reprogrammed)
    useEffect(() => {
        const fetchInitial = async () => {
            const { data: per } = await supabase.from('periods').select('name, is_active').order('name', { ascending: false });
            if (per) setPeriods(per);
            fetchReprogrammedBalances();
        };
        fetchInitial();
    }, []);

    const fetchReprogrammedBalances = async () => {
        const { data } = await supabase.from('reprogrammed_balances').select(`
            *, schools(name), programs(name), rubrics(name)
        `).order('period', { ascending: false });
        if (data) setReprogrammedBalances(data);
    };

    const handleSaveReprogrammed = async () => {
        if (!newReprogrammed.school_id || !newReprogrammed.program_id || !newReprogrammed.value || !newReprogrammed.period) {
            alert('Escola, Programa, Ano/Período e Valor são obrigatórios.');
            return;
        }
        setIsSavingReprogrammed(true);
        try {
            const { error } = await supabase.from('reprogrammed_balances').upsert({
                school_id: newReprogrammed.school_id,
                program_id: newReprogrammed.program_id,
                rubric_id: newReprogrammed.rubric_id || null,
                nature: newReprogrammed.nature,
                period: newReprogrammed.period,
                value: parseFloat(newReprogrammed.value)
            });
            if (error) throw error;
            fetchReprogrammedBalances();
            setNewReprogrammed({ ...newReprogrammed, value: '', rubric_id: '' });
        } catch (error: any) {
            alert(`Erro ao salvar saldo reprogramado: ${error.message}`);
        } finally { setIsSavingReprogrammed(false); }
    };

    const handleDeleteReprogrammed = async (id: string) => {
        if (!confirm('Excluir este saldo reprogramado?')) return;
        await supabase.from('reprogrammed_balances').delete().eq('id', id);
        fetchReprogrammedBalances();
    };

    // Filter Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            refresh({ ...filters, quick: quickFilter });
        }, 300);
        return () => clearTimeout(timer);
    }, [filters, quickFilter, refresh]);

    // Rubric filtering
    useEffect(() => {
        if (selectedProgramId) {
            setFilteredRubrics(allRubrics.filter(r =>
                r.program_id === selectedProgramId && (!r.school_id || r.school_id === selectedSchoolId)
            ));
        } else setFilteredRubrics([]);
    }, [selectedProgramId, selectedSchoolId, allRubrics]);

    // Default category logic
    useEffect(() => {
        if (!editingId && !editingBatchId) setCategory(type === 'Entrada' ? ENTRY_CATEGORIES[0] : EXIT_CATEGORIES[0]);
    }, [type, editingId, editingBatchId]);

    const resetForm = () => {
        setEditingId(null); setEditingBatchId(null);
        setType('Saída'); setSelectedSchoolId(''); setDate(new Date().toISOString().split('T')[0]);
        setSelectedProgramId(''); setTotalValue(''); setMainDescription(''); setStatus(TransactionStatus.PENDENTE);
        setInvoiceDate(''); setDocumentNumber(''); setAuthNumber(''); setAttachments([]);
        setSelectedSupplierId(''); setSelectedBankAccountId(''); setSelectedPaymentMethodId('');
        setIsSplitMode(false); setSplitItems([]); setSingleRubricId('');
        setActiveTab('dados'); setEntryLogs([]); setTechnicalProcess(null);
    };

    const handleEdit = async (entry: any) => {
        if (entry.id) {
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('entry_id', entry.id).order('timestamp', { ascending: false });
            setEntryLogs(logs || []);

            // Buscar processo de prestação vinculado
            const { data: proc } = await supabase.from('accountability_processes').select('*').eq('financial_entry_id', entry.id).maybeSingle();
            setTechnicalProcess(proc);
        }

        if (entry.batch_id) {
            const { data } = await supabase.from('financial_entries').select('*').eq('batch_id', entry.batch_id);
            if (data) {
                const f = data[0];
                setEditingBatchId(f.batch_id); setEditingId(null);
                setType(f.type); setCategory(f.category); setSelectedSchoolId(f.school_id); setDate(f.date); setSelectedProgramId(f.program_id); setStatus(f.status);
                setInvoiceDate(f.invoice_date || ''); setDocumentNumber(f.document_number || ''); setAuthNumber(f.auth_number || '');
                setAttachments(f.attachments || []); setSelectedSupplierId(f.supplier_id || '');
                setSelectedBankAccountId(f.bank_account_id || ''); setSelectedPaymentMethodId(f.payment_method_id || '');
                setMainDescription(f.description.split(' - ')[0]);
                setTotalValue(data.reduce((acc, c) => acc + Math.abs(c.value), 0).toString());
                setSplitItems(data.map((i: any) => ({
                    id: i.id, rubricId: i.rubric_id, rubricName: '', nature: i.nature, value: Math.abs(i.value), description: i.description.includes(' - ') ? i.description.split(' - ')[1] : ''
                })));
                setIsSplitMode(true);
            }
        } else {
            setEditingId(entry.id); setEditingBatchId(null);
            setType(entry.type); setCategory(entry.category); setSelectedSchoolId(entry.school_id); setDate(entry.date); setSelectedProgramId(entry.program_id);
            setTotalValue(Math.abs(entry.value).toString()); setMainDescription(entry.description); setStatus(entry.status);
            setInvoiceDate(entry.invoice_date || ''); setDocumentNumber(entry.document_number || ''); setAuthNumber(entry.auth_number || '');
            setAttachments(entry.attachments || []); setSelectedSupplierId(entry.supplier_id || '');
            setSelectedBankAccountId(entry.bank_account_id || ''); setSelectedPaymentMethodId(entry.payment_method_id || '');
            setIsSplitMode(false); setSingleRubricId(entry.rubric_id); setSingleNature(entry.nature);
        }
        setActiveTab('dados'); setShowForm(true);
    };

    const handleDelete = async (entry: any) => {
        const isAdmin = user.role === UserRole.ADMIN;
        const msg = isAdmin
            ? "Excluir permanentemente este lançamento?"
            : (entry.status === TransactionStatus.ESTORNADO ? "Reativar este lançamento? Ele voltará para o status 'Pendente'." : "Desativar (Estornar) este lançamento?");

        if (!confirm(msg)) return;

        if (isAdmin) {
            // ADM: Deleta permanentemente
            const { error } = entry.batch_id ?
                await supabase.from('financial_entries').delete().eq('batch_id', entry.batch_id) :
                await supabase.from('financial_entries').delete().eq('id', entry.id);
            if (error) alert(error.message); else refresh({ ...filters, quick: quickFilter });
        } else {
            // OPERADOR / DIRETOR: Toggle Status (Estornar <-> Pendente)
            const newStatus = entry.status === TransactionStatus.ESTORNADO ? TransactionStatus.PENDENTE : TransactionStatus.ESTORNADO;

            const { error } = entry.batch_id ?
                await supabase.from('financial_entries').update({ status: newStatus }).eq('batch_id', entry.batch_id) :
                await supabase.from('financial_entries').update({ status: newStatus }).eq('id', entry.id);
            if (error) alert(error.message); else refresh({ ...filters, quick: quickFilter });
        }
    };

    const handleConciliate = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === TransactionStatus.CONCILIADO ? TransactionStatus.PAGO : TransactionStatus.CONCILIADO;
        await supabase.from('financial_entries').update({ status: newStatus }).eq('id', id);
        refresh({ ...filters, quick: quickFilter });
    };

    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === entries.length ? [] : entries.map(e => e.id));

    const handlePrintReport = () => {
        if (entries.length === 0) return alert('Nenhum dado para o relatório.');
        const html = generateRelatorioGerencialHTML(entries, filters, stats, reprogrammedBalances);
        const win = window.open('', '_blank');
        win?.document.write(html);
        win?.document.close();
    };

    const exportToCSV = () => {
        setIsExporting(true);
        const headers = ['Data', 'Descrição', 'Fornecedor', 'Escola', 'Programa', 'Rubrica', 'Natureza', 'Valor', 'Status'];
        const rows = entries.map(e => [
            new Date(e.date).toLocaleDateString('pt-BR'), e.description, e.supplier, e.school, e.program, e.rubric, e.nature, e.value, e.status
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', `lancamentos_${new Date().getTime()}.csv`);
        link.click();
        setIsExporting(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, cat: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const sanitizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
            const path = `financial/${Date.now()}_${sanitizedName}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(path, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
            setAttachments([...attachments, { id: Math.random().toString(), name: file.name, url: publicUrl, category: cat }]);
        } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
    };

    const removeAttachment = (id: string) => setAttachments(attachments.filter(a => a.id !== id));

    const handleSave = async () => {
        if (!selectedSchoolId || !date || !selectedProgramId || !totalValue || !mainDescription) {
            return alert('Preencha os campos obrigatórios: Escola, Data, Programa, Valor e Descritivo.');
        }

        if (user.role === UserRole.DIRETOR && (editingId || editingBatchId)) {
            return alert('O perfil de Diretor não tem permissão para editar lançamentos existentes.');
        }

        const valNum = parseFloat(totalValue);

        // Fetch original data for change comparison if editing
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
                    return alert(`O valor total das rubricas (R$ ${totalSplit.toFixed(2)}) deve ser igual ao valor total informado (R$ ${valNum.toFixed(2)}).`);
                }

                if (splitItems.some(i => !i.rubricId || i.value <= 0)) {
                    return alert('Todos os itens do rateio devem ter uma rubrica selecionada e valor maior que zero.');
                }

                const batchId = editingBatchId || `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                // Em edição de lote, removemos os antigos para reinserir (estratégia simples e eficaz)
                if (editingBatchId) {
                    await supabase.from('financial_entries').delete().eq('batch_id', editingBatchId);
                }

                // Se era um item único que virou rateio, removemos o original
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
                    rubric_id: item.rubricId,
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

                // Log batch creation/update
                if (savedEntries && savedEntries.length > 0) {
                    await supabase.from('audit_logs').insert({
                        entry_id: savedEntries[0].id,
                        user_name: user.name,
                        action: editingBatchId ? 'UPDATE' : 'CREATE',
                        details: editingBatchId ? `Edição de lote (rateio) - ID Lote: ${batchId}` : `Criação de lote (rateio) - ID Lote: ${batchId}`
                    });
                }
            } else {
                if (!singleRubricId) return alert('Selecione uma rubrica.');

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
                    rubric_id: singleRubricId,
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

                // Log changes for single entry
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
            setShowForm(false);
            refresh({ ...filters, quick: quickFilter });
            resetForm();
        } catch (err: any) {
            alert(`Erro ao salvar: ${err.message}`);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">receipt_long</span>
                        </span>
                        Lançamentos
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Gestão inteligente do fluxo de caixa e conformidade.</p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                    <button onClick={() => setShowReprogrammedModal(true)} className="h-12 md:h-10 px-4 rounded-xl border border-blue-500/30 bg-blue-500/5 text-blue-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-500/10 transition-all active:scale-95 w-full md:w-auto">
                        <span className="material-symbols-outlined text-[18px]">history</span> Saldos Reprogramados
                    </button>
                    {entryPerm.canCreate && (
                        <button onClick={() => { resetForm(); setShowForm(true) }} className="h-12 md:h-10 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-black shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto">
                            <span className="material-symbols-outlined text-[18px]">add</span> Adicionar Novo
                        </button>
                    )}
                </div>
            </div>

            <StatsCards stats={stats} />

            <FilterBar filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} quickFilter={quickFilter} setQuickFilter={setQuickFilter} auxData={auxData} onPrintReport={handlePrintReport} onExportCSV={exportToCSV} />

            <FinancialTable entries={entries} loading={loading} selectedIds={selectedIds} canEdit={entryPerm.canEdit} isAdmin={user.role === UserRole.ADMIN} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onEdit={handleEdit} onDelete={handleDelete} onConciliate={handleConciliate} />

            {/* Modals (Reprogrammed & Form) - Keeping these in page for now as they are very tied to local state */}
            {showReprogrammedModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-4xl bg-[#0f172a] border border-blue-500/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-500/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <span className="material-symbols-outlined">restart_alt</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white px-2">Saldos Reprogramados</h3>
                                    <p className="text-xs text-slate-400 px-2">Gerencie os saldos de exercícios anteriores</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReprogrammedModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden h-full">
                            {/* Form Area */}
                            <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex flex-col gap-4 text-xs h-fit overflow-y-auto">
                                <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">add_circle</span>
                                    Novo Registro
                                </h4>
                                <label className="text-slate-400 uppercase font-black">Escola</label>
                                <select value={newReprogrammed.school_id} onChange={e => setNewReprogrammed({ ...newReprogrammed, school_id: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">Selecione...</option>
                                    {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <label className="text-slate-400 uppercase font-black">Programa</label>
                                <select value={newReprogrammed.program_id} onChange={e => setNewReprogrammed({ ...newReprogrammed, program_id: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">Selecione...</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-slate-400 uppercase font-black">Natureza</label>
                                        <select value={newReprogrammed.nature} onChange={e => setNewReprogrammed({ ...newReprogrammed, nature: e.target.value as TransactionNature })} className="bg-[#1e293b] rounded-lg h-10 px-2 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                                            <option value={TransactionNature.CUSTEIO}>Custeio</option>
                                            <option value={TransactionNature.CAPITAL}>Capital</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-slate-400 uppercase font-black">Ano</label>
                                        <select value={newReprogrammed.period} onChange={e => setNewReprogrammed({ ...newReprogrammed, period: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-2 text-white border-none outline-none focus:ring-1 focus:ring-blue-500">
                                            <option value="">...</option>
                                            {periods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <label className="text-slate-400 uppercase font-black">Valor R$</label>
                                <input type="number" step="0.01" value={newReprogrammed.value} onChange={e => setNewReprogrammed({ ...newReprogrammed, value: e.target.value })} className="bg-[#1e293b] rounded-lg h-10 px-3 text-white border-none outline-none focus:ring-1 focus:ring-blue-500 font-mono text-lg" placeholder="0,00" />
                                <button onClick={handleSaveReprogrammed} disabled={isSavingReprogrammed} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2">
                                    {isSavingReprogrammed ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : 'Salvar Saldo'}
                                </button>
                            </div>

                            {/* List Area */}
                            <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-hidden">
                                <div className="flex flex-col md:flex-row gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex-1 relative">
                                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar por escola ou programa..."
                                            value={reprogSearch}
                                            onChange={e => setReprogSearch(e.target.value)}
                                            className="w-full bg-[#0f172a] h-9 pl-9 pr-3 rounded-lg text-xs text-white border border-white/10 focus:border-blue-500 outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="w-full md:w-48">
                                        <select
                                            value={reprogSchoolFilter}
                                            onChange={e => setReprogSchoolFilter(e.target.value)}
                                            className="w-full bg-[#0f172a] h-9 px-3 rounded-lg text-xs text-white border border-white/10 focus:border-blue-500 outline-none"
                                        >
                                            <option value="">Todas as Escolas</option>
                                            {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="overflow-y-auto flex-1 pr-2 space-y-2 custom-scrollbar">
                                    {reprogrammedBalances.filter(rb => {
                                        const matchesSearch =
                                            rb.programs?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                            rb.schools?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                            rb.period.toLowerCase().includes(reprogSearch.toLowerCase());
                                        const matchesSchool = !reprogSchoolFilter || rb.school_id === reprogSchoolFilter;
                                        return matchesSearch && matchesSchool;
                                    }).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-500 opacity-50">
                                            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                                            <p className="text-xs">Nenhum saldo encontrado.</p>
                                        </div>
                                    ) : (
                                        reprogrammedBalances
                                            .filter(rb => {
                                                const matchesSearch =
                                                    rb.programs?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                                    rb.schools?.name.toLowerCase().includes(reprogSearch.toLowerCase()) ||
                                                    rb.period.toLowerCase().includes(reprogSearch.toLowerCase());
                                                const matchesSchool = !reprogSchoolFilter || rb.school_id === reprogSchoolFilter;
                                                return matchesSearch && matchesSchool;
                                            })
                                            .map(rb => (
                                                <div key={rb.id} className="bg-white/5 hover:bg-white/10 p-4 rounded-xl flex justify-between items-center group transition-all border border-transparent hover:border-white/10">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">{rb.period}</span>
                                                            <span className="text-white font-bold text-sm truncate max-w-[200px] md:max-w-xs" title={rb.programs?.name}>{rb.programs?.name}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">school</span>
                                                            {rb.schools?.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">{rb.nature}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">{rb.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        <button onClick={() => handleDeleteReprogrammed(rb.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-3xl h-full bg-[#0f172a] border-l border-surface-border flex flex-col animate-in slide-in-from-right">
                        <div className="p-4 border-b border-surface-border flex flex-col gap-4 bg-[#1e293b]">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">edit_note</span>
                                    {editingId || editingBatchId ? 'Editar Lançamento' : 'Novo Lançamento'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            {(editingId || editingBatchId) && (
                                <div className="flex gap-1 bg-black/20 p-1 rounded-xl w-fit self-center">
                                    <button onClick={() => setActiveTab('dados')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dados' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Dados Gerais</button>
                                    <button onClick={() => setActiveTab('historico')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'historico' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Histórico ({entryLogs.length})</button>
                                </div>
                            )}
                        </div>

                        {activeTab === 'dados' ? (
                            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                                <div className="flex gap-4">
                                    <button onClick={() => setType('Saída')} className={`flex-1 py-3 font-bold rounded-xl transition-all ${type === 'Saída' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-surface-dark text-slate-400'}`}>Saída</button>
                                    <button onClick={() => setType('Entrada')} className={`flex-1 py-3 font-bold rounded-xl transition-all ${type === 'Entrada' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-surface-dark text-slate-400'}`}>Entrada</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Valor R$</label><input type="number" value={totalValue} onChange={e => setTotalValue(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white text-lg font-mono outline-none border border-white/5 focus:border-primary" /></div>
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Escola</label>
                                    <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" disabled={user.role === UserRole.DIRETOR}>
                                        <option value="">Selecione...</option>
                                        {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Programa</label><select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"><option value="">Selecione...</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fornecedor</label><select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary"><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                </div>
                                <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Descrição do Lançamento</label><input type="text" value={mainDescription} onChange={e => setMainDescription(e.target.value.toUpperCase())} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" placeholder="EX: COMPRA DE MATERIAIS DE LIMPEZA" /></div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Status</label>
                                        <select value={status} onChange={e => setStatus(e.target.value as TransactionStatus)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                            <option value={TransactionStatus.PENDENTE}>Pendente</option>
                                            <option value={TransactionStatus.PAGO}>Pago / Recebido</option>
                                            <option value={TransactionStatus.CONCILIADO}>Conciliado</option>
                                            <option value={TransactionStatus.ESTORNADO}>Estornado / Cancelado</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Categoria</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                            {(type === 'Saída' ? EXIT_CATEGORIES : ENTRY_CATEGORIES).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Conta Bancária</label>
                                        <select value={selectedBankAccountId} onChange={e => setSelectedBankAccountId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                            <option value="">Selecione...</option>
                                            {bankAccounts.filter(b => b.school_id === selectedSchoolId && b.program_id === selectedProgramId).map(b => (
                                                <option key={b.id} value={b.id}>{b.name} (Ag: {b.agency})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Forma de Pagamento</label>
                                        <select value={selectedPaymentMethodId} onChange={e => setSelectedPaymentMethodId(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary">
                                            <option value="">Selecione...</option>
                                            {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nº Documento</label><input type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nº Autenticação</label><input type="text" value={authNumber} onChange={e => setAuthNumber(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data da Nota</label><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none border border-white/5 focus:border-primary" /></div>
                                </div>

                                {/* Rubric Section */}
                                <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-white font-bold">Classificação Financeira</h4>
                                        <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer"><input type="checkbox" checked={isSplitMode} onChange={e => setIsSplitMode(e.target.checked)} /> Ativar Rateio</label>
                                    </div>
                                    {isSplitMode ? (
                                        <div className="flex flex-col gap-3">
                                            {splitItems.map((item, idx) => (
                                                <div key={idx} className="flex flex-col gap-2 bg-white/[0.02] p-4 rounded-xl border border-white/5 relative group">
                                                    <div className="flex flex-col md:flex-row gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Rubrica</label>
                                                            <select value={item.rubricId} onChange={e => {
                                                                const ns = [...splitItems]; ns[idx].rubricId = e.target.value;
                                                                const rub = allRubrics.find((r: any) => r.id === e.target.value);
                                                                if (rub?.default_nature) ns[idx].nature = rub.default_nature as TransactionNature;
                                                                setSplitItems(ns);
                                                            }} className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary">
                                                                <option value="">Selecione...</option>
                                                                {filteredRubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="w-full md:w-32">
                                                            <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Natureza</label>
                                                            <select value={item.nature} onChange={e => { const ns = [...splitItems]; ns[idx].nature = e.target.value as TransactionNature; setSplitItems(ns) }} className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary">
                                                                <option value={TransactionNature.CUSTEIO}>Custeio</option>
                                                                <option value={TransactionNature.CAPITAL}>Capital</option>
                                                            </select>
                                                        </div>
                                                        <div className="w-full md:w-32">
                                                            <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Valor R$</label>
                                                            <input type="number" step="0.01" value={item.value} onChange={e => { const ns = [...splitItems]; ns[idx].value = parseFloat(e.target.value) || 0; setSplitItems(ns) }} className="bg-[#1e293b] text-white text-xs h-10 rounded-lg px-3 w-full border border-white/5 outline-none font-mono focus:border-primary" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Complemento da Descrição (Opcional)</label>
                                                            <input type="text" value={item.description} onChange={e => { const ns = [...splitItems]; ns[idx].description = e.target.value; setSplitItems(ns) }} className="bg-[#1e293b] text-white text-[10px] h-8 rounded-lg px-3 w-full border border-white/5 outline-none focus:border-primary uppercase" placeholder="Ex: Referente a item X" />
                                                        </div>
                                                        <button onClick={() => setSplitItems(splitItems.filter((_, i) => i !== idx))} className="mt-5 w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => setSplitItems([...splitItems, { id: Math.random().toString(), rubricId: '', rubricName: '', nature: TransactionNature.CUSTEIO, value: 0, description: '' }])} className="w-full py-3 rounded-xl border-2 border-dashed border-white/5 text-primary hover:border-primary/30 hover:bg-primary/5 transition-all font-bold text-xs flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">add_circle</span> Adicionar Nova Classificação ao Rateio
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2"><select value={singleRubricId} onChange={e => { setSingleRubricId(e.target.value); const rub = allRubrics.find((r: any) => r.id === e.target.value); if (rub?.default_nature) setSingleNature(rub.default_nature as TransactionNature); }} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none w-full border border-white/5"><option value="">Rubrica...</option>{filteredRubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                            <select value={singleNature} onChange={e => setSingleNature(e.target.value as TransactionNature)} className="bg-[#1e293b] rounded-xl h-12 px-4 text-white outline-none w-full border border-white/5"><option value={TransactionNature.CUSTEIO}>Custeio</option><option value={TransactionNature.CAPITAL}>Capital</option></select>
                                        </div>
                                    )}
                                </div>

                                {/* Section: Attachments */}
                                <div className="flex flex-col gap-4 border-t border-white/5 pt-6 pb-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-white font-bold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">attach_file</span>
                                            Documentos e Comprovantes
                                        </h4>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">{attachments.length} arquivo(s)</span>
                                    </div>

                                    {/* Upload Area */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] text-slate-500 font-bold uppercase pl-1">Tipo de Documento</label>
                                            <select id="attachment-category" className="bg-[#1e293b] rounded-xl h-10 px-3 text-white text-xs border border-white/5 outline-none focus:border-primary">
                                                {ATTACHMENT_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2 justify-end">
                                            <label className="relative flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl h-10 cursor-pointer transition-all group overflow-hidden">
                                                {isUploading ? (
                                                    <div className="flex items-center gap-2 text-primary font-bold text-xs animate-pulse">
                                                        <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> Subindo...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-primary transition-colors">cloud_upload</span>
                                                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Selecionar Arquivo</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const cat = (document.getElementById('attachment-category') as HTMLSelectElement).value;
                                                                handleFileUpload(e, cat);
                                                                e.target.value = ''; // Reset for same file re-upload
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Attachments List */}
                                    <div className="flex flex-col gap-2 mt-2">
                                        {attachments.length === 0 ? (
                                            <div className="text-center py-6 bg-white/[0.01] rounded-2xl border border-white/[0.03]">
                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">Nenhum documento anexado ainda.<br />Selecione uma categoria e o arquivo acima.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {attachments.map((file) => (
                                                    <div key={file.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-primary/30 transition-all">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                            <span className="material-symbols-outlined text-[18px]">
                                                                {file.name.match(/\.(pdf)$/i) ? 'picture_as_pdf' :
                                                                    file.name.match(/\.(jpg|jpeg|png)$/i) ? 'image' : 'description'}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-black text-primary uppercase truncate mb-0.5">{file.category}</p>
                                                            <p className="text-[10px] text-white font-medium truncate opacity-80">{file.name}</p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={file.url} target="_blank" rel="noreferrer" className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10">
                                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                            </a>
                                                            <button onClick={() => removeAttachment(file.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10">
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Seção Unificada de Anexos */}
                                <div className="border-t border-white/5 pt-8 mt-4">
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="material-symbols-outlined text-primary">folder_open</span>
                                        <h4 className="text-white font-bold">Repositório de Documentos</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Anexos Financeiros */}
                                        <div className="space-y-4">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 p-3 rounded-xl border border-white/5 gap-3">
                                                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Documentos Financeiros</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {ATTACHMENT_CATEGORIES.slice(0, 3).map(cat => (
                                                        <label key={cat} className="cursor-pointer bg-primary/10 text-primary px-2 py-1 rounded text-[9px] font-bold border border-primary/20 hover:bg-primary/20 transition-all flex-grow md:flex-grow-0 text-center">
                                                            + {cat.split(' ')[0]}
                                                            <input type="file" className="hidden" onChange={e => handleFileUpload(e, cat)} />
                                                        </label>
                                                    ))}
                                                    <label className="cursor-pointer bg-white/10 text-slate-400 px-2 py-1 rounded text-[9px] font-bold border border-white/10 hover:bg-white/20 transition-all flex-grow md:flex-grow-0 text-center">
                                                        Outros
                                                        <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'Outros')} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                {attachments.map(att => (
                                                    <div key={att.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-slate-500 text-sm">attachment</span>
                                                            <div>
                                                                <p className="text-xs text-white font-medium truncate max-w-[150px]">{att.name}</p>
                                                                <p className="text-[9px] text-slate-500 font-black uppercase">{att.category}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <a href={att.url} target="_blank" className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><span className="material-symbols-outlined text-sm">visibility</span></a>
                                                            <button onClick={() => removeAttachment(att.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {attachments.length === 0 && <p className="text-[10px] text-slate-600 italic text-center py-4 border border-dashed border-white/5 rounded-xl">Nenhum documento financeiro.</p>}
                                            </div>
                                        </div>

                                        {/* Anexos Técnicos (da Prestação) */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Documentação Técnica (RT)</span>
                                                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded font-black uppercase">Vínculo Automático</span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                {technicalProcess?.attachments?.map((att: any) => (
                                                    <div key={att.id} className="flex items-center justify-between p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 hover:border-indigo-500/30 transition-all group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-indigo-500/50 text-sm">verified_user</span>
                                                            <div>
                                                                <p className="text-xs text-indigo-200 font-medium truncate max-w-[150px]">{att.name}</p>
                                                                <p className="text-[9px] text-indigo-500/70 font-black uppercase text-xs">{att.category || 'Documento Técnico'}</p>
                                                            </div>
                                                        </div>
                                                        <a href={att.url} target="_blank" className="p-2 hover:bg-indigo-500/10 rounded-lg text-indigo-400 hover:text-white transition-all">
                                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                        </a>
                                                    </div>
                                                ))}
                                                {!technicalProcess && (
                                                    <div className="p-6 text-center text-slate-600 italic border border-dashed border-white/5 rounded-xl">
                                                        <p className="text-[10px] uppercase font-bold">Sem processo técnico vinculado.</p>
                                                    </div>
                                                )}
                                                {technicalProcess && !technicalProcess.attachments?.length && (
                                                    <p className="text-[10px] text-slate-600 italic text-center py-4 border border-dashed border-white/5 rounded-xl">Nenhum anexo técnico enviado.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="flex flex-col gap-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                                    {entryLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                                            <span className="material-symbols-outlined text-5xl opacity-20">history_toggle_off</span>
                                            <p className="text-sm font-medium italic">Nenhuma alteração registrada para este lançamento.</p>
                                        </div>
                                    ) : (
                                        entryLogs.map((log, idx) => (
                                            <div key={log.id || idx} className="relative pl-10 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                                                <div className="absolute left-0 top-1.5 w-9 h-9 rounded-xl bg-[#1e293b] border border-white/10 flex items-center justify-center z-10">
                                                    <span className="material-symbols-outlined text-[18px] text-primary">
                                                        {log.action === 'CREATE' ? 'add_circle' : log.action === 'UPDATE' ? 'edit' : 'history'}
                                                    </span>
                                                </div>
                                                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="text-xs font-black text-white uppercase tracking-wider">{log.user_name || 'Sistema'}</span>
                                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                            }`}>
                                                            {log.action === 'CREATE' ? 'Criação' : 'Alteração'}
                                                        </span>
                                                    </div>

                                                    {log.changes ? (
                                                        <div className="flex flex-col gap-2 mt-3">
                                                            {typeof log.changes === 'object' && Object.entries(log.changes).map(([field, values]: [string, any]) => (
                                                                <div key={field} className="text-[11px] bg-black/20 rounded-lg p-2 border border-white/[0.02]">
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest">{field}:</span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-red-400/70 line-through truncate max-w-[150px]">{String(values.old)}</span>
                                                                        <span className="material-symbols-outlined text-[10px] text-slate-700">arrow_forward</span>
                                                                        <span className="text-emerald-400 font-bold truncate max-w-[150px]">{String(values.new)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 leading-relaxed italic">{log.details || 'Ação realizada com sucesso.'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#1e293b]">
                            <button onClick={() => setShowForm(false)} className="w-full md:w-auto px-6 py-2 rounded-xl text-white font-bold hover:bg-white/5 transition-colors">Cancelar</button>
                            {activeTab === 'dados' && (
                                <button onClick={handleSave} className="w-full md:w-auto px-8 py-2 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all">
                                    Salvar Lançamento
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FinancialEntries;
