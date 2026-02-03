
import React, { useState } from 'react';
import { User, AccountabilityProcess, UserRole } from '../types';
import { printDocument } from '../lib/printUtils';
import { generateAtaHTML, generateConsolidacaoHTML, generateOrdemHTML, generateReciboHTML, generateCotacaoHTML } from '../lib/documentTemplates';
import { supabase } from '../lib/supabaseClient';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';
import { useReports } from '../hooks/useReports';
import { useToast } from '../context/ToastContext';

// Subcomponents
import ReportsTable from '../components/reports/ReportsTable';
import AccountabilityProcessModal from '../components/reports/AccountabilityProcessModal';

const Reports: React.FC<{ user: User }> = ({ user }) => {
  // UI State
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Filters
  const [filters, setFilters] = useState({
    schoolId: '',
    programId: '',
    status: '',
    search: ''
  });

  // Data Hook
  const {
    loading,
    processes,
    availableEntries,
    suppliers,
    schools,
    programs,
    templateUrl,
    refresh
  } = useReports(user, filters);

  // Permissions
  const reportPerm = usePermissions(user, 'reports');
  const accessibleSchools = useAccessibleSchools(user, schools);

  const handlePrint = (process: AccountabilityProcess, type: string) => {
    let html = '';
    const entry = (process as any).financial_entry || (process as any).financial_entries;

    switch (type) {
      case 'ata':
        html = generateAtaHTML(process);
        break;
      case 'ordem':
        html = generateOrdemHTML(process);
        break;
      case 'consolidacao':
        html = generateConsolidacaoHTML(process);
        break;
      case 'recibo':
        html = generateReciboHTML(process);
        break;
      case 'cotacao1':
        html = generateCotacaoHTML(process, 0);
        break;
      case 'cotacao2':
        html = generateCotacaoHTML(process, 1);
        break;
      case 'cotacao3':
        html = generateCotacaoHTML(process, 2);
        break;
      default:
        return;
    }
    printDocument(html);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta prestação de contas?')) return;

    const { supabase } = await import('../lib/supabaseClient');
    const { error } = await supabase.from('accountability_processes').delete().eq('id', id);

    if (error) {
      addToast('Erro ao excluir: ' + error.message, 'error');
    } else {
      addToast('Excluído com sucesso.', 'success');
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-32">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-white">Prestação de Contas</h1>
          <p className="text-slate-400 text-sm">Controle de cotações, itens de nota e finalização documental.</p>
        </div>
        <div className="flex items-center gap-3">
          {reportPerm.canCreate && user.role !== UserRole.DIRETOR && (
            <button
              onClick={() => { setEditingProcessId(null); setShowNewProcessModal(true); }}
              className="h-12 px-6 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add_circle</span> Novo Processo
            </button>
          )}
        </div>
      </div>

      {/* Warning Area */}
      {availableEntries.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <span className="text-sm font-bold text-red-200">
              Atenção: Existem {availableEntries.length} lançamentos aguardando prestação de contas.
            </span>
          </div>
          <button onClick={() => { setEditingProcessId(null); setShowNewProcessModal(true); }} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600 transition-colors">
            Resolver Agora
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#111a22] border border-surface-border rounded-2xl p-4 md:p-6 grid grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="filter_school" className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Escola</label>
          <select
            id="filter_school"
            value={filters.schoolId}
            onChange={e => setFilters({ ...filters, schoolId: e.target.value })}
            className="w-full bg-[#0a0f14] text-white text-xs h-10 px-3 rounded-xl border border-surface-border focus:border-primary outline-none transition-all"
          >
            <option value="">Todas as Escolas</option>
            {accessibleSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <label htmlFor="filter_program" className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Programa</label>
          <select
            id="filter_program"
            value={filters.programId}
            onChange={e => setFilters({ ...filters, programId: e.target.value })}
            className="w-full bg-[#0a0f14] text-white text-xs h-10 px-3 rounded-xl border border-surface-border focus:border-primary outline-none transition-all"
          >
            <option value="">Todos</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <label htmlFor="filter_status" className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Status</label>
          <select
            id="filter_status"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="w-full bg-[#0a0f14] text-white text-xs h-10 px-3 rounded-xl border border-surface-border focus:border-primary outline-none transition-all"
          >
            <option value="">Todos</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="filter_search" className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Busca Rápida</label>
          <input
            id="filter_search"
            type="text"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            className="w-full bg-[#0a0f14] text-white text-xs h-10 px-4 rounded-xl border border-surface-border focus:border-primary outline-none transition-all"
            placeholder="Filtrar por descrição..."
          />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <button
            onClick={() => setFilters({ schoolId: '', programId: '', status: '', search: '' })}
            className="w-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-xl hover:bg-slate-700 transition-all active:scale-95"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* List Section */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-dark border border-surface-border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <ReportsTable
          processes={processes}
          onEdit={(p) => { setEditingProcessId(p.id); setShowNewProcessModal(true); }}
          onDelete={handleDelete}
          onPrint={handlePrint}
        />
      )}

      {/* Modals */}
      <AccountabilityProcessModal
        isOpen={showNewProcessModal}
        onClose={() => setShowNewProcessModal(false)}
        user={user}
        editingId={editingProcessId}
        onSave={refresh}
        auxData={{
          schools,
          programs,
          suppliers,
          templateUrl,
          availableEntries
        }}
      />
    </div>
  );
};

export default Reports;
