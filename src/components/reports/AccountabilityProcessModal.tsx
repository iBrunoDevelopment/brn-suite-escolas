
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, FinancialEntry, AccountabilityProcess, AccountabilityItem, AccountabilityQuoteItem, Supplier, UserRole } from '../../types';
import { formatCurrency } from '../../lib/printUtils';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../lib/imageUtils';

interface AccountabilityProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    editingId: string | null;
    auxData: {
        schools: any[];
        programs: any[];
        suppliers: Supplier[];
        templateUrl: string | null;
        availableEntries: FinancialEntry[];
    };
    onSave: () => void;
}

const AccountabilityProcessModal: React.FC<AccountabilityProcessModalProps> = ({
    isOpen,
    onClose,
    user,
    editingId,
    auxData,
    onSave
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
    const [processStatus, setProcessStatus] = useState<'Em Andamento' | 'Concluído'>('Em Andamento');
    const [discount, setDiscount] = useState(0);
    const [checklist, setChecklist] = useState<{ id: string, label: string, checked: boolean }[]>([
        { id: 'quotations', label: '3 Orçamentos anexados', checked: false },
        { id: 'winner_price', label: 'Vencedor validado com menor preço', checked: false },
        { id: 'invoice', label: 'Nota Fiscal anexa', checked: false },
        { id: 'certificates', label: 'Certidões negativas válidas', checked: false },
        { id: 'minutes', label: 'Ata de Assembleia assinada', checked: false }
    ]);

    const [items, setItems] = useState<Partial<AccountabilityItem>[]>([{ description: '', quantity: 1, unit: 'Unid.', winner_unit_price: 0 }]);
    const [processAttachments, setProcessAttachments] = useState<any[]>([]);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [competitorQuotes, setCompetitorQuotes] = useState<{
        supplier_id: string;
        supplier_name: string;
        supplier_cnpj: string;
        items: Partial<AccountabilityQuoteItem>[];
    }[]>([
        { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: [{ description: '', quantity: 1, unit: 'Unid.', unit_price: 0 }] },
        { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: [{ description: '', quantity: 1, unit: 'Unid.', unit_price: 0 }] }
    ]);

    // Sub-modals
    const [showSupplierModal, setShowSupplierModal] = useState<{ open: boolean, quoteIdx: number }>({ open: false, quoteIdx: -1 });
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [checkingDocId, setCheckingDocId] = useState<string | null>(null);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [entrySearch, setEntrySearch] = useState('');
    const [importText, setImportText] = useState('');
    const xmlInputRef = React.useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const ACCOUNTABILITY_DOC_CATEGORIES = [
        'Ata de Assembleia',
        'Consolidação',
        'Ordem de Compra / Serviço',
        'Pesquisa de Preços (Cotações)',
        'Certidão de Regularidade',
        'Certidão de Proponente',
        'Nota Fiscal',
        'Recibo / Quitação',
        'Comprovante de Pagamento',
        'Outros'
    ];

    useEffect(() => {
        if (isOpen) {
            if (editingId) {
                fetchProcessData();
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingId]);

    const resetForm = () => {
        setSelectedEntry(null);
        setProcessStatus('Em Andamento');
        setDiscount(0);
        setProcessAttachments([]);
        setChecklist([
            { id: 'quotations', label: '3 Orçamentos anexados', checked: false },
            { id: 'winner_price', label: 'Vencedor validado com menor preço', checked: false },
            { id: 'invoice', label: 'Nota Fiscal anexa', checked: false },
            { id: 'certificates', label: 'Certidões negativas válidas', checked: false },
            { id: 'minutes', label: 'Ata de Assembleia assinada', checked: false }
        ]);
        setItems([{ description: '', quantity: 1, unit: 'Unid.', winner_unit_price: 0 }]);
        setCompetitorQuotes([
            { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: [{ description: '', quantity: 1, unit: 'Unid.', unit_price: 0 }] },
            { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: [{ description: '', quantity: 1, unit: 'Unid.', unit_price: 0 }] }
        ]);
    };

    const fetchProcessData = async () => {
        const { data: process, error } = await supabase
            .from('accountability_processes')
            .select(`
                *,
                financial_entries!inner(*, schools(*), programs(name), suppliers(*), payment_methods(name)),
                accountability_items(*),
                accountability_quotes(*, suppliers(*), accountability_quote_items(*))
            `)
            .eq('id', editingId)
            .single();

        if (process) {
            const entry = process.financial_entries;
            setSelectedEntry(entry);
            setProcessStatus(process.status);
            setDiscount(process.discount || 0);
            setProcessAttachments(process.attachments || []);
            if (process.checklist) setChecklist(process.checklist);

            const docItems = process.accountability_items || [];
            setItems(docItems);

            const competitors = (process.accountability_quotes || [])
                .filter((q: any) => !q.is_winner)
                .map((q: any) => {
                    const rawItems = q.accountability_quote_items || [];
                    const alignedItems = docItems.map((docItem: any) => {
                        const match = rawItems.find((ri: any) => ri.description === docItem.description);
                        return match ? { ...match, quantity: docItem.quantity, unit: docItem.unit } : { description: docItem.description, quantity: docItem.quantity, unit: docItem.unit, unit_price: 0 };
                    });
                    return { supplier_id: q.supplier_id || '', supplier_name: q.supplier_name, supplier_cnpj: q.supplier_cnpj || '', items: alignedItems };
                });

            while (competitors.length < 2) {
                competitors.push({ supplier_id: '', supplier_name: '', supplier_cnpj: '', items: docItems.map((it: any) => ({ ...it, unit_price: 0 })) });
            }
            setCompetitorQuotes(competitors.slice(0, 2));
        }
    };

    const handleAddItem = () => {
        const newItem = { description: '', quantity: 1, unit: 'un', winner_unit_price: 0 };
        setItems([...items, newItem]);
        setCompetitorQuotes(competitorQuotes.map(q => ({
            ...q,
            items: [...q.items, { ...newItem, unit_price: 0 }]
        })));
    };

    const handleRemoveItem = (idx: number) => {
        if (items.length <= 1) return;
        const newItems = items.filter((_, i) => i !== idx);
        setItems(newItems);
        setCompetitorQuotes(competitorQuotes.map(q => ({
            ...q,
            items: q.items.filter((_, i) => i !== idx)
        })));
    };

    const handleSelectSupplier = (supplier: Supplier) => {
        const { quoteIdx } = showSupplierModal;
        if (quoteIdx === -1) return;

        if (selectedEntry?.supplier_id === supplier.id || (selectedEntry as any)?.suppliers?.id === supplier.id) {
            return addToast('Este fornecedor já é o GANHADOR deste processo.', 'warning');
        }

        if (competitorQuotes.some((q, idx) => idx !== quoteIdx && q.supplier_id === supplier.id)) {
            return addToast('Este fornecedor já foi selecionado como proponente.', 'warning');
        }

        const cq = [...competitorQuotes];
        cq[quoteIdx].supplier_id = supplier.id;
        cq[quoteIdx].supplier_name = supplier.name;
        cq[quoteIdx].supplier_cnpj = supplier.cnpj || '';
        setCompetitorQuotes(cq);
        setShowSupplierModal({ open: false, quoteIdx: -1 });
        setSupplierSearch('');
    };

    const handleSave = async () => {
        if (!selectedEntry) return;
        if (competitorQuotes.some(q => !q.supplier_id)) {
            return addToast('Selecione os 2 fornecedores proponentes.', 'warning');
        }

        const subtotal = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.winner_unit_price || 0)), 0);
        const totalAfterDiscount = subtotal - discount;
        const targetValue = Math.abs(selectedEntry.value);

        if (Math.abs(totalAfterDiscount - targetValue) > 0.01) {
            return addToast(`O valor líquido (${formatCurrency(totalAfterDiscount)}) não corresponde ao valor da nota (${formatCurrency(targetValue)}).`, 'error');
        }

        setLoading(true);
        try {
            let processId = editingId;

            if (editingId) {
                await supabase.from('accountability_processes').update({
                    status: processStatus,
                    discount,
                    checklist,
                    attachments: processAttachments,
                    updated_at: new Date().toISOString()
                }).eq('id', editingId);

                await supabase.from('accountability_items').delete().eq('process_id', editingId);
                await supabase.from('accountability_quotes').delete().eq('process_id', editingId);
            } else {
                const { data: process, error: pError } = await supabase.from('accountability_processes').insert({
                    financial_entry_id: selectedEntry.id,
                    school_id: selectedEntry.school_id,
                    status: processStatus,
                    discount,
                    checklist,
                    attachments: processAttachments
                }).select().single();
                if (pError) throw pError;
                processId = process.id;
            }

            if (!processId) throw new Error('ID do processo não encontrado.');

            const cleanItems = items.map(it => {
                const { id, ...rest } = it as any;
                return { ...rest, process_id: processId };
            });
            await supabase.from('accountability_items').insert(cleanItems);

            await supabase.from('accountability_quotes').insert({
                process_id: processId,
                supplier_id: selectedEntry.supplier_id,
                supplier_name: (selectedEntry as any).suppliers?.name || 'Vencedor',
                supplier_cnpj: (selectedEntry as any).suppliers?.cnpj || null,
                is_winner: true,
                total_value: subtotal
            });

            for (const comp of competitorQuotes) {
                const totalVal = comp.items.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.unit_price || 0)), 0);
                const { data: q, error: qe } = await supabase.from('accountability_quotes').insert({
                    process_id: processId,
                    supplier_id: comp.supplier_id || null,
                    supplier_name: comp.supplier_name,
                    supplier_cnpj: comp.supplier_cnpj,
                    is_winner: false,
                    total_value: totalVal
                }).select().single();

                if (qe) throw qe;

                const qItems = comp.items.map(it => {
                    const { id, ...rest } = it as any;
                    return { quote_id: q.id, description: rest.description, quantity: rest.quantity, unit: rest.unit, unit_price: rest.unit_price };
                });
                await supabase.from('accountability_quote_items').insert(qItems);
            }

            if (processStatus === 'Concluído') {
                await supabase.from('financial_entries').update({ status: 'Consolidado' }).eq('id', selectedEntry.id);
            }

            onSave();
            onClose();
        } catch (err: any) {
            addToast('Erro: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const processImport = () => {
        if (!importText.trim()) return;
        const lines = importText.trim().split(/\r?\n/);
        const parsedRows: any[] = [];

        const parseNumber = (str: string) => {
            if (!str) return 0;
            let clean = str.replace(/[R$\s]/g, '');
            if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
            return parseFloat(clean) || 0;
        };

        const firstLine = lines[0] || '';
        let delimiter = '\t';
        if (firstLine.includes(';')) delimiter = ';';
        else if (firstLine.includes(',')) delimiter = ',';

        let startIndex = (firstLine.toLowerCase().includes('descrição') || firstLine.toLowerCase().includes('quantidade')) ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            const cols = line.split(delimiter);
            if (cols.length < 2) continue;
            parsedRows.push({
                item: { description: cols[0]?.trim() || '', quantity: parseNumber(cols[1]), unit: cols[2]?.trim() || 'Unid.', winner_unit_price: parseNumber(cols[3]) },
                comp1Price: parseNumber(cols[4]),
                comp2Price: parseNumber(cols[5])
            });
        }

        if (parsedRows.length === 0) return addToast('Formato inválido.', 'error');

        const newItemsList = parsedRows.map(r => r.item);
        setItems(prev => {
            const current = (prev.length === 1 && !prev[0].description) ? [] : prev;
            const updated = [...current, ...newItemsList];
            setCompetitorQuotes(competitorQuotes.map((q, qIdx) => ({
                ...q,
                items: updated.map((mi, idx) => {
                    if (idx < current.length) return q.items[idx];
                    const imp = parsedRows[idx - current.length];
                    return { description: mi.description, quantity: mi.quantity, unit: mi.unit, unit_price: qIdx === 0 ? imp.comp1Price : imp.comp2Price };
                })
            })));
            return updated;
        });
        setShowImportModal(false);
        setImportText('');
    };

    const handleXMLImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            let newItemsList: Partial<AccountabilityItem>[] = [];
            let compPrices: { p1: number, p2: number }[] = [];

            // 1. Detect Standard NF-e (Products)
            const detElements = xmlDoc.getElementsByTagName('det');
            if (detElements.length > 0) {
                for (let i = 0; i < detElements.length; i++) {
                    const det = detElements[i];
                    const prod = det.getElementsByTagName('prod')[0];
                    if (!prod) continue;

                    const description = prod.getElementsByTagName('xProd')[0]?.textContent || '';
                    const quantity = parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent || '0');
                    const unit = prod.getElementsByTagName('uCom')[0]?.textContent || 'un';
                    const winnerPrice = parseFloat(prod.getElementsByTagName('vUnCom')[0]?.textContent || '0');

                    newItemsList.push({ description, quantity, unit, winner_unit_price: winnerPrice });
                    compPrices.push({
                        p1: Number((winnerPrice * 1.016).toFixed(2)),
                        p2: Number((winnerPrice * 1.0185).toFixed(2))
                    });
                }
            }
            // 2. Detect NFS-e (Services - National Standard)
            else {
                const xDescServ = xmlDoc.getElementsByTagName('xDescServ')[0]?.textContent;
                const vServ = xmlDoc.getElementsByTagName('vServ')[0]?.textContent;

                if (xDescServ) {
                    const totalValue = parseFloat(vServ || '0');

                    // Try to split items by '***' or other delimiters if present
                    if (xDescServ.includes('***')) {
                        const parts = xDescServ.split('***').map(p => p.trim()).filter(Boolean);

                        parts.forEach(part => {
                            // Regex to detect pattern: R$ 1.234,56: Description
                            const priceRegex = /R\$\s*([\d\.,]+)[:\-\s]+(.*)/i;
                            const match = part.match(priceRegex);

                            if (match) {
                                const priceStr = match[1].replace(/\./g, "").replace(",", ".");
                                const price = parseFloat(priceStr);
                                const desc = match[2].trim();

                                newItemsList.push({
                                    description: desc,
                                    quantity: 1,
                                    unit: 'un',
                                    winner_unit_price: price
                                });
                                compPrices.push({
                                    p1: Number((price * 1.016).toFixed(2)),
                                    p2: Number((price * 1.0185).toFixed(2))
                                });
                            } else {
                                // Fallback for parts that don't match the price regex
                                newItemsList.push({
                                    description: part,
                                    quantity: 1,
                                    unit: 'un',
                                    winner_unit_price: 0
                                });
                                compPrices.push({ p1: 0, p2: 0 });
                            }
                        });
                    } else {
                        // Single service item
                        newItemsList.push({
                            description: xDescServ,
                            quantity: 1,
                            unit: 'un',
                            winner_unit_price: totalValue
                        });
                        compPrices.push({
                            p1: Number((totalValue * 1.016).toFixed(2)),
                            p2: Number((totalValue * 1.0185).toFixed(2))
                        });
                    }
                } else {
                    return addToast('Arquivo XML não reconhecido como NF-e ou NFS-e válida.', 'error');
                }
            }

            if (newItemsList.length === 0) {
                return addToast('Nenhum item encontrado no XML.', 'warning');
            }

            setItems(prev => {
                const current = (prev.length === 1 && !prev[0].description) ? [] : prev;
                const updated = [...current, ...newItemsList];
                setCompetitorQuotes(competitorQuotes.map((q, qIdx) => ({
                    ...q,
                    items: updated.map((mi, idx) => {
                        if (idx < current.length) return q.items[idx];
                        const prices = compPrices[idx - current.length];
                        return {
                            description: mi.description,
                            quantity: mi.quantity,
                            unit: mi.unit,
                            unit_price: qIdx === 0 ? prices.p1 : prices.p2
                        };
                    })
                })));
                return updated;
            });

            addToast(`${newItemsList.length} itens importados com sucesso!`, 'success');
        } catch (error) {
            console.error('XML Import Error:', error);
            addToast('Erro ao processar o XML da Nota Fiscal.', 'error');
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const downloadTemplate = () => {
        if (auxData.templateUrl) return window.open(auxData.templateUrl);
        const BOM = "\uFEFF";
        const headers = ["Descrição Detalhada", "Quantidade", "Unidade", "Preço Vencedor (R$)", "Preço Concorrente 1 (R$)", "Preço Concorrente 2 (R$)"];
        const example = ["Arroz Parboilizado Tipo 1", "50", "kg", "5,50", "5,90", "6,15"];
        const csvContent = BOM + headers.join(';') + '\n' + example.join(';');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_importacao_itens.csv";
        link.click();
    };

    const ValueCounter = () => {
        if (!selectedEntry) return null;
        const target = Math.abs(selectedEntry.value);
        const subtotal = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.winner_unit_price || 0)), 0);
        const totalAfterDiscount = subtotal - discount;
        const remaining = target - totalAfterDiscount;
        const isOk = Math.abs(remaining) < 0.01;

        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 bg-white/[0.02] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-xl md:rounded-2xl border border-white/5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest leading-none">Lançamento</span>
                    <span className="text-[11px] md:text-[13px] font-bold text-white whitespace-nowrap">{formatCurrency(target)}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-xl md:rounded-2xl border border-white/5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest leading-none">Soma Itens</span>
                    <span className="text-[11px] md:text-[13px] font-bold text-white whitespace-nowrap">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 bg-amber-500/5 rounded-xl md:rounded-2xl border border-amber-500/10">
                    <span className="text-[8px] uppercase font-black text-amber-500/70 tracking-widest leading-none">Desconto</span>
                    <span className="text-[11px] md:text-[13px] font-bold text-amber-500">
                        {discount > 0 ? `– ${formatCurrency(discount)}` : 'R$ 0,00'}
                    </span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 bg-primary/5 rounded-xl md:rounded-2xl border border-primary/10">
                    <span className="text-[8px] uppercase font-black text-primary/70 tracking-widest leading-none">Líquido</span>
                    <span className={`text-[11px] md:text-[13px] font-bold ${isOk ? 'text-green-400' : 'text-primary'}`}>{formatCurrency(totalAfterDiscount)}</span>
                </div>
                <div className={`flex flex-col gap-1.5 p-3 rounded-xl md:rounded-2xl border col-span-2 md:col-span-1 transition-all ${isOk ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
                    <span className={`text-[8px] uppercase font-black tracking-widest leading-none ${isOk ? 'text-green-500' : 'text-red-400'}`}>Pendente</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-[11px] md:text-[13px] font-black ${isOk ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(remaining)}</span>
                        {isOk && <span className="material-symbols-outlined text-green-500 text-sm">verified</span>}
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-0 md:p-8 bg-black/95 backdrop-blur-xl overflow-y-auto pt-0 md:pt-20">
            <div className="w-full max-w-7xl bg-[#0a0f14] border-x md:border border-white/10 rounded-none md:rounded-[40px] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 relative min-h-screen md:min-h-0">
                {/* Header */}
                <div className="p-5 md:p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0a0f14] rounded-t-none md:rounded-t-[40px]">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <h2 className="text-xl md:text-3xl font-black text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-2xl md:text-3xl">assignment_turned_in</span>
                            <span className="truncate">{editingId ? 'Editar Processo' : 'Novo Processo'}</span>
                        </h2>
                        <p className="text-[8px] md:text-xs text-slate-500 uppercase font-black tracking-widest md:tracking-[0.2em]">Fluxo: Lançamento • Cotações • Checklist</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                        <button onClick={onClose} className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl text-slate-400 font-bold hover:bg-white/5 transition-all text-[10px] md:text-sm uppercase tracking-widest">Descartar</button>
                        <button onClick={handleSave} disabled={loading} className="flex-[2] md:flex-none h-12 md:h-14 px-4 md:px-12 rounded-xl md:rounded-2xl bg-primary text-white font-black text-[10px] md:text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50">
                            {loading ? 'Sincronizando...' : 'Finalizar Processo'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-4 md:p-10 space-y-6 md:space-y-10">
                    <ValueCounter />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Section 1 & 3 */}
                        <div className="space-y-10">
                            <section className="bg-white/[0.02] p-5 md:p-8 rounded-2xl md:rounded-[36px] border border-white/5 shadow-2xl space-y-6 md:space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label htmlFor="entry_select" className="text-[8px] md:text-[10px] font-black uppercase text-primary tracking-widest md:tracking-[0.25em] mb-3 block opacity-60">1. Lançamento Base</label>
                                        <button id="entry_select" onClick={() => setShowEntryModal(true)} className="w-full bg-black/40 border border-white/10 rounded-xl md:rounded-2xl h-12 md:h-14 px-4 md:px-5 flex items-center justify-between hover:border-primary/40 hover:bg-black/60 transition-all group/btn">
                                            <span className={`text-[11px] truncate uppercase tracking-tight ${selectedEntry ? 'text-white font-black' : 'text-slate-600 italic font-bold'}`}>
                                                {selectedEntry ? selectedEntry.description : 'Selecionar...'}
                                            </span>
                                            <span className="material-symbols-outlined text-primary/30 group-hover/btn:text-primary transition-all text-sm">receipt</span>
                                        </button>
                                    </div>
                                    <div>
                                        <label htmlFor="process_status" className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest md:tracking-[0.25em] mb-3 block opacity-60">Status</label>
                                        <select title="Selecionar Status do Processo" aria-label="Selecionar Status do Processo" id="process_status" value={processStatus} onChange={e => setProcessStatus(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl md:rounded-2xl h-12 md:h-14 px-4 md:px-5 text-white text-[11px] font-black focus:border-primary outline-none transition-all">
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Concluído">Concluído</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end">
                                    <div className="md:col-span-2">
                                        {selectedEntry && (
                                            <div className="h-12 md:h-14 px-4 md:px-5 bg-primary/5 border border-primary/10 rounded-xl md:rounded-2xl flex items-center gap-3">
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                    <span className="material-symbols-outlined text-sm md:text-[18px] font-black">verified</span>
                                                </div>
                                                <div className="truncate">
                                                    <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest block mb-0.5">Vencedor</span>
                                                    <span className="text-[10px] md:text-[12px] font-black text-white uppercase truncate block">{(selectedEntry as any).suppliers?.name || 'N/A'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="discount_input" className="text-[8px] md:text-[10px] font-black uppercase text-amber-500/70 tracking-widest md:tracking-[0.25em] mb-3 block">Desconto (R$)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/40 font-black text-[10px]">R$</span>
                                            <input id="discount_input" type="number" step="any" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full bg-black/40 border border-amber-500/20 rounded-xl md:rounded-2xl h-12 md:h-14 pl-10 pr-5 text-amber-500 text-[12px] md:text-[13px] font-black focus:border-amber-500 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white/[0.02] p-5 md:p-8 rounded-2xl md:rounded-[36px] border border-white/5 shadow-2xl space-y-4 md:space-y-6">
                                <label className="text-[8px] md:text-[10px] font-black uppercase text-primary tracking-widest md:tracking-[0.25em] mb-2 block opacity-60">3. Checklist</label>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {checklist.map((item, idx) => (
                                        <label key={item.id} className="flex items-center gap-3 p-3.5 md:p-4.5 bg-black/30 rounded-xl md:rounded-[24px] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all group/check shrink-0">
                                            <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg md:rounded-xl flex items-center justify-center border-2 transition-all shrink-0 ${item.checked ? 'bg-primary border-primary text-white' : 'border-white/10 group-hover/check:border-primary/40'}`}>
                                                {item.checked && <span className="material-symbols-outlined text-sm md:text-[18px]">check_circle</span>}
                                                <input type="checkbox" className="hidden" checked={item.checked} onChange={e => { const nc = [...checklist]; nc[idx].checked = e.target.checked; setChecklist(nc); }} />
                                            </div>
                                            <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest ${item.checked ? 'text-white' : 'text-slate-600'}`}>{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Items Section */}
                        <section className="space-y-6 md:space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h4 className="text-[10px] md:text-[12px] font-black uppercase text-white tracking-widest md:tracking-[0.2em]">2. Itens e Cotações</h4>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <input
                                        type="file"
                                        accept=".xml"
                                        ref={xmlInputRef}
                                        className="hidden"
                                        onChange={handleXMLImport}
                                        aria-label="Selecionar arquivo XML de Nota Fiscal"
                                        title="Selecionar arquivo XML de Nota Fiscal"
                                    />
                                    <button
                                        onClick={() => xmlInputRef.current?.click()}
                                        className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 rounded-xl bg-orange-500/10 text-orange-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">xml</span> Nota XML
                                    </button>
                                    <button onClick={() => setShowImportModal(true)} className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 rounded-xl bg-emerald-500/10 text-emerald-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">Planilha</button>
                                    <button onClick={handleAddItem} className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 rounded-xl bg-primary/10 text-primary text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary hover:text-white transition-all">Novo Item</button>
                                </div>
                            </div>

                            <div className="space-y-4 md:space-y-6 max-h-[500px] md:max-h-[600px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                                {items.map((item, idx) => (
                                    <div key={idx} className="bg-white/[0.01] border border-white/5 p-4 md:p-8 rounded-2xl md:rounded-[32px] space-y-4 md:space-y-6 relative overflow-hidden group/item">
                                        <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 items-end">
                                            <div className="w-full md:col-span-11 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
                                                <div className="md:col-span-6">
                                                    <label htmlFor={`desc_${idx}`} className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest opacity-60">Descrição</label>
                                                    <input id={`desc_${idx}`} value={item.description} onChange={e => {
                                                        const it = [...items]; it[idx].description = e.target.value; setItems(it);
                                                        const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].description = e.target.value); setCompetitorQuotes(cq);
                                                    }} className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl h-10 md:h-11 px-3 md:px-4 text-[10px] md:text-[11px] text-white focus:border-primary/50 transition-all outline-none" />
                                                </div>
                                                <div className="grid grid-cols-3 gap-3 md:col-span-6">
                                                    <div className="col-span-1">
                                                        <label htmlFor={`qty_${idx}`} className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest opacity-60 text-center">Qtd</label>
                                                        <input id={`qty_${idx}`} type="number" value={item.quantity} onChange={e => {
                                                            const it = [...items]; it[idx].quantity = Number(e.target.value); setItems(it);
                                                            const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].quantity = Number(e.target.value)); setCompetitorQuotes(cq);
                                                        }} className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl h-10 md:h-11 text-center text-[10px] md:text-[11px] text-white outline-none" />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label htmlFor={`unit_${idx}`} className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest opacity-60 text-center">Unid</label>
                                                        <input id={`unit_${idx}`} value={item.unit} onChange={e => {
                                                            const it = [...items]; it[idx].unit = e.target.value; setItems(it);
                                                            const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].unit = e.target.value); setCompetitorQuotes(cq);
                                                        }} className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl h-10 md:h-11 text-center text-[10px] md:text-[11px] text-white uppercase outline-none" />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label htmlFor={`win_price_${idx}`} className="text-[8px] md:text-[9px] font-black text-primary uppercase mb-1.5 block tracking-widest text-center">Preço R$</label>
                                                        <input id={`win_price_${idx}`} type="number" step="any" value={item.winner_unit_price} onChange={e => { const it = [...items]; it[idx].winner_unit_price = Number(e.target.value); setItems(it); }} className="w-full bg-primary/10 border border-primary/20 rounded-lg md:rounded-xl h-10 md:h-11 px-3 text-center text-[10px] md:text-[11px] text-primary font-black outline-none" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full md:col-span-1 flex justify-end">
                                                <button onClick={() => handleRemoveItem(idx)} className="h-10 w-full md:w-11 md:h-11 flex items-center justify-center rounded-lg md:rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><span className="material-symbols-outlined text-[18px] md:text-[20px]">delete</span><span className="md:hidden text-[10px] font-bold ml-2">Remover Item</span></button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4 md:pt-6 border-t border-white/5">
                                            {competitorQuotes.map((q, qIdx) => (
                                                <div key={qIdx} className="bg-black/30 p-3 md:p-5 rounded-xl md:rounded-2xl border border-white/5 space-y-3 md:space-y-4 relative group/quote">
                                                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-amber-500 text-amber-950 rounded-full text-[7px] md:text-[8px] font-black uppercase">Concorrente {qIdx + 1}</div>
                                                    <button onClick={() => setShowSupplierModal({ open: true, quoteIdx: qIdx })} className="w-full bg-black/40 p-3 rounded-lg md:rounded-xl border border-white/5 flex justify-between items-center hover:border-amber-500/40 transition-all outline-none">
                                                        <span className={`text-[10px] md:text-[11px] uppercase truncate font-bold text-left ${q.supplier_name ? 'text-white' : 'text-slate-600 italic'}`}>{q.supplier_name || 'Vincular...'}</span>
                                                        <span className="material-symbols-outlined text-amber-500 text-xs md:text-sm shrink-0 ml-2">search</span>
                                                    </button>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/30 font-black text-[9px]">R$</span>
                                                        <input aria-label={`Preço Unitário Concorrente ${qIdx + 1}`} type="number" step="any" value={q.items[idx].unit_price} onChange={e => { const cq = [...competitorQuotes]; cq[qIdx].items[idx].unit_price = Number(e.target.value); setCompetitorQuotes(cq); }} className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl h-10 pl-8 pr-3 text-[12px] md:text-[13px] text-amber-500 font-black focus:border-amber-500/50 outline-none transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Attachments */}
                    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-10 pb-20 md:pb-0">
                        <section className="bg-white/[0.02] p-5 md:p-8 rounded-2xl md:rounded-[36px] border border-white/5 shadow-2xl space-y-6 md:space-y-8">
                            <h4 className="text-[10px] md:text-[12px] font-black uppercase text-white tracking-widest md:tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">cloud_upload</span> 4. Anexos Técnicos</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
                                {ACCOUNTABILITY_DOC_CATEGORIES.map(cat => (
                                    <label key={cat} className="flex flex-col items-center justify-center p-2 md:p-3 h-20 md:h-24 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-tight text-center cursor-pointer hover:bg-primary hover:text-white transition-all gap-1.5 md:gap-2 group/up">
                                        <span className="material-symbols-outlined text-base md:text-lg opacity-40 group-hover/up:opacity-100 group-hover/up:scale-110 transition-all">upload</span>
                                        <span className="line-clamp-2 leading-tight">{cat}</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            disabled={isUploadingDoc}
                                            aria-label={`Upload de ${cat}`}
                                            title={`Upload de ${cat}`}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setIsUploadingDoc(true);
                                                try {
                                                    const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
                                                    const fileExt = file.name.split('.').pop();
                                                    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                                                    const path = `accountability/${Date.now()}_${safeName}`;
                                                    const { error: uploadError } = await supabase.storage.from('documents').upload(path, processedFile);
                                                    if (uploadError) throw uploadError;
                                                    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(path);
                                                    setProcessAttachments([...processAttachments, { id: Math.random().toString(), name: file.name, url: publicUrlData.publicUrl, category: cat }]);
                                                } catch (err: any) { addToast(err.message, 'error'); } finally { setIsUploadingDoc(false); }
                                            }} />
                                    </label>
                                ))}
                            </div>
                            <div className="space-y-3">
                                {processAttachments.map(att => (
                                    <div key={att.id} className="flex flex-col gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 group/itematt">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 truncate">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform shrink-0"><span className="material-symbols-outlined">attachment</span></div>
                                                <div className="truncate">
                                                    <span className="text-[11px] text-white font-black block truncate">{att.name}</span>
                                                    <span className="text-[8px] text-primary font-black uppercase opacity-60">{att.category}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setCheckingDocId(checkingDocId === att.id ? null : att.id)}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${att.audit_done ? 'bg-green-500 text-white' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white'}`}
                                                    title="Realizar Conferência de Auditoria"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">{att.audit_done ? 'verified' : 'fact_check'}</span>
                                                </button>
                                                <a href={att.url} target="_blank" className="w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-primary text-slate-500 hover:text-white rounded-xl transition-all"><span className="material-symbols-outlined text-[18px]">visibility</span></a>
                                                <button onClick={() => setProcessAttachments(processAttachments.filter(a => a.id !== att.id))} className="w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-red-500 text-slate-500 hover:text-white rounded-xl transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                            </div>
                                        </div>

                                        {/* Audit Checklist Drawer */}
                                        {checkingDocId === att.id && (
                                            <div className="mt-2 p-4 bg-black/40 rounded-xl border border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Conferência de Auditoria: {att.category}</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {(() => {
                                                        const cat = att.category;
                                                        const checks = att.checks || {};

                                                        const renderCheck = (id: string, label: string) => (
                                                            <label key={id} className="flex items-center gap-3 cursor-pointer group/chk">
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={!!checks[id]}
                                                                    onChange={e => {
                                                                        const updated = processAttachments.map(a => {
                                                                            if (a.id === att.id) {
                                                                                const newChecks = { ...checks, [id]: e.target.checked };
                                                                                return { ...a, checks: newChecks, audit_done: Object.values(newChecks).some(v => v === true) };
                                                                            }
                                                                            return a;
                                                                        });
                                                                        setProcessAttachments(updated);
                                                                    }}
                                                                />
                                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${checks[id] ? 'bg-primary border-primary text-white' : 'border-white/20 group-hover/chk:border-primary/50'}`}>
                                                                    {checks[id] && <span className="material-symbols-outlined text-xs">check</span>}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-300 uppercase leading-none">{label}</span>
                                                            </label>
                                                        );

                                                        const renderInput = (id: string, label: string, type: string) => (
                                                            <div key={id} className="flex flex-col gap-1.5">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
                                                                <input
                                                                    type={type}
                                                                    aria-label={label}
                                                                    placeholder={label}
                                                                    value={checks[id] || ''}
                                                                    onChange={e => {
                                                                        const updated = processAttachments.map(a => {
                                                                            if (a.id === att.id) {
                                                                                return { ...a, checks: { ...checks, [id]: e.target.value } };
                                                                            }
                                                                            return a;
                                                                        });
                                                                        setProcessAttachments(updated);
                                                                    }}
                                                                    className="bg-black/40 border border-white/10 rounded-lg h-8 px-3 text-[10px] text-white outline-none focus:border-primary/50"
                                                                />
                                                            </div>
                                                        );

                                                        const fields = [];
                                                        if (cat === 'Ata de Assembleia') {
                                                            fields.push(renderCheck('ata_complete', 'ATA: Assinatura de no mín. 6 conselheiros (inc. Secretário e Diretor)'));
                                                        } else if (cat === 'Consolidação') {
                                                            fields.push(renderCheck('president', 'CONSOLIDAÇÃO: Assinatura do presidente (diretor)'));
                                                        } else if (cat === 'Ordem de Compra / Serviço') {
                                                            fields.push(renderCheck('president', 'ORDEM DE COMPRA/SERVIÇO: Assinatura do presidente (diretor)'));
                                                        } else if (cat === 'Pesquisa de Preços (Cotações)') {
                                                            fields.push(renderCheck('supplier_sig_stamp', 'COTAÇÕES: Assinatura e carimbo do fornecedor'));
                                                        } else if (cat === 'Certidão de Regularidade' || cat === 'Certidão de Proponente') {
                                                            fields.push(renderCheck('president_sig', 'CERTIDÕES: Assinatura do presidente (diretor)'));
                                                            fields.push(renderInput('president_matr', 'Matrícula do Diretor', 'text'));
                                                        } else if (cat === 'Recibo / Quitação') {
                                                            fields.push(renderCheck('recibo_check', 'RECIBO: Assinatura e carimbo do fornecedor'));
                                                        } else if (cat === 'Comprovante de Pagamento') {
                                                            fields.push(renderCheck('counselor_confere', 'CONFERE COM O ORIGINAL: Assinatura 1º ou 2º Conselheiro'));
                                                            fields.push(renderInput('stamp_date', 'Data do Carimbo', 'date'));
                                                        } else if (cat === 'Nota Fiscal') {
                                                            fields.push(renderCheck('atesto_recebimento', 'ATESTO RECEBIMENTO: Assinatura e Matrícula 1º e 2º Conselheiros'));
                                                            fields.push(renderCheck('atesto_quitacao', 'ATESTO QUITAÇÃO: Assinatura Fornecedor'));
                                                            fields.push(renderCheck('resource_id', 'IDENTIFICAÇÃO RECURSO: Carimbo com recurso pago'));
                                                            fields.push(renderInput('stamps_date', 'Data nos Carimbos', 'date'));
                                                        } else {
                                                            fields.push(<p key="na" className="text-[9px] text-slate-500 italic">Nenhum requisito específico para esta categoria.</p>);
                                                        }

                                                        return fields;
                                                    })()}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const updated = processAttachments.map(a => {
                                                            if (a.id === att.id) return { ...a, audit_done: true };
                                                            return a;
                                                        });
                                                        setProcessAttachments(updated);
                                                        setCheckingDocId(null);
                                                    }}
                                                    className="w-full py-2 bg-primary/20 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                                >
                                                    Finalizar Conferência
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white/[0.02] p-8 rounded-[36px] border border-white/5 border-dashed shadow-2xl space-y-8 opacity-60">
                            <h4 className="text-[12px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined">history_edu</span> Anexos Financeiros</h4>
                            <div className="space-y-3">
                                {selectedEntry?.attachments?.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-4 truncate">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 shrink-0"><span className="material-symbols-outlined">receipt_long</span></div>
                                            <div className="truncate">
                                                <span className="text-[11px] text-white font-black block truncate">{att.name}</span>
                                                <span className="text-[8px] text-slate-600 font-black uppercase">{att.category || 'FINANCEIRO'}</span>
                                            </div>
                                        </div>
                                        <a href={att.url} target="_blank" className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/20 rounded-xl text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined text-[18px]">visibility</span></a>
                                    </div>
                                )) || <div className="text-center py-10 text-slate-700 text-[10px] font-black uppercase tracking-widest">Nenhum anexo.</div>}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Entry Selection Modal */}
            {showEntryModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/98 backdrop-blur-md">
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111a22]">
                            <h3 className="text-lg font-bold text-white uppercase tracking-widest">Selecionar Lançamento</h3>
                            <button onClick={() => setShowEntryModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4 overflow-hidden">
                            <input aria-label="Buscar lançamento" placeholder="Buscar lançamento..." className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-5 text-white outline-none focus:border-primary transition-all" value={entrySearch} onChange={e => setEntrySearch(e.target.value)} autoFocus />
                            <div className="overflow-y-auto space-y-2 custom-scrollbar">
                                {auxData.availableEntries.filter(e => e.description.toLowerCase().includes(entrySearch.toLowerCase())).map(e => (
                                    <button key={e.id} onClick={() => { setSelectedEntry(e); setCompetitorQuotes([{ supplier_id: '', supplier_name: '', supplier_cnpj: '', items: items.map(it => ({ ...it, unit_price: 0 })) }, { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: items.map(it => ({ ...it, unit_price: 0 })) }]); setShowEntryModal(false); setEntrySearch(''); }} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center hover:bg-primary/10 transition-all text-left">
                                        <div>
                                            <span className="text-sm font-bold text-white block">{e.description}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{(e as any).suppliers?.name} • {(e as any).schools?.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-white">{formatCurrency(Math.abs(e.value))}</span>
                                            <span className="text-[10px] text-slate-500 block">{new Date(e.date).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Supplier Selection Modal */}
            {showSupplierModal.open && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/98 backdrop-blur-md">
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[70vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111a22]">
                            <h3 className="text-lg font-bold text-white uppercase tracking-widest">Selecionar Fornecedor</h3>
                            <button onClick={() => setShowSupplierModal({ open: false, quoteIdx: -1 })} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4 overflow-hidden">
                            <input aria-label="Buscar fornecedor por nome ou CNPJ" placeholder="Buscar por nome ou CNPJ..." className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-5 text-white outline-none focus:border-primary transition-all" value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} autoFocus />
                            <div className="overflow-y-auto space-y-2 custom-scrollbar">
                                {auxData.suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                                    <button key={s.id} onClick={() => handleSelectSupplier(s)} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-primary/10 hover:border-primary/30 transition-all">
                                        <span className="text-sm font-bold text-white block">{s.name}</span>
                                        <span className="text-[10px] text-slate-500">{s.cnpj || 'SEM CNPJ'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/99 backdrop-blur-md overflow-y-auto">
                    <div className="bg-[#0a0f14] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest leading-tight">Importação em Massa</h3>
                            <button onClick={() => setShowImportModal(false)} className="w-12 h-12 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={downloadTemplate} className="h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 font-black uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-3"><span className="material-symbols-outlined">download</span> Modelo CSV</button>
                                <label className="h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-3 cursor-pointer"><span className="material-symbols-outlined">upload_file</span> Subir CSV <input type="file" accept=".csv" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); if (text) { setImportText(text); setTimeout(() => processImport(), 100); } }} /></label>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Colunas: Descrição, Qtd, Unid, Preço Vencedor, Concorrente 1, Concorrente 2</label>
                                <textarea id="import_text" value={importText} onChange={e => setImportText(e.target.value)} className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-6 text-xs font-mono text-white outline-none focus:border-primary transition-all resize-none" placeholder="Cole os dados aqui..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button onClick={() => setShowImportModal(false)} className="px-8 h-12 text-slate-400 font-bold uppercase tracking-widest hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
                                <button onClick={processImport} disabled={!importText.trim()} className="px-12 h-12 bg-primary text-white font-black uppercase tracking-widest rounded-xl shadow-2xl shadow-primary/30 hover:bg-primary-hover transition-all">Importar Itens</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountabilityProcessModal;
