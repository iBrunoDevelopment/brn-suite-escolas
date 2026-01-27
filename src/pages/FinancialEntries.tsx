
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { generateRelatorioGerencialHTML } from '../lib/reportUtils';
import { TransactionStatus, User, UserRole } from '../types';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';
import StatsCards from '../components/financial/StatsCards';
import FilterBar from '../components/financial/FilterBar';
import FinancialTable from '../components/financial/FinancialTable';
import { useFinancialEntries } from '../hooks/useFinancialEntries';
import ReprogrammedBalancesModal from '../components/financial/ReprogrammedBalancesModal';
import EntryFormModal from '../components/financial/EntryFormModal';

const FinancialEntries: React.FC<{ user: User }> = ({ user }) => {
    // Search and Filter States
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

    // Hook for data fetching and management
    const {
        entries,
        stats,
        auxData,
        loading,
        reprogrammedBalances,
        fetchReprogrammedBalances,
        refresh
    } = useFinancialEntries(user, { ...filters, quick: quickFilter });

    // UI States
    const [showForm, setShowForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showReprogrammedModal, setShowReprogrammedModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

    // Destructure auxData
    const { schools, programs, periods } = auxData;

    // Permissions and accessibility
    const entryPerm = usePermissions(user, 'entries');
    const accessibleSchools = useAccessibleSchools(user, schools);

    // Filter Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            refresh({ ...filters, quick: quickFilter });
        }, 300);
        return () => clearTimeout(timer);
    }, [filters, quickFilter, refresh]);

    // Handlers
    const handleEdit = (id: string, batchId?: string) => {
        setEditingId(id);
        setEditingBatchId(batchId || null);
        setShowForm(true);
    };

    const handleDelete = async (id: string, batchId?: string) => {
        if (!confirm('Excluir este lançamento?')) return;
        const { error } = batchId
            ? await supabase.from('financial_entries').delete().eq('batch_id', batchId)
            : await supabase.from('financial_entries').delete().eq('id', id);

        if (error) alert(`Erro: ${error.message}`);
        refresh({ ...filters, quick: quickFilter });
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Excluir ${selectedIds.length} lançamentos selecionados?`)) return;
        const { error } = await supabase.from('financial_entries').delete().in('id', selectedIds);
        if (error) alert(`Erro: ${error.message}`);
        setSelectedIds([]);
        refresh({ ...filters, quick: quickFilter });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const html = generateRelatorioGerencialHTML(entries, stats, filters);
            const win = window.open('', '_blank');
            win?.document.write(html);
            win?.document.close();
            win?.print();
        } finally {
            setIsExporting(false);
        }
    };

    const reconcileEntries = async (ids: string[]) => {
        if (!confirm(`Deseja conciliar ${ids.length} lançamentos selecionados?`)) return;
        const { error } = await supabase.from('financial_entries').update({ status: TransactionStatus.CONCILIADO }).in('id', ids);
        if (error) alert(`Erro: ${error.message}`);
        setSelectedIds([]);
        refresh({ ...filters, quick: quickFilter });
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-32">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <span className="material-symbols-outlined text-3xl">account_balance</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Movimentação Financeira</h1>
                        <p className="text-slate-500 font-medium">Gestão de entradas e saídas de recursos</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {entryPerm.canCreate && (
                        <button
                            onClick={() => { setEditingId(null); setEditingBatchId(null); setShowForm(true); }}
                            className="bg-primary hover:bg-primary-hover text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 flex-1 md:flex-none justify-center"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            Novo Lançamento
                        </button>
                    )}
                    <button
                        onClick={() => setShowReprogrammedModal(true)}
                        className="bg-surface-dark hover:bg-white/5 text-slate-400 hover:text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 border border-white/5 transition-all flex-1 md:flex-none justify-center"
                    >
                        <span className="material-symbols-outlined">restart_alt</span>
                        Saldos Reprogramados
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-12 h-12 md:w-auto md:px-4 bg-surface-dark hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-2xl flex items-center justify-center border border-white/5 transition-all group"
                        title="Exportar Relatório"
                    >
                        <span className="material-symbols-outlined">{isExporting ? 'sync' : 'picture_as_pdf'}</span>
                        <span className="hidden md:block ml-2 font-bold uppercase text-[10px]">PDF</span>
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <StatsCards stats={stats} />

            {/* Main Action Bar */}
            <div className="bg-surface-dark border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden">
                <div className="p-4 md:p-6 space-y-6">
                    <FilterBar
                        filters={filters}
                        setFilters={setFilters}
                        quickFilter={quickFilter}
                        setQuickFilter={setQuickFilter}
                        showFilters={showFilters}
                        setShowFilters={setShowFilters}
                        auxData={auxData}
                    />

                    <FinancialTable
                        entries={entries}
                        loading={loading}
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReconcile={(id) => reconcileEntries([id])}
                    />
                </div>
            </div>

            {/* Selection Toolbar (Floating) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0f172a] border border-primary/30 px-6 py-4 rounded-3xl shadow-2xl shadow-primary/20 flex items-center gap-8 z-40 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                            {selectedIds.length}
                        </div>
                        <span className="text-white font-bold text-sm tracking-tight">Selecionados</span>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <button onClick={() => reconcileEntries(selectedIds)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Conciliar</button>
                        <button onClick={handleBulkDelete} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-red-600/20">Excluir</button>
                        <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white text-xs font-bold px-2">Limpar</button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <EntryFormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                user={user}
                editingId={editingId}
                editingBatchId={editingBatchId}
                auxData={auxData}
                accessibleSchools={accessibleSchools}
                onSave={() => refresh({ ...filters, quick: quickFilter })}
            />

            <ReprogrammedBalancesModal
                isOpen={showReprogrammedModal}
                onClose={() => setShowReprogrammedModal(false)}
                reprogrammedBalances={reprogrammedBalances}
                fetchReprogrammedBalances={fetchReprogrammedBalances}
                accessibleSchools={accessibleSchools}
                programs={programs}
                periods={periods}
            />
        </div>
    );
};

export default FinancialEntries;
