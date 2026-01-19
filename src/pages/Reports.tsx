
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
  const ACCOUNTABILITY_DOC_CATEGORIES = ['Ata de Assembleia', 'Pesquisa de Preços', 'Certidão de Proponente', 'Nota Fiscal', 'Certidão de Regularidade', 'Ordem de Compra', 'Recibo / Quitação', 'Outros'];

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
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);



  const fetchAuxData = async () => {
    const { data: s } = await supabase.from('schools').select('id, name').order('name');
    const { data: p } = await supabase.from('programs').select('id, name').order('name');
    if (s) setSchools(s);
    if (p) setPrograms(p);

    // Fetch template asset
    const { data: t } = await supabase.from('system_settings').select('value').eq('key', 'import_template_url').maybeSingle();
    if (t?.value) setTemplateUrl(t.value);
  };

  const fetchProcesses = async () => {
    let query = supabase
      .from('accountability_processes')
      .select(`
        *, 
        financial_entries!inner(*, schools(*), programs(name), suppliers(*), payment_methods(name)),
        accountability_items(*),
        accountability_quotes(*)
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
    // If a custom template is defined in the system settings, download it directly
    if (templateUrl) {
      const link = document.createElement("a");
      link.href = templateUrl;
      link.setAttribute("download", templateUrl.split('/').pop() || "modelo_importacao.xlsx");
      link.setAttribute("target", "_blank");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Fallback to generated CSV
    const BOM = "\uFEFF";
    const headers = ["Descrição Detalhada", "Quantidade", "Unidade", "Preço Vencedor (R$)", "Preço Concorrente 1 (R$)", "Preço Concorrente 2 (R$)"];
    const example = ["Arroz Parboilizado Tipo 1", "50", "kg", "5,50", "5,90", "6,15"];

    // Use semicolon for better compatibility with Excel BR
    const csvContent = BOM + headers.join(';') + '\n' + example.join(';');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_itens.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportText(text);
        // Auto process if it looks valid
        setTimeout(() => processImport(text), 100);
      }
    };
    reader.readAsText(file);
  };

  const processImport = (overrideText?: string) => {
    const textToProcess = overrideText || importText;
    if (!textToProcess.trim()) return;

    const lines = textToProcess.trim().split(/\r?\n/);
    const parsedRows: any[] = [];

    const parseNumber = (str: string) => {
      if (!str) return 0;
      let clean = str.replace(/[R$\s]/g, '');
      if (clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      }
      return parseFloat(clean) || 0;
    };

    // Detect delimiter
    const firstLine = lines[0] || '';
    let delimiter = '\t';
    if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    // If the first line is exactly the header, skip it
    let startIndex = 0;
    if (firstLine.toLowerCase().includes('descrição') || firstLine.toLowerCase().includes('quantidade')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cols = line.split(delimiter);
      if (cols.length < 2) continue;

      let desc = cols[0]?.trim() || '';
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
    }

    if (parsedRows.length === 0) {
      alert('Não foi possível identificar itens válidos. Verifique o formato das colunas (Descrição, Qtd, Unidade, Preço Ganhador...).');
      return;
    }

    const newItems = parsedRows.map(r => r.item);

    // Filter out rows that are completely empty
    const validNewItems = newItems.filter(it => it.description || it.winner_unit_price > 0);

    if (validNewItems.length > 0) {
      // Logic: If current items is just the initial empty one, replace. Otherwise, prepend/append.
      // The user usually wants to REPLACE if they are doing a mass import.
      // But we will ask or just replace if it's the first empty item.
      let currentItems = [...items];
      if (currentItems.length === 1 && !currentItems[0].description && currentItems[0].winner_unit_price === 0) {
        currentItems = [];
      }

      const mergedItems = [...currentItems, ...validNewItems];
      setItems(mergedItems);

      // Update competitor quotes to match the new item list
      setCompetitorQuotes(competitorQuotes.map((q, qIdx) => ({
        ...q,
        items: mergedItems.map((mi, idx) => {
          // If it's an existing item (before import), preserve its quote price
          if (idx < currentItems.length) return q.items[idx];

          // For new items, find corresponding imported data
          const importedIdx = idx - currentItems.length;
          const importedRow = parsedRows[importedIdx];

          return {
            description: mi.description,
            quantity: mi.quantity,
            unit: mi.unit,
            unit_price: qIdx === 0 ? importedRow.comp1Price : importedRow.comp2Price
          };
        })
      })));

      alert(`${validNewItems.length} itens inseridos com sucesso!`);
      setShowImportModal(false);
      setImportText('');
    } else {
      alert('Nenhum item válido encontrado para importação.');
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
    const competitors = ((process as any).accountability_quotes || process.quotes || [])
      .filter((q: any) => !q.is_winner)
      .map((q: any) => {
        const rawItems = (q as any).accountability_quote_items || q.items || [];
        // Align items with the master list (docItems) to ensure index consistency
        const alignedItems = docItems.map((docItem: any) => {
          const match = rawItems.find((ri: any) => ri.description === docItem.description);
          if (match) {
            return {
              ...match,
              // Force sync quantity/unit from master item just in case
              quantity: docItem.quantity,
              unit: docItem.unit
            };
          }
          // Fallback if item missing in quote
          return {
            description: docItem.description,
            quantity: docItem.quantity,
            unit: docItem.unit,
            unit_price: 0
          };
        });

        return {
          supplier_id: q.supplier_id || '',
          supplier_name: q.supplier_name,
          supplier_cnpj: q.supplier_cnpj || '',
          items: alignedItems
        };
      });

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

    const subtotal = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.winner_unit_price || 0)), 0);
    const totalAfterDiscount = subtotal - discount;
    const targetValue = Math.abs(selectedEntry.value);

    if (Math.abs(totalAfterDiscount - targetValue) > 0.01) {
      alert(`⚠️ Bloqueio de Segurança: O valor líquido calculado (${totalAfterDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) não corresponde ao valor exato da nota fiscal vinculada (${targetValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).\n\nPor favor, verifique os preços unitários ou o valor do desconto antes de finalizar.`);
      return;
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

      // REMOVER ID antes de inserir para deixar o Supabase gerar novos (já que deletamos os antigos no edit)
      const cleanItems = items.map(it => {
        const { id, ...rest } = it as any;
        return { ...rest, process_id: processId };
      });

      const { error: iError } = await supabase.from('accountability_items').insert(cleanItems);
      if (iError) throw iError;

      const { data: winnerQuote, error: wqError } = await supabase
        .from('accountability_quotes')
        .insert({
          process_id: processId,
          supplier_id: selectedEntry.supplier_id,
          supplier_name: selectedEntry.suppliers?.name || 'Fornecedor Ganhador',
          supplier_cnpj: selectedEntry.suppliers?.cnpj || null,
          is_winner: true,
          total_value: subtotal
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

        const qItems = comp.items.map(it => {
          const { id, ...rest } = it as any;
          return {
            quote_id: q.id,
            description: rest.description,
            quantity: rest.quantity,
            unit: rest.unit,
            unit_price: rest.unit_price
          };
        });
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 bg-white/[0.02] p-4 md:p-6 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-2xl border border-white/5">
          <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest leading-none">Lançamento</span>
          <span className="text-[13px] font-bold text-white whitespace-nowrap">{target.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-2xl border border-white/5">
          <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest leading-none">Soma Itens</span>
          <span className="text-[13px] font-bold text-white whitespace-nowrap">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 bg-amber-500/5 rounded-2xl border border-amber-500/10">
          <span className="text-[8px] uppercase font-black text-amber-500/70 tracking-widest leading-none">Desconto</span>
          <span className="text-[13px] font-bold text-amber-500 whitespace-nowrap">
            {discount > 0 ? `– ${discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'R$ 0,00'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 bg-primary/5 rounded-2xl border border-primary/10">
          <span className="text-[8px] uppercase font-black text-primary/70 tracking-widest leading-none">Líquido</span>
          <span className={`text-[13px] font-bold whitespace-nowrap ${isOk ? 'text-green-400' : 'text-primary'}`}>{totalAfterDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className={`flex flex-col gap-1.5 p-3 rounded-2xl border col-span-2 md:col-span-1 transition-all ${isOk ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
          <span className={`text-[8px] uppercase font-black tracking-widest leading-none ${isOk ? 'text-green-500' : 'text-red-400'}`}>Pendente</span>
          <div className="flex items-center justify-between">
            <span className={`text-[13px] font-black whitespace-nowrap ${isOk ? 'text-green-400' : 'text-red-400'}`}>
              {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            {isOk && <span className="material-symbols-outlined text-green-500 text-sm">verified</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
          <div className="bg-[#111a22] border border-surface-border rounded-2xl p-4 md:p-6 grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 items-end">
            <div className="col-span-2 lg:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Escola</label>
              <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="w-full bg-[#0a0f14] text-white text-xs h-10 px-3 rounded-xl border border-surface-border focus:border-primary outline-none transition-all">
                <option value="">Todas as Escolas</option>
                {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Programa</label>
              <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="w-full bg-[#0a0f14] text-white text-xs h-10 px-3 rounded-xl border border-surface-border focus:border-primary outline-none transition-all">
                <option value="">Todos</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-[#0a0f14] text-white text-xs h-10 px-3 rounded-xl border border-surface-border focus:border-primary outline-none transition-all">
                <option value="">Todos</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Busca Rápida</label>
              <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="w-full bg-[#0a0f14] text-white text-xs h-10 px-4 rounded-xl border border-surface-border focus:border-primary outline-none transition-all" placeholder="Filtrar por descrição..." />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <button
                onClick={() => { setFilterSchool(''); setFilterProgram(''); setFilterStatus(''); setFilterSearch(''); }}
                className="w-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-xl hover:bg-slate-700 transition-all active:scale-95"
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
                <div key={process.id} className="bg-surface-dark border border-surface-border rounded-2xl p-4 md:p-6 hover:border-primary/40 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${process.status === 'Concluído' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
                      <span className="material-symbols-outlined text-3xl font-light">
                        {process.status === 'Concluído' ? 'check_circle' : 'pending'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate">{entry?.description}</h3>
                        <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/10 font-black uppercase whitespace-nowrap">{entry?.nature}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                        <span className="text-[10px] uppercase font-black text-slate-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-primary">school</span> <span className="max-w-[150px] truncate">{schoolName}</span>
                        </span>
                        <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">person</span> <span className="max-w-[120px] truncate">{entry?.suppliers?.name || 'Sem Fornecedor'}</span>
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
                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-left md:text-right">
                      <p className="text-base md:text-sm font-black text-white">{Number(entry?.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{process.status}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const { data: quotes } = await supabase.from('accountability_quotes').select('*, accountability_quote_items(*), suppliers(*)').eq('process_id', process.id);
                        setCurrentProcess({ ...process, quotes, financial_entry: entry });
                        setActiveTab('details');
                      }}
                      className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:text-primary text-white rounded-xl transition-all"
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
            <div className="p-6 md:p-8 bg-[#111a22] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-surface-border">
              <div className="flex-1 w-full">
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight break-words">{currentProcess?.financial_entry?.description}</h2>
                <p className="text-slate-400 font-medium text-sm mt-1">Processo de Prestação de Contas • {currentProcess?.financial_entry?.schools?.name}</p>
              </div>
              <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
                {(reportPerm.canEdit && user.role !== UserRole.DIRETOR) && (
                  <button
                    onClick={() => handleEdit(currentProcess)}
                    className="flex-1 md:flex-none h-11 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span> Editar
                  </button>
                )}
                {reportPerm.canDelete && (
                  <button
                    onClick={() => currentProcess && handleDeleteProcess(currentProcess.id)}
                    className="flex-1 md:flex-none h-11 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span> Excluir
                  </button>
                )}
                <button
                  onClick={() => printDocument(generateConsolidacaoHTML(currentProcess))}
                  className="w-full md:w-auto h-11 px-5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs border border-white/10"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span> Imprimir Pack
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

      {showNewProcessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-xl md:p-6 overflow-hidden">
          <div className="bg-[#0a0f14] border-x border-white/5 w-full max-w-6xl h-screen md:h-auto md:max-h-[92vh] md:rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden">
            <div className="sticky top-0 z-30 p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-[#0a0f14]/80 backdrop-blur-md">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">assignment</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[12px] md:text-lg font-black text-white leading-tight tracking-[0.1em]">
                    {editingProcessId ? 'EDITAR PRESTAÇÃO' : 'NOVA PRESTAÇÃO'}
                  </h2>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-0.5">
                    {editingProcessId ? 'Refinamento de dados' : 'Detalhamento técnico'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <button
                  onClick={() => setShowNewProcessModal(false)}
                  className="h-10 px-4 bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10 hidden md:block"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateProcess}
                  disabled={loading || !selectedEntry}
                  className="h-10 px-6 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  )}
                  <span>{loading ? 'SALVANDO...' : 'FINALIZAR'}</span>
                </button>
                <div className="w-px h-8 bg-white/10 mx-1 md:mx-2"></div>
                <button onClick={() => setShowNewProcessModal(false)} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/10 group">
                  <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform duration-500">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-12 custom-scrollbar bg-[#0a0f14]">
              {/* Dashboard de Valores (ValueCounter) */}
              <div className="pb-6">
                <ValueCounter />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <section className="bg-white/[0.02] p-8 rounded-[36px] border border-white/5 shadow-2xl flex flex-col gap-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-primary/10 transition-all duration-1000"></div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-primary tracking-[0.25em] mb-4 block opacity-60">1. Lançamento Base (Pagamento)</label>
                      <div
                        onClick={() => setShowEntryModal(true)}
                        className="bg-black/40 border border-white/10 rounded-2xl h-14 px-5 flex items-center justify-between cursor-pointer hover:border-primary/40 hover:bg-black/60 transition-all group/btn"
                      >
                        <div className="flex items-center gap-4 truncate">
                          <span className="material-symbols-outlined text-primary/40 text-[22px] group-hover/btn:text-primary transition-colors">receipt</span>
                          <span className={`text-[12px] truncate uppercase tracking-tight ${selectedEntry ? 'text-white font-black' : 'text-slate-600 italic font-bold'}`}>
                            {selectedEntry ? `${selectedEntry.description}` : 'Selecionar Lançamento...'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-primary/30 group-hover/btn:text-primary text-[20px] group-hover/btn:translate-x-1 transition-all">arrow_forward_ios</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.25em] mb-4 block opacity-60">Status</label>
                      <div className="relative">
                        <select
                          value={processStatus}
                          onChange={(e) => setProcessStatus(e.target.value as any)}
                          className="w-full bg-black/40 bg-none border border-white/10 rounded-2xl h-14 px-5 text-white text-[11px] font-black focus:border-primary/50 outline-none transition-all cursor-pointer hover:bg-black/60 appearance-none"
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[20px]">expand_more</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="md:col-span-2">
                      {selectedEntry && (
                        <div className="h-14 px-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4 group/winner">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 group-hover/winner:scale-110 transition-all duration-700">
                            <span className="material-symbols-outlined text-[18px] font-black">verified</span>
                          </div>
                          <div className="truncate">
                            <span className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] block leading-none mb-1.5">Fornecedor Vencedor</span>
                            <span className="text-[12px] font-black text-white uppercase tracking-tight truncate block">{selectedEntry.suppliers?.name || 'NÃO INFORMADO'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-amber-500/70 tracking-[0.25em] mb-4 block whitespace-nowrap">Dsc. em Nota (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/40 font-black text-[10px]">R$</span>
                        <input
                          type="number"
                          step="any"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-full bg-black/40 border border-amber-500/20 rounded-2xl h-14 pl-10 pr-5 text-amber-500 text-[13px] font-black focus:border-amber-500/60 focus:bg-amber-500/5 outline-none transition-all placeholder:text-amber-500/20"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white/[0.02] p-8 rounded-[36px] border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 blur-[80px] rounded-full -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-all duration-1000"></div>
                  <label className="text-[10px] font-black uppercase text-primary tracking-[0.25em] mb-6 block opacity-60">3. Checklist de Conformidade</label>
                  <div className="grid grid-cols-1 gap-3">
                    {checklist.map((item, idx) => (
                      <label key={item.id} className="flex items-center gap-5 p-4.5 bg-black/30 rounded-[24px] border border-white/5 cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all group/check relative overflow-hidden">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${item.checked ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-110' : 'border-white/10 group-hover/check:border-primary/40'}`}>
                          {item.checked && <span className="material-symbols-outlined text-[18px] font-black">check_circle</span>}
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
                        <div className="flex-1 flex justify-between items-center pr-2">
                          <span className={`text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${item.checked ? 'text-white' : 'text-slate-600 group-hover/check:text-slate-300'}`}>{item.label}</span>
                          {(() => {
                            const allAtts = [...processAttachments, ...(selectedEntry?.attachments || [])];
                            const hasDoc = (cat: string) => allAtts.some(a => a.category?.toLowerCase().includes(cat.toLowerCase()));
                            let detected = false;
                            if (item.id === 'quotations' && (hasDoc('Pesquisa') || hasDoc('Orçamento'))) detected = true;
                            if (item.id === 'invoice' && (hasDoc('Nota') || hasDoc('Fiscal'))) detected = true;
                            if (item.id === 'certificates' && hasDoc('Certidão')) detected = true;
                            if (item.id === 'minutes' && (hasDoc('Ata') || hasDoc('Assembleia'))) detected = true;
                            if (detected) return (
                              <div className="flex items-center h-7 px-4 rounded-full bg-green-500/10 border border-green-500/20 gap-2 shadow-inner">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                <span className="text-[8px] font-black text-green-500 uppercase tracking-[0.2em]">Verificado</span>
                              </div>
                            );
                            return null;
                          })()}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </div>


              {selectedEntry && (
                <div className="space-y-16 pb-10">
                  {/* 2. Itens e Comparativos */}
                  <section className="space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/5">
                          <span className="material-symbols-outlined text-[28px]">query_stats</span>
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-[14px] font-black uppercase text-white tracking-[0.2em]">2. Itens e Cotações Competidoras</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Gerencie os itens da nota e o quadro comparativo</p>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={() => setShowImportModal(true)} className="flex-1 md:flex-none bg-emerald-500/10 text-emerald-500 px-8 h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-3 border border-emerald-500/20 group">
                          <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">database</span> Planilha (Excel)
                        </button>
                        <button onClick={handleAddItem} className="flex-1 md:flex-none bg-primary/10 text-primary px-8 h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-primary/20 transition-all flex items-center justify-center gap-3 border border-primary/20 group">
                          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">add_circle</span> Adicionar Item
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {items.map((item, idx) => (
                        <div key={idx} className="bg-white/[0.01] border border-white/5 p-10 rounded-[44px] space-y-10 shadow-2xl relative group/item overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/0 group-hover/item:bg-primary/30 transition-all duration-700"></div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end relative z-10">
                            <div className="md:col-span-5">
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-4 block tracking-widest opacity-60">Descrição Detalhada</label>
                              <input value={item.description} onChange={(e) => {
                                const it = [...items]; it[idx].description = e.target.value; setItems(it);
                                const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].description = e.target.value); setCompetitorQuotes(cq);
                              }} className="w-full bg-black/40 border border-white/10 rounded-2xl h-12 px-5 text-[12px] text-white focus:border-primary/50 transition-all" placeholder="Ex: Monitor 24 Polegadas" />
                            </div>
                            <div className="md:col-span-3 grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-4 block tracking-widest opacity-60 text-center">Qtd</label>
                                <input type="number" step="any" value={item.quantity} onChange={(e) => {
                                  const it = [...items]; it[idx].quantity = Number(e.target.value); setItems(it);
                                  const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].quantity = Number(e.target.value)); setCompetitorQuotes(cq);
                                }} className="w-full bg-black/40 border border-white/10 rounded-2xl h-12 px-3 text-[12px] text-white text-center font-bold" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-4 block tracking-widest opacity-60 text-center">Unid</label>
                                <input
                                  list="standard-units"
                                  value={item.unit}
                                  onChange={(e) => {
                                    const it = [...items]; it[idx].unit = e.target.value; setItems(it);
                                    const cq = [...competitorQuotes]; cq.forEach(q => q.items[idx].unit = e.target.value); setCompetitorQuotes(cq);
                                  }}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl h-12 px-3 text-[12px] text-white text-center focus:border-primary/50 outline-none transition-all uppercase font-bold"
                                />
                                <datalist id="standard-units">
                                  {['Unid.', 'Cx.', 'Pac.', 'Kg', 'M', 'L', 'Pça', 'Serv.', 'Kit', 'Resma', 'Galão'].map(u => (
                                    <option key={u} value={u} />
                                  ))}
                                </datalist>
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-black text-primary uppercase mb-4 block tracking-[0.15em]">Preço Unit. Vencedor</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-[10px] opacity-40">R$</span>
                                <input type="number" step="any" value={item.winner_unit_price} onChange={(e) => {
                                  const it = [...items]; it[idx].winner_unit_price = Number(e.target.value); setItems(it);
                                }} className="w-full bg-primary/10 border border-primary/20 rounded-2xl h-12 pl-10 pr-5 text-[14px] text-primary font-black focus:border-primary transition-all" />
                              </div>
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 transition-all hover:text-white ${items.length === 1 ? 'opacity-20 cursor-not-allowed' : 'opacity-100'}`}
                              >
                                <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                              </button>
                            </div>
                          </div>

                          {/* Quadro Comparativo Interno */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/5 relative z-10">
                            {competitorQuotes.map((q, qIdx) => (
                              <div key={qIdx} className="bg-black/30 p-8 rounded-[32px] border border-white/5 space-y-6 relative group/quote hover:border-amber-500/20 transition-all">
                                <div className="absolute -top-4 left-8 px-4 py-1 bg-amber-500 text-amber-950 rounded-full shadow-lg shadow-amber-500/20">
                                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">Concorrente {qIdx + 1}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 min-h-[64px] cursor-pointer hover:border-amber-500/40 hover:bg-black/60 transition-all group/s" onClick={() => setShowSupplierModal({ open: true, quoteIdx: qIdx })}>
                                  <div className="truncate flex-1 pr-6 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/s:bg-amber-500 group-hover/s:text-amber-950 transition-all">
                                      <span className="material-symbols-outlined text-[20px]">storefront</span>
                                    </div>
                                    <div className="truncate">
                                      <span className={`text-[12px] uppercase tracking-tight font-black block truncate ${q.supplier_name ? 'text-white' : 'text-slate-600 italic'}`}>
                                        {q.supplier_name || 'Vincular Empresa...'}
                                      </span>
                                      {q.supplier_cnpj && <span className="text-[9px] text-slate-500 font-bold block mt-0.5 tracking-widest">{q.supplier_cnpj}</span>}
                                    </div>
                                  </div>
                                  <span className="material-symbols-outlined text-amber-500 group-hover/s:translate-x-1 transition-transform">search</span>
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-600 uppercase mb-3 block tracking-widest opacity-60">Preço Unitário (R$)</label>
                                  <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500/30 font-black text-[12px]">R$</span>
                                    <input
                                      type="number"
                                      step="any"
                                      className="w-full bg-black/40 border border-white/10 rounded-2xl h-14 pl-12 pr-6 text-[16px] text-amber-500 font-black focus:border-amber-500/50 outline-none transition-all"
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

                  {/* 4. Documentação Técnica */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <section className="bg-white/[0.02] p-10 rounded-[44px] border border-white/5 shadow-2xl space-y-10 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0"></div>
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                          <span className="material-symbols-outlined text-[28px]">folder_zip</span>
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-[14px] font-black uppercase text-white tracking-[0.2em]">4. Anexos Técnicos</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Clique para subir novos arquivos</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {ACCOUNTABILITY_DOC_CATEGORIES.map(cat => (
                          <label key={cat} className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/5 rounded-3xl text-[9px] font-black text-slate-500 uppercase tracking-tight text-center cursor-pointer hover:bg-primary hover:text-white transition-all gap-2 h-24 group/up shadow-lg hover:shadow-primary/20">
                            <span className="material-symbols-outlined text-[22px] opacity-40 group-hover/up:opacity-100 group-hover/up:scale-125 transition-all duration-500">upload</span>
                            {cat}
                            <input
                              type="file"
                              className="hidden"
                              disabled={isUploadingDoc}
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

                      <div className="space-y-4 pt-4">
                        {processAttachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between p-5 bg-primary/5 rounded-3xl border border-primary/10 group/itematt transition-all hover:bg-primary/10 hover:border-primary/30">
                            <div className="flex items-center gap-5 truncate">
                              <div className="w-12 h-12 rounded-[18px] bg-primary/10 flex items-center justify-center text-primary group-hover/itematt:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[22px]">attachment</span>
                              </div>
                              <div className="truncate">
                                <span className="text-[12px] text-white font-black block leading-tight truncate mb-1">{att.name}</span>
                                <span className="text-[9px] text-primary font-black uppercase tracking-[0.2em] opacity-60">{att.category}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <a href={att.url} target="_blank" className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-primary text-slate-500 hover:text-white rounded-xl transition-all shadow-xl">
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                              </a>
                              <button onClick={() => setProcessAttachments(processAttachments.filter(a => a.id !== att.id))} className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-red-500 text-slate-500 hover:text-white rounded-xl transition-all shadow-xl">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Documentos Financeiros */}
                    <section className="bg-white/[0.02] p-10 rounded-[44px] border border-white/5 border-dashed shadow-2xl space-y-10 relative group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-[20px] bg-slate-500/10 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-[28px]">history_edu</span>
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-[14px] font-black uppercase text-slate-400 tracking-[0.2em]">Anexos Financeiros</h4>
                            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mt-1">Importados automaticamente</p>
                          </div>
                        </div>
                        <span className="text-[8px] bg-white/5 text-slate-600 border border-white/10 px-4 py-2 rounded-full font-black uppercase tracking-[0.2em]">Read Only</span>
                      </div>

                      <div className="space-y-4">
                        {selectedEntry?.attachments && selectedEntry.attachments.length > 0 ? (
                          selectedEntry.attachments.map(att => (
                            <div key={att.id} className="flex items-center justify-between p-5 bg-black/40 rounded-3xl border border-white/5 group/att relative overflow-hidden transition-all hover:border-white/10">
                              <div className="absolute inset-y-0 left-0 w-1.5 bg-slate-500/20 group-hover/att:w-full transition-all duration-1000 -z-10 group-hover/att:bg-slate-300/[0.02]"></div>
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-[18px] bg-white/5 flex items-center justify-center text-slate-600">
                                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                </div>
                                <div>
                                  <span className="text-[12px] text-white font-black block leading-tight mb-1">{att.name}</span>
                                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">{att.category || 'FINANCEIRO'}</span>
                                </div>
                              </div>
                              <a href={att.url} target="_blank" className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/20 rounded-[18px] text-slate-500 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="p-20 border-2 border-dashed border-white/[0.02] rounded-[44px] text-center flex flex-col items-center gap-4 opacity-20">
                            <span className="material-symbols-outlined text-[48px]">folder_off</span>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">Sem anexos no lançamento</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Entry Selection Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-2 md:p-4 bg-black/99 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0a0f14] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0f14]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex flex-col">
                <h3 className="text-base md:text-xl font-black text-white leading-tight">Importação em Massa (Excel)</h3>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase tracking-widest">Preenchimento rápido de itens e cotações</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="p-4 md:p-8 space-y-6 overflow-y-auto min-h-0">
              <div className="flex flex-col md:flex-row justify-between items-stretch bg-primary/5 border border-primary/20 p-5 rounded-2xl gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-primary font-black uppercase mb-1 tracking-widest">Opção A: Arquivo CSV</p>
                  <p className="text-[9px] text-slate-500 mb-3">Baixe o modelo ou envie seu arquivo.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadTemplate}
                      className="h-9 px-4 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold flex items-center gap-2 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Baixar Modelo
                    </button>
                    <label className="h-9 px-4 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      Subir CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
                    </label>
                  </div>
                </div>
                <div className="w-px bg-white/10 hidden md:block"></div>
                <div className="flex-1">
                  <p className="text-[10px] text-primary font-black uppercase mb-3 tracking-widest">Estrutura das Colunas (Excel):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Descrição Detalhada', sub: 'Texto (ex: Arroz tipo 1)', color: 'slate' },
                      { label: 'Quantidade', sub: 'Numérico (ex: 100)', color: 'slate' },
                      { label: 'Unidade', sub: 'Texto (ex: KG, Unid)', color: 'slate' },
                      { label: 'Preço Vencedor', sub: 'Valor Unitário (R$)', color: 'emerald' },
                      { label: 'Concorrente 1', sub: 'Valor Unitário (R$)', color: 'amber' },
                      { label: 'Concorrente 2', sub: 'Valor Unitário (R$)', color: 'amber' },
                    ].map((col, idx) => (
                      <div key={idx} className="bg-black/20 border border-white/5 p-2 rounded-xl flex items-center gap-2 group hover:border-white/10 transition-all shadow-lg shadow-black/20">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black shadow-lg
                          ${col.color === 'emerald' ? 'bg-emerald-500 text-emerald-950 shadow-emerald-500/20' :
                            col.color === 'amber' ? 'bg-amber-500 text-amber-950 shadow-amber-500/20' :
                              'bg-white/10 text-white shadow-black/40'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[8px] font-black uppercase tracking-wider ${col.color === 'emerald' ? 'text-emerald-400' : col.color === 'amber' ? 'text-amber-400' : 'text-slate-300'}`}>{col.label}</span>
                          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tight">{col.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 italic">Dica: Selecione 6 colunas no Excel e cole aqui.</p>
                </div>
              </div>

              <div className="relative">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">Opção B: Copiar e Colar</p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-56 bg-black/40 border border-white/10 rounded-2xl p-5 text-xs font-mono text-white focus:border-primary outline-none resize-none transition-all placeholder:text-slate-700"
                  placeholder={`Arroz Parboilizado\t50\tkg\t5,50\t5,90\t6,10\nFeijão Carioca\t30\tkg\t8,90\t9,20\t9,00`}
                />
                {!importText && (
                  <div className="absolute inset-x-0 bottom-10 flex items-center justify-center pointer-events-none opacity-20 flex-col gap-2">
                    <span className="material-symbols-outlined text-4xl">content_paste</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Cole seus dados do Excel aqui</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0a0f14] pt-4 border-t border-white/5 sticky bottom-0 z-10">
                <button
                  onClick={() => { setItems([{ description: '', quantity: 1, unit: 'Unid.', winner_unit_price: 0 }]); setCompetitorQuotes(competitorQuotes.map(q => ({ ...q, items: [{ description: '', quantity: 1, unit: 'Unid.', unit_price: 0 }] }))); alert('Itens limpos. Agora você pode importar do zero.'); }}
                  className="w-full md:w-auto px-6 h-11 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                >
                  Limpar Itens Atuais
                </button>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setShowImportModal(false)} className="flex-1 md:flex-none px-6 h-11 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5">Cancelar</button>
                  <button
                    onClick={() => processImport()}
                    disabled={!importText.trim()}
                    className="flex-2 md:flex-none px-10 h-11 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirmar e Inserir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
