
import React, { useState, useEffect } from 'react';
import { User, FinancialEntry, AccountabilityProcess, AccountabilityItem, AccountabilityQuote, AccountabilityQuoteItem, Supplier } from '../types';
import { supabase } from '../lib/supabaseClient';
import { printDocument, formatCurrency } from '../lib/printUtils';
import { generateAtaHTML, generateConsolidacaoHTML, generateOrdemHTML, generateReciboHTML, generateCotacaoHTML } from '../lib/documentTemplates';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';
import { UserRole } from '../types';

const Reports: React.FC<{ user: User }> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [processes, setProcesses] = useState<AccountabilityProcess[]>([]);
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [availableEntries, setAvailableEntries] = useState<FinancialEntry[]>([]);
  const [currentProcess, setCurrentProcess] = useState<AccountabilityProcess | null>(null);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<'Em Andamento' | 'Concluído'>('Em Andamento');
  const [discount, setDiscount] = useState(0);
  const [checklist, setChecklist] = useState<{ id: string, label: string, checked: boolean }[]>([
    { id: 'quotations', label: '3 Orçamentos anexados', checked: false },
    { id: 'winner_price', label: 'Vencedor validado com menor preço', checked: false },
    { id: 'invoice', label: 'Nota Fiscal anexa', checked: false },
    { id: 'certificates', label: 'Certidões negativas válidas', checked: false },
    { id: 'minutes', label: 'Ata de Assembleia assinada', checked: false }
  ]);
  const [schools, setSchools] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const ACCOUNTABILITY_DOC_CATEGORIES = ['Ata de Assembleia', 'Pesquisa de Preços', 'Certidão de Proponente', 'Ordem de Compra', 'Recibo / Quitação', 'Outros'];

  // Permissions
  const reportPerm = usePermissions(user, 'reports');
  const accessibleSchools = useAccessibleSchools(user, schools);

  // Filters
  const [filterSchool, setFilterSchool] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Selection Modals
  const [showSupplierModal, setShowSupplierModal] = useState<{ open: boolean, quoteIdx: number }>({ open: false, quoteIdx: -1 });
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // New Process Form State
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

  useEffect(() => {
    fetchAvailableEntries();
    fetchSuppliers();
    fetchAuxData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProcesses();
    }, 300);
    return () => clearTimeout(timer);
  }, [filterSchool, filterProgram, filterStatus, filterSearch]);

  const fetchAuxData = async () => {
    const { data: s } = await supabase.from('schools').select('id, name').order('name');
    const { data: p } = await supabase.from('programs').select('id, name').order('name');
    if (s) setSchools(s);
    if (p) setPrograms(p);
  };

  const fetchProcesses = async () => {
    let query = supabase
      .from('accountability_processes')
      .select(`
        *, 
        financial_entries!inner(*, schools(*), programs(name), suppliers(*), payment_methods(name)),
        accountability_items(*)
      `)
      .order('created_at', { ascending: false });

    if (filterSchool) query = query.eq('school_id', filterSchool);
    if (filterProgram) query = query.eq('financial_entries.program_id', filterProgram);
    if (filterStatus) query = query.eq('status', filterStatus);
    if (filterSearch) query = query.ilike('financial_entries.description', `%${filterSearch}%`);

    // Apply visibility restrictions
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
      if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
        query = query.eq('school_id', user.schoolId);
      } else if (user.role === UserRole.TECNICO_GEE) {
        if (user.assignedSchools && user.assignedSchools.length > 0) {
          query = query.in('school_id', user.assignedSchools);
        } else {
          setProcesses([]);
          return;
        }
      }
    }

    const { data: procs, error } = await query;

    if (error) console.error('Error fetching processes:', error);
    else setProcesses(procs || []);
  };

  const fetchAvailableEntries = async () => {
    let entriesQuery = supabase
      .from('financial_entries')
      .select('*, schools(*), programs(name), suppliers(id, name, cnpj)')
      .eq('type', 'Saída');

    // Filter available entries by school if restricted
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
      if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
        entriesQuery = entriesQuery.eq('school_id', user.schoolId || '');
      } else if (user.role === UserRole.TECNICO_GEE) {
        if (user.assignedSchools && user.assignedSchools.length > 0) {
          entriesQuery = entriesQuery.in('school_id', user.assignedSchools);
        } else {
          setAvailableEntries([]);
          return;
        }
      }
    }

    const { data: entries } = await entriesQuery;

    const { data: existingProcEntries } = await supabase
      .from('accountability_processes')
      .select('financial_entry_id');

    const usedIds = new Set((existingProcEntries || []).map(p => p.financial_entry_id));
    setAvailableEntries((entries || []).filter(e => !usedIds.has(e.id)));
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    if (data) setAllSuppliers(data);
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

    // Verificar se o fornecedor já é o ganhador
    if (selectedEntry?.supplier_id === supplier.id || selectedEntry?.suppliers?.id === supplier.id) {
      alert('Este fornecedor já é o GANHADOR deste processo. Selecione outro para a cotação concorrente.');
      return;
    }

    // Verificar se já foi selecionado no outro proponente
    const alreadySelected = competitorQuotes.some((q, idx) => idx !== quoteIdx && q.supplier_id === supplier.id);
    if (alreadySelected) {
      alert('Este fornecedor já foi selecionado como proponente nesta prestação de contas.');
      return;
    }

    const cq = [...competitorQuotes];
    cq[quoteIdx].supplier_id = supplier.id;
    cq[quoteIdx].supplier_name = supplier.name;
    cq[quoteIdx].supplier_cnpj = supplier.cnpj || '';
    setCompetitorQuotes(cq);
    setShowSupplierModal({ open: false, quoteIdx: -1 });
    setSupplierSearch('');
  };

  const downloadTemplate = () => {
    const BOM = "\uFEFF";
    const headers = ["Descrição Detalhada", "Quantidade", "Unidade", "Preço Vencedor (R$)", "Preço Concorrente 1 (R$)", "Preço Concorrente 2 (R$)"];
    const example = ["Arroz Parboilizado Tipo 1", "50", "kg", "5,50", "5,90", "6,15"];

    const csvContent = BOM + headers.join(';') + '\n' + example.join(';');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_brn.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processImport = () => {
    if (!importText.trim()) return;

    const lines = importText.trim().split('\n');
    const parsedRows: any[] = [];

    const parseNumber = (str: string) => {
      if (!str) return 0;
      let clean = str.replace(/[R$\s]/g, '');
      // If has comma, assume PT-BR
      if (clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      }
      return parseFloat(clean) || 0;
    };

    lines.forEach(line => {
      const cols = line.split('\t');
      if (cols.length < 2) return; // Skip invalid lines

      // Expected Order: Desc | Qty | Unit | WinnerPrice | Comp1Price | Comp2Price
      let desc = cols[0].trim();
      let qtyRaw = cols[1] ? cols[1].trim() : '1';
      let unit = cols[2] ? cols[2].trim() : 'Unid.';
      let priceWinnerRaw = cols[3] ? cols[3].trim() : '0';
      let priceComp1Raw = cols[4] ? cols[4].trim() : '0';
      let priceComp2Raw = cols[5] ? cols[5].trim() : '0';

      parsedRows.push({
        item: {
          description: desc,
          quantity: parseNumber(qtyRaw),
          unit: unit,
          winner_unit_price: parseNumber(priceWinnerRaw)
        },
        comp1Price: parseNumber(priceComp1Raw),
        comp2Price: parseNumber(priceComp2Raw)
      });
    });

    const newItems = parsedRows.map(r => r.item);

    if (newItems.length > 0) {
      // Append to existing or replace?
      // Usually append if existing items are empty/default, otherwise append.
      // Let's append but remove the first empty default item if it exists and hasn't been touched.
      let currentItems = [...items];
      if (currentItems.length === 1 && !currentItems[0].description && currentItems[0].winner_unit_price === 0) {
        currentItems = [];
      }

      const mergedItems = [...currentItems, ...newItems];
      setItems(mergedItems);

      // Update comps
      setCompetitorQuotes(competitorQuotes.map((q, qIdx) => ({
        ...q,
        items: mergedItems.map((mi, idx) => {
          // If it's an existing item, preserve its quote price
          if (idx < currentItems.length) return q.items[idx];

          // For new items, use imported competitor prices
          const importedRow = parsedRows[idx - currentItems.length];
          return {
            description: mi.description,
            quantity: mi.quantity,
            unit: mi.unit,
            unit_price: qIdx === 0 ? importedRow.comp1Price : importedRow.comp2Price
          };
        })
      })));

      alert(`${newItems.length} itens importados com sucesso!`);
      setShowImportModal(false);
      setImportText('');
    } else {
      alert('Não foi possível identificar itens válidos. Verifique o formato.');
    }
  };

  const handleSelectEntry = (entry: FinancialEntry) => {
    // Limpar seleções anteriores de fornecedores caso haja conflito
    setCompetitorQuotes([
      { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: items.map(it => ({ ...it, unit_price: 0 })) },
      { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: items.map(it => ({ ...it, unit_price: 0 })) }
    ]);
    setSelectedEntry(entry);
    setShowEntryModal(false);
    setEntrySearch('');
  };

  const handleEdit = (process: AccountabilityProcess) => {
    const entry = (process as any).financial_entry || (process as any).financial_entries;

    setEditingProcessId(process.id);
    setSelectedEntry(entry || null);
    setProcessStatus(process.status);
    setDiscount(process.discount || 0);
    setProcessAttachments(process.attachments || []);
    if (process.checklist) {
      setChecklist(process.checklist);
    } else {
      setChecklist([
        { id: 'quotations', label: '3 Orçamentos anexados', checked: false },
        { id: 'winner_price', label: 'Vencedor validado com menor preço', checked: false },
        { id: 'invoice', label: 'Nota Fiscal anexa', checked: false },
        { id: 'certificates', label: 'Certidões negativas válidas', checked: false },
        { id: 'minutes', label: 'Ata de Assembleia assinada', checked: false }
      ]);
    }

    // Set Items - Map from accountability_items if present
    const docItems = (process as any).accountability_items || process.items || [];
    setItems(docItems);

    // Set Competitor Quotes
    const competitors = (process.quotes || [])
      .filter(q => !q.is_winner)
      .map(q => ({
        supplier_id: q.supplier_id || '',
        supplier_name: q.supplier_name,
        supplier_cnpj: q.supplier_cnpj || '',
        // Map from accountability_quote_items
        items: (q as any).accountability_quote_items || q.items || []
      }));

    // Ensure we always have 2 competitor quotes for the UI
    if (competitors.length > 0) {
      const paddedCompetitors = [...competitors];
      while (paddedCompetitors.length < 2) {
        paddedCompetitors.push({
          supplier_id: '',
          supplier_name: '',
          supplier_cnpj: '',
          items: docItems.map(it => ({ ...it, unit_price: 0 }))
        });
      }
      setCompetitorQuotes(paddedCompetitors.slice(0, 2));
    } else {
      setCompetitorQuotes([
        { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: docItems.map(it => ({ ...it, unit_price: 0 })) },
        { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: docItems.map(it => ({ ...it, unit_price: 0 })) }
      ]);
    }

    setShowNewProcessModal(true);
  };

  const handleCreateProcess = async () => {
    if (!selectedEntry) return;

    // Validação de proponentes preenchidos
    const missingSupplier = competitorQuotes.some(q => !q.supplier_id);
    if (missingSupplier) {
      alert('Por favor, selecione os 2 fornecedores proponentes para completar o quadro comparativo.');
      return;
    }

    const currentTotal = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.winner_unit_price || 0)), 0);
    const targetValue = Math.abs(selectedEntry.value);

    if (Math.abs(currentTotal - targetValue) > 0.01) {
      if (!confirm(`O valor total dos itens (${currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) é diferente do valor do lançamento (${targetValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Deseja prosseguir mesmo assim?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      let processId = editingProcessId;

      if (editingProcessId) {
        // Update existing process
        const { error: upError } = await supabase
          .from('accountability_processes')
          .update({
            status: processStatus,
            discount: discount,
            checklist: checklist,
            attachments: processAttachments,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProcessId);
        if (upError) throw upError;

        // Delete old items and quotes (cascading will handle children)
        await supabase.from('accountability_items').delete().eq('process_id', editingProcessId);
        await supabase.from('accountability_quotes').delete().eq('process_id', editingProcessId);
      } else {
        // Create new process
        const { data: process, error: pError } = await supabase
          .from('accountability_processes')
          .insert({
            financial_entry_id: selectedEntry.id,
            school_id: selectedEntry.school_id,
            status: processStatus,
            discount: discount,
            checklist: checklist,
            attachments: processAttachments
          })
          .select()
          .single();
        if (pError) throw pError;
        processId = process.id;
      }

      if (!processId) throw new Error('Falha ao identificar o ID do processo.');

      const { error: iError } = await supabase.from('accountability_items').insert(
        items.map(it => ({ ...it, process_id: processId }))
      );
      if (iError) throw iError;

      const { data: winnerQuote, error: wqError } = await supabase
        .from('accountability_quotes')
        .insert({
          process_id: processId,
          supplier_id: selectedEntry.supplier_id,
          supplier_name: selectedEntry.suppliers?.name || 'Fornecedor Ganhador',
          supplier_cnpj: selectedEntry.suppliers?.cnpj || null,
          is_winner: true,
          total_value: currentTotal
        })
        .select().single();
      if (wqError) throw wqError;

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

        const qItems = comp.items.map(it => ({
          quote_id: q.id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price
        }));
        const { error: qie } = await supabase.from('accountability_quote_items').insert(qItems);
        if (qie) throw qie;
      }

      // NOVO: Se o processo for concluído, marcar o lançamento como CONSOLIDADO
      if (processStatus === 'Concluído') {
        const { error: statusError } = await supabase
          .from('financial_entries')
          .update({ status: 'Consolidado' })
          .eq('id', selectedEntry.id);

        if (statusError) {
          console.warn('Não foi possível consolidar o lançamento financeiro:', statusError.message);
        }
      }

      alert(editingProcessId ? 'Processo atualizado com sucesso!' : 'Processo de Prestação de Contas iniciado com sucesso!');
      setShowNewProcessModal(false);
      resetModal();
      fetchProcesses();
      fetchAvailableEntries();

      if (editingProcessId) {
        setActiveTab('list');
        setCurrentProcess(null);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta prestação de contas? Todos os dados técnicos e cotações anexados serão perdidos e o lançamento voltará a ficar pendente.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('accountability_processes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Prestação de contas excluída com sucesso.');
      setActiveTab('list');
      setCurrentProcess(null);
      fetchProcesses();
      fetchAvailableEntries();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedEntry(null);
    setEditingProcessId(null);
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
      { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: [{ description: '', quantity: 1, unit: 'un', unit_price: 0 }] },
      { supplier_id: '', supplier_name: '', supplier_cnpj: '', items: [{ description: '', quantity: 1, unit: 'un', unit_price: 0 }] }
    ]);
  };

  const filteredSuppliers = allSuppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      (s.cnpj && s.cnpj.includes(supplierSearch));

    if (!matchesSearch) return false;

    // Exclude winner from financial entry
    if (selectedEntry?.supplier_id === s.id || selectedEntry?.suppliers?.id === s.id) return false;

    // Exclude suppliers already assigned to other quotes
    const alreadyUsed = competitorQuotes.some(q => q.supplier_id === s.id);
    if (alreadyUsed) return false;

    return true;
  });

  const filteredEntries = availableEntries.filter(e =>
    e.description.toLowerCase().includes(entrySearch.toLowerCase()) ||
    (e.suppliers?.name && e.suppliers.name.toLowerCase().includes(entrySearch.toLowerCase())) ||
    Number(e.value).toString().includes(entrySearch)
  );

  const ValueCounter = () => {
    if (!selectedEntry) return null;
    const target = Math.abs(selectedEntry.value);
    const subtotal = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.winner_unit_price || 0)), 0);
    const totalAfterDiscount = subtotal - discount;
    const remaining = target - totalAfterDiscount;
    const isOk = Math.abs(remaining) < 0.01;

    return (
      <div className="flex flex-col md:flex-row gap-4 md:items-center bg-[#111a22] p-4 rounded-2xl border border-white/5 shadow-inner">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">Total do Lançamento</span>
          <span className="text-sm font-bold text-white">{target.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="hidden md:block w-px h-8 bg-white/10"></div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">Soma dos Itens</span>
          <span className="text-sm font-bold text-white">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="hidden md:block w-px h-8 bg-white/10"></div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-black text-amber-500 tracking-tighter">Desconto Aplicado</span>
          <span className="text-sm font-bold text-amber-500">-{discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="hidden md:block w-px h-8 bg-white/10"></div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">Total Líquido</span>
          <span className={`text-sm font-bold ${isOk ? 'text-green-400' : 'text-primary'}`}>{totalAfterDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="hidden md:block w-px h-8 bg-white/10"></div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">Falta Ratear</span>
          <span className={`text-sm font-bold ${isOk ? 'text-green-400' : 'text-red-400'}`}>{remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        {isOk && (
          <div className="md:ml-auto w-full md:w-auto bg-green-500/10 text-green-500 px-3 py-1 rounded-lg flex items-center justify-center md:justify-start gap-1 border border-green-500/20">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span className="text-[9px] font-black uppercase">Batido</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-white">Prestação de Contas</h1>
          <p className="text-slate-400 text-sm">Controle de cotações, itens de nota e finalização documental.</p>
        </div>
        <div className="flex items-center gap-3">
          {(activeTab === 'list' && reportPerm.canCreate && user.role !== UserRole.DIRETOR) && (
            <button onClick={() => { resetModal(); setShowNewProcessModal(true) }} className="h-12 px-6 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined">add_circle</span> Novo Processo
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="flex flex-col gap-6">
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">warning</span>
              <span className="text-sm font-bold text-red-200">
                Atenção: Existem {availableEntries.length} lançamentos aguardando prestação de contas.
              </span>
            </div>
            <button onClick={() => setShowNewProcessModal(true)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600 transition-colors">
              Resolver Agora
            </button>
          </div>

          {/* Filters Section */}
          <div className="bg-[#111a22] border border-surface-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Escola</label>
              <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="w-full bg-[#1c2936] text-white text-xs h-9 rounded border border-surface-border">
                <option value="">Todas as Escolas</option>
                {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Programa</label>
              <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="w-full bg-[#1c2936] text-white text-xs h-9 rounded border border-surface-border">
                <option value="">Todos os Programas</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-[#1c2936] text-white text-xs h-9 rounded border border-surface-border">
                <option value="">Todos os Status</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Busca</label>
              <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="w-full bg-[#1c2936] text-white text-xs h-9 rounded border border-surface-border" placeholder="Descrição..." />
            </div>
            <div className="md:col-span-1">
              <button
                onClick={() => { setFilterSchool(''); setFilterProgram(''); setFilterStatus(''); setFilterSearch(''); }}
                className="w-full bg-surface-dark border border-surface-border text-white text-xs h-9 rounded font-bold hover:bg-slate-700 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {processes.length === 0 ? (
              <div className="bg-surface-dark border border-surface-border rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl opacity-20">search_off</span>
                <p>Nenhuma prestação de contas encontrada com os filtros selecionados.</p>
              </div>
            ) : processes.map(process => {
              const entry = (process as any).financial_entry || (process as any).financial_entries;
              const schoolName = entry?.schools?.name || 'Escola não informada';
              return (
                <div key={process.id} className="bg-surface-dark border border-surface-border rounded-2xl p-6 hover:border-primary/40 transition-all flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${process.status === 'Concluído' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
                      <span className="material-symbols-outlined text-3xl font-light">
                        {process.status === 'Concluído' ? 'check_circle' : 'pending'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{entry?.description}</h3>
                        <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/10 font-black uppercase">{entry?.nature}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-[10px] uppercase font-black text-slate-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-primary">school</span> {schoolName}
                        </span>
                        <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">person</span> {entry?.suppliers?.name || 'Sem Fornecedor'}
                        </span>
                        <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">calendar_month</span> {entry?.date ? new Date(entry.date).toLocaleDateString('pt-BR') : '---'}
                        </span>
                        <span className="text-[10px] uppercase font-black text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">account_balance</span> {entry?.programs?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-black text-white">{Number(entry?.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{process.status}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const { data: quotes } = await supabase.from('accountability_quotes').select('*, accountability_quote_items(*), suppliers(*)').eq('process_id', process.id);
                        setCurrentProcess({ ...process, quotes, financial_entry: entry });
                        setActiveTab('details');
                      }}
                      className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button onClick={() => setActiveTab('list')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span> Voltar
          </button>

          <div className="bg-surface-dark border border-surface-border rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 bg-[#111a22] flex justify-between items-center border-b border-surface-border">
              <div>
                <h2 className="text-3xl font-black text-white">{currentProcess?.financial_entry?.description}</h2>
                <p className="text-slate-400 font-medium">Processo de Prestação de Contas • {currentProcess?.financial_entry?.schools?.name}</p>
              </div>
              <div className="flex gap-3">
                {(reportPerm.canEdit && user.role !== UserRole.DIRETOR) && (
                  <button
                    onClick={() => handleEdit(currentProcess)}
                    className="h-12 px-6 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="material-symbols-outlined">edit</span> Editar
                  </button>
                )}
                {reportPerm.canDelete && (
                  <button
                    onClick={() => currentProcess && handleDeleteProcess(currentProcess.id)}
                    className="h-12 px-6 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="material-symbols-outlined">delete_forever</span> Excluir
                  </button>
                )}
                <button
                  onClick={() => printDocument(generateConsolidacaoHTML(currentProcess))}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined">print</span> Imprimir Pack
                </button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-black uppercase text-primary tracking-widest">Quadro Comparativo (3 Orçamentos)</h4>
                    <div className="flex gap-2">
                      <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded font-black uppercase border border-green-500/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span> Vencedor em Destaque
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
                    <table className="w-full text-left text-xs text-slate-400">
                      <thead className="bg-white/5 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-4">Item / Descrição</th>
                          {currentProcess?.quotes?.map(q => (
                            <th key={q.id} className={`p-4 text-center ${q.is_winner ? 'bg-primary/20 text-primary border-x border-primary/20' : ''}`}>
                              <span className="block">{q.supplier_name}</span>
                              <span className="text-[9px] font-black opacity-60 uppercase">{q.is_winner ? 'GANHADOR' : 'CONCORRENTE'}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {currentProcess?.items?.map(item => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="p-4 font-medium text-slate-300">{item.description} ({item.quantity} {item.unit})</td>
                            {currentProcess?.quotes?.map(q => {
                              const qItem = q.accountability_quote_items?.find((qi: any) => qi.description === item.description);
                              const price = q.is_winner ? item.winner_unit_price : (qItem?.unit_price || 0);
                              return (
                                <td key={q.id} className={`p-4 text-center ${q.is_winner ? 'bg-primary/5 font-black text-white border-x border-primary/10' : ''}`}>
                                  {formatCurrency(Number(price))}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-white/5 font-black">
                        <tr>
                          <td className="p-4 text-slate-500 uppercase">Valor Total do Lote</td>
                          {currentProcess?.quotes?.map(q => (
                            <td key={q.id} className={`p-4 text-center ${q.is_winner ? 'text-primary bg-primary/10 border-x border-primary/20' : 'text-slate-300'}`}>
                              {formatCurrency(q.total_value || 0)}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                  <h4 className="text-xs font-black uppercase text-primary tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">description</span>
                    Pack de Documentos Oficiais
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => printDocument(generateAtaHTML(currentProcess))}
                      className="flex items-center gap-3 p-4 bg-[#111a22] hover:bg-white/5 border border-white/5 rounded-xl text-left transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined">gavel</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white leading-tight">Ata de Pesquisa</span>
                        <span className="text-[10px] text-slate-500 uppercase">Assembleia Geral</span>
                      </div>
                      <span className="material-symbols-outlined ml-auto text-slate-600">print</span>
                    </button>

                    <button
                      onClick={() => printDocument(generateConsolidacaoHTML(currentProcess))}
                      className="flex items-center gap-3 p-4 bg-[#111a22] hover:bg-white/5 border border-white/5 rounded-xl text-left transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined">analytics</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white leading-tight">Consolidação</span>
                        <span className="text-[10px] text-slate-500 uppercase">Quadro Comparativo</span>
                      </div>
                      <span className="material-symbols-outlined ml-auto text-slate-600">print</span>
                    </button>

                    <button
                      onClick={() => printDocument(generateOrdemHTML(currentProcess))}
                      className="flex items-center gap-3 p-4 bg-[#111a22] hover:bg-white/5 border border-white/5 rounded-xl text-left transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined">shopping_cart</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white leading-tight">Ordem de Compra</span>
                        <span className="text-[10px] text-slate-500 uppercase">Autorização PNAE</span>
                      </div>
                      <span className="material-symbols-outlined ml-auto text-slate-600">print</span>
                    </button>

                    <button
                      onClick={() => printDocument(generateReciboHTML(currentProcess))}
                      className="flex items-center gap-3 p-4 bg-[#111a22] hover:bg-white/5 border border-white/5 rounded-xl text-left transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined">receipt</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white leading-tight">Recibo de Pagamento</span>
                        <span className="text-[10px] text-slate-500 uppercase">Quitação de Fornecedor</span>
                      </div>
                      <span className="material-symbols-outlined ml-auto text-slate-600">print</span>
                    </button>

                    {currentProcess?.quotes?.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => printDocument(generateCotacaoHTML(currentProcess, idx))}
                        className="flex items-center gap-3 p-4 bg-[#111a22] hover:bg-white/5 border border-white/5 rounded-xl text-left transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-lg ${q.is_winner ? 'bg-primary/10 text-primary group-hover:bg-primary' : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500'} flex items-center justify-center group-hover:text-white transition-all`}>
                          <span className="material-symbols-outlined">assignment</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-white leading-tight truncate">{q.supplier_name}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                            Cotação {idx + 1} {q.is_winner ? '• Ganhador' : '• Participante'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-slate-600">print</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <p className="text-[10px] text-primary font-black uppercase leading-relaxed text-center italic">
                      "Documentos gerados conforme resolução CD/FNDE nº 09/2011"
                    </p>
                  </div>
                </section>

                <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">folder_shared</span>
                    Documentação Digital (Anexos)
                  </h4>
                  <div className="space-y-3">
                    {/* Technical Attachments */}
                    {currentProcess?.attachments?.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-[#111a22] rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="material-symbols-outlined text-primary text-sm">description</span>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate">{att.name}</span>
                            <span className="text-[9px] text-slate-500 font-black uppercase">Documento Técnico</span>
                          </div>
                        </div>
                        <a href={att.url} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                      </div>
                    ))}
                    {/* Financial Entry Attachments */}
                    {currentProcess?.financial_entry?.attachments?.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="material-symbols-outlined text-amber-500 text-sm">payments</span>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-300 truncate">{att.name}</span>
                            <span className="text-[9px] text-slate-600 font-black uppercase">{att.category || 'Financeiro'}</span>
                          </div>
                        </div>
                        <a href={att.url} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                      </div>
                    ))}

                    {(!currentProcess?.attachments?.length && !currentProcess?.financial_entry?.attachments?.length) && (
                      <div className="p-6 text-center text-slate-600 italic border border-white/5 border-dashed rounded-xl">
                        <p className="text-[10px] uppercase font-bold">Nenhum anexo digital encontrado.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Process Modal */}
      {showNewProcessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/99 backdrop-blur-xl">
          <div className="bg-surface-dark border border-surface-border w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">
            <div className="px-8 py-6 border-b border-surface-border flex justify-between items-center sticky top-0 bg-surface-dark z-20">
              <div>
                <h2 className="text-2xl font-black text-white">{editingProcessId ? 'Editar Processo' : 'Novo Processo'}: Detalhamento Técnico</h2>
                <p className="text-sm text-slate-400">{editingProcessId ? 'Atualize as informações do processo selecionado.' : 'Vincule o pagamento e detalhe os orçamentos concorrentes.'}</p>
              </div>
              <button onClick={() => setShowNewProcessModal(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined text-4xl">close</span></button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase text-primary tracking-widest mb-3 block">1. Lançamento Base (Pagamento)</label>
                      <div
                        onClick={() => setShowEntryModal(true)}
                        className="bg-[#111a22] border border-white/10 rounded-xl h-12 px-4 flex items-center justify-between cursor-pointer hover:border-primary transition-all"
                      >
                        <span className={selectedEntry ? 'text-white font-bold' : 'text-slate-500 italic'}>
                          {selectedEntry ? `${selectedEntry.description} - ${Number(selectedEntry.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Clique para selecionar...'}
                        </span>
                        <span className="material-symbols-outlined text-primary">search</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-primary tracking-widest mb-3 block">Status do Processo</label>
                      <select
                        value={processStatus}
                        onChange={(e) => setProcessStatus(e.target.value as any)}
                        className="w-full bg-[#111a22] border border-white/10 rounded-xl h-12 px-4 text-white font-bold focus:border-primary outline-none transition-all"
                      >
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-amber-500 tracking-widest mb-3 block">Desconto na Nota (R$)</label>
                      <input
                        type="number"
                        step="any"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-full bg-[#111a22] border border-amber-500/30 rounded-xl h-12 px-4 text-amber-500 font-bold focus:border-amber-500 outline-none transition-all placeholder:text-amber-500/30"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  {selectedEntry && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-sm">emoji_events</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest block leading-none">Fornecedor Ganhador</span>
                        <span className="text-sm font-bold text-white uppercase">{selectedEntry.suppliers?.name || 'NÃO INFORMADO NO FINANCEIRO'}</span>
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <label className="text-xs font-black uppercase text-primary tracking-widest mb-4 block">3. Checklist de Conformidade</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {checklist.map((item, idx) => (
                      <label key={item.id} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-all group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${item.checked ? 'bg-primary border-primary text-white' : 'border-white/20 group-hover:border-primary/50'}`}>
                          {item.checked && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={item.checked}
                            onChange={(e) => {
                              const newChecklist = [...checklist];
                              newChecklist[idx].checked = e.target.checked;
                              setChecklist(newChecklist);
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <span className={`text-[11px] font-bold uppercase transition-all ${item.checked ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.label}</span>
                          {/* Dica visual se o documento existe nos anexos */}
                          {((item.id === 'quotations' && [...processAttachments, ...(selectedEntry?.attachments || [])].some(a => a.category === 'Pesquisa de Preços' || a.category === 'Nota Fiscal')) ||
                            (item.id === 'invoice' && [...processAttachments, ...(selectedEntry?.attachments || [])].some(a => a.category === 'Nota Fiscal')) ||
                            (item.id === 'certificates' && [...processAttachments, ...(selectedEntry?.attachments || [])].some(a => a.category?.includes('Certidão'))) ||
                            (item.id === 'minutes' && [...processAttachments, ...(selectedEntry?.attachments || [])].some(a => a.category === 'Ata de Assembleia'))) && (
                              <span className="flex items-center gap-1 text-[8px] text-green-500 font-black mt-1 uppercase">
                                <span className="material-symbols-outlined text-[10px]">cloud_done</span> Documento detectado no repositório
                              </span>
                            )}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <ValueCounter />
              </div>

              {selectedEntry && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <h4 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">attach_file</span>
                        4. Documentação da Prestação (Anexos Técnicos)
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {ACCOUNTABILITY_DOC_CATEGORIES.slice(0, 3).map(cat => (
                          <label key={cat} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-bold border border-primary/20 cursor-pointer hover:bg-primary/20 transition-all">
                            + {cat.split(' ')[0]}
                            <input
                              type="file"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploadingDoc(true);
                                try {
                                  const sanitizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
                                  const path = `accountability/${Date.now()}_${sanitizedName}`;
                                  const { error: uploadError } = await supabase.storage.from('documents').upload(path, file);
                                  if (uploadError) throw uploadError;
                                  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
                                  setProcessAttachments([...processAttachments, { id: Math.random().toString(), name: file.name, url: publicUrl, category: cat }]);
                                } catch (err: any) { alert(err.message); } finally { setIsUploadingDoc(false); }
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {processAttachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 group">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">description</span>
                            <div>
                              <span className="text-sm text-white font-medium block leading-tight">{att.name}</span>
                              <span className="text-[9px] text-primary/60 font-black uppercase">{att.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <a href={att.url} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </a>
                            <button
                              onClick={() => setProcessAttachments(processAttachments.filter(a => a.id !== att.id))}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {processAttachments.length === 0 && (
                        <div className="p-6 border-2 border-dashed border-white/5 rounded-2xl text-center text-slate-500">
                          <p className="text-xs">Nenhum documento específico anexado a esta prestação.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Documentos herdados do Lançamento */}
                  <section className="bg-white/5 p-6 rounded-2xl border border-white/5 border-dashed">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">history_edu</span>
                        Documentos Herdados do Lançamento
                      </h4>
                      <span className="text-[9px] bg-white/10 text-slate-400 px-2 py-1 rounded font-black uppercase">Somente Leitura</span>
                    </div>
                    <div className="space-y-2">
                      {selectedEntry?.attachments && selectedEntry.attachments.length > 0 ? (
                        selectedEntry.attachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate-500">payments</span>
                              <div>
                                <span className="text-sm text-slate-300 font-medium block leading-tight">{att.name}</span>
                                <span className="text-[10px] text-slate-600 font-black uppercase text-xs">{att.category || 'Lançamento'}</span>
                              </div>
                            </div>
                            <a href={att.url} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-600 italic">
                          <p className="text-xs">Nenhum documento financeiro anexado ao lançamento original.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {selectedEntry && (
                <div className="space-y-10">
                  <section>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h4 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-2 md:mb-0">
                        <span className="material-symbols-outlined">analytics</span>
                        2. Itens da Nota e Cotações Competidoras
                      </h4>
                      <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="bg-green-600/10 text-green-500 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-green-600/20 transition-all flex items-center gap-2 border border-green-600/20">
                          <span className="material-symbols-outlined text-sm">grid_on</span> IMPORTAR (EXCEL)
                        </button>
                        <button onClick={handleAddItem} className="bg-primary/10 text-primary px-5 py-2.5 rounded-xl font-black text-xs hover:bg-primary/20 transition-all flex items-center gap-2 border border-primary/20">
                          <span className="material-symbols-outlined text-sm">add_box</span> ADICIONAR ITEM À NOTA
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {items.map((item, idx) => (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6 shadow-sm group/item">
                          {/* Main Item Row */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative">
                            <div className="md:col-span-5">
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-tighter">Descrição do Item</label>
                              <input value={item.description} onChange={(e) => {
                                const it = [...items]; it[idx].description = e.target.value; setItems(it);
                                const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].description = e.target.value); setCompetitorQuotes(cq);
                              }} className="w-full bg-black/40 border-white/10 rounded-lg h-10 px-3 text-sm text-white focus:border-primary transition-all" placeholder="Ex: Monitor 24 Polegadas" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Qtd</label>
                              <input type="number" step="any" value={item.quantity} onChange={(e) => {
                                const it = [...items]; it[idx].quantity = Number(e.target.value); setItems(it);
                                const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].quantity = Number(e.target.value)); setCompetitorQuotes(cq);
                              }} className="w-full bg-black/40 border-white/10 rounded-lg h-10 px-3 text-sm text-white text-center" />
                            </div>
                            <div className="md:col-span-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Unid</label>
                              <input
                                list="standard-units"
                                value={item.unit}
                                onChange={(e) => {
                                  const it = [...items]; it[idx].unit = e.target.value; setItems(it);
                                  const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].unit = e.target.value); setCompetitorQuotes(cq);
                                }}
                                className="w-full bg-black/40 border-white/10 rounded-lg h-10 px-3 text-sm text-white text-center focus:border-primary outline-none transition-all"
                              />
                              <datalist id="standard-units">
                                {['Unid.', 'Cx.', 'Pac.', 'Kg', 'M', 'L', 'Pça', 'Serv.', 'Kit', 'Resma', 'Galão'].map(u => (
                                  <option key={u} value={u} />
                                ))}
                              </datalist>
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-black text-primary uppercase mb-2 block">Preço Unit. GANHADOR (R$)</label>
                              <input type="number" step="any" value={item.winner_unit_price} onChange={(e) => {
                                const it = [...items]; it[idx].winner_unit_price = Number(e.target.value); setItems(it);
                              }} className="w-full bg-primary/10 border-primary/20 rounded-lg h-10 px-3 text-sm text-primary font-black" />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className={`w-full md:w-10 h-10 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 transition-all hover:text-white ${items.length === 1 ? 'opacity-20 cursor-not-allowed' : 'opacity-100 group-hover/item:opacity-100'}`}
                                title="Remover este item"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Quotes Side-by-Side */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            {competitorQuotes.map((q, qIdx) => (
                              <div key={qIdx} className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">FORNECEDOR CONCORRENTE {qIdx + 1}</label>
                                  <button
                                    onClick={() => setShowSupplierModal({ open: true, quoteIdx: qIdx })}
                                    className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded hover:bg-amber-500/20 transition-all font-bold"
                                  >
                                    BUSCAR FORNECEDOR
                                  </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Razão Social / CNPJ Selecionado</span>
                                    <div className="h-10 px-3 bg-[#111a22] border border-white/5 rounded-lg flex items-center text-xs text-white font-bold italic">
                                      {q.supplier_name ? `${q.supplier_name}${q.supplier_cnpj ? ` (${q.supplier_cnpj})` : ''}` : 'Nenhum selecionado...'}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Preço Unitário para este item (R$)</span>
                                    <input
                                      type="number"
                                      step="any"
                                      className="w-full bg-[#111a22] border-white/10 rounded-lg h-10 px-3 text-sm text-amber-500 font-black"
                                      value={q.items[idx].unit_price}
                                      onChange={(e) => {
                                        const cq = [...competitorQuotes]; cq[qIdx].items[idx].unit_price = Number(e.target.value); setCompetitorQuotes(cq);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-surface-border bg-[#111a22] flex flex-col md:flex-row justify-end gap-4 sticky bottom-0 z-20">
              <button onClick={() => setShowNewProcessModal(false)} className="px-8 h-12 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all w-full md:w-auto">Cancelar</button>
              <button
                onClick={handleCreateProcess}
                disabled={loading || !selectedEntry}
                className="px-12 h-12 bg-primary text-white font-bold rounded-xl shadow-2xl shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 w-full md:w-auto"
              >
                {loading ? 'Processando Dados...' : 'Finalizar Lançamento Técnico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Selection Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111a22]">
              <div>
                <h3 className="text-lg font-bold text-white">Selecionar Lançamento Base</h3>
                <p className="text-xs text-slate-500">Mostrando apenas saídas que aguardam prestação.</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 flex flex-col gap-4 overflow-hidden">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500">search</span>
                <input
                  placeholder="Buscar por descrição, fornecedor ou valor..."
                  className="w-full bg-black/40 border-white/10 rounded-xl h-12 pl-10 pr-4 text-white text-sm"
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredEntries.length > 0 ? filteredEntries.map(e => (
                  <button
                    key={e.id}
                    onClick={() => handleSelectEntry(e)}
                    className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center hover:bg-primary/10 hover:border-primary/30 transition-all group"
                  >
                    <div className="text-left">
                      <span className="font-bold text-white group-hover:text-primary transition-all block">{e.description}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{e.suppliers?.name || 'Sem Fornecedor'} • {e.schools?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-white">{Number(e.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">{new Date(e.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-10 text-slate-500 text-sm italic">Nenhum lançamento pendente encontrado.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Selection Modal */}
      {showSupplierModal.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111a22]">
              <h3 className="text-lg font-bold text-white">Selecionar Fornecedor</h3>
              <button onClick={() => setShowSupplierModal({ open: false, quoteIdx: -1 })} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 flex flex-col gap-4 overflow-hidden">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500">search</span>
                <input
                  placeholder="Buscar por nome ou CNPJ..."
                  className="w-full bg-black/40 border-white/10 rounded-xl h-12 pl-10 pr-4 text-white text-sm"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredSuppliers.length > 0 ? filteredSuppliers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSupplier(s)}
                    className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-start hover:bg-primary/10 hover:border-primary/30 transition-all group"
                  >
                    <span className="font-bold text-white group-hover:text-primary transition-all">{s.name}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.cnpj || 'SEM CNPJ'}</span>
                  </button>
                )) : (
                  <div className="text-center py-10 text-slate-500 text-sm italic">Nenhum fornecedor encontrado.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/99 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111a22]">
              <div>
                <h3 className="text-lg font-bold text-white">Importar Itens do Excel</h3>
                <p className="text-xs text-slate-400">Copie as células do Excel e cole abaixo.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                <p className="text-xs text-yellow-500 font-bold uppercase mb-2">Formato Esperado (4 Colunas):</p>
                <div className="flex gap-2 text-[10px] text-white font-mono bg-black/40 p-2 rounded">
                  <span className="flex-1">DESCRIÇÃO</span>
                  <span className="w-px bg-white/20"></span>
                  <span className="w-20 text-center">QTD</span>
                  <span className="w-px bg-white/20"></span>
                  <span className="w-16 text-center">UNID</span>
                  <span className="w-px bg-white/20"></span>
                  <span className="w-24 text-right">VALOR UNIT.</span>
                </div>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-white focus:border-primary outline-none resize-none"
                placeholder={`Exemplo de conteúdo copiado:\n\nArroz Parboilizado Tipo 1\t50\tkg\t5,50\nFeijão Carioca\t30\tkg\t8,90\nÓleo de Soja\t20\tun\t6,75`}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-6 h-10 bg-white/5 text-white text-xs font-bold rounded-xl hover:bg-white/10">Cancelar</button>
                <button onClick={processImport} className="px-8 h-10 bg-green-600 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-green-500">Processar Importação</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
