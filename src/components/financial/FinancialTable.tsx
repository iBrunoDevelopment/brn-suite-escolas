
import React from 'react';
import { TransactionStatus, User } from '../../types';
import { FinancialEntryExtended } from '../../hooks/useFinancialEntries';
import Skeleton from '../common/Skeleton';

interface FinancialTableProps {
    entries: FinancialEntryExtended[];
    loading: boolean;
    selectedIds: string[];
    canEdit: boolean;
    isAdmin: boolean;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onEdit: (entry: FinancialEntryExtended) => void;
    onDelete: (entry: FinancialEntryExtended) => void;
    onConciliate: (id: string, currentStatus: string) => void;
}

const FinancialTable: React.FC<FinancialTableProps> = ({
    entries,
    loading,
    selectedIds,
    canEdit,
    isAdmin,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onDelete,
    onConciliate
}) => {

    if (loading) {
        return (
            <div className="bg-surface-dark border border-surface-border rounded-2xl overflow-hidden min-h-[400px]">
                <div className="animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex border-b border-surface-border p-4 gap-4 items-center">
                            <Skeleton variant="rect" width={20} height={20} className="rounded" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="text" width="60%" />
                                <Skeleton variant="text" width="40%" />
                            </div>
                            <Skeleton variant="rect" width={80} height={24} className="rounded-lg" />
                            <Skeleton variant="rect" width={100} height={24} className="rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const StatusBadge = ({ s }: { s: string }) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-white/10 ${s === TransactionStatus.PAGO || s === TransactionStatus.RECEBIDO ? 'text-green-500 bg-green-500/10' :
            s === TransactionStatus.PENDENTE ? 'text-yellow-500 bg-yellow-500/10' :
                s === TransactionStatus.CONSOLIDADO ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                    'text-blue-500 bg-blue-500/10'
            }`}>
            {s}
        </span>
    );

    return (
        <div className="bg-surface-dark border border-surface-border rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-[#111a22]/80 backdrop-blur-md sticky top-0 z-10">
                        <tr className="border-b border-surface-border">
                            <th className="p-5 w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === entries.length && entries.length > 0}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-background-dark"
                                />
                            </th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Fluxo</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição / Contexto</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Recurso & Natureza</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Valor</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                            {canEdit && <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Gestão</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-20 text-center text-slate-500 italic">
                                    Nenhum lançamento encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id} className={`border-b border-surface-border/50 hover:bg-white/5 transition-colors group ${selectedIds.includes(entry.id) ? 'bg-primary/5' : ''}`}>
                                    <td className="p-5 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(entry.id)}
                                            onChange={() => onToggleSelect(entry.id)}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-primary"
                                        />
                                    </td>
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-tighter ${entry.type === 'Entrada' ? 'text-green-500' : 'text-orange-500'}`}>
                                                {entry.type}
                                            </span>
                                            <span className="text-xs text-slate-300 font-mono mt-0.5">
                                                {new Date(entry.date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm text-white font-bold line-clamp-1">{entry.description}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">store</span>
                                                    {entry.supplier}
                                                </span>
                                                <span className="text-slate-700 text-[10px]">•</span>
                                                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">school</span>
                                                    {entry.school}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-blue-400 font-bold">{entry.program}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-slate-400">{entry.rubric}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                <span className={`text-[10px] font-black uppercase ${entry.nature === 'Custeio' ? 'text-purple-400' : 'text-amber-400'}`}>
                                                    {entry.nature}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-right font-mono">
                                        <div className={`text-sm font-black ${entry.type === 'Entrada' ? 'text-green-400' : 'text-red-400'}`}>
                                            {entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-0.5 font-bold uppercase tracking-tighter">
                                            {entry.payment_method}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <StatusBadge s={entry.status} />
                                            {canEdit && entry.type === 'Saída' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onConciliate(entry.id, entry.status); }}
                                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${entry.status === TransactionStatus.CONCILIADO ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
                                                >
                                                    {entry.status === TransactionStatus.CONCILIADO ? 'Conciliado' : 'Conciliar'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    {canEdit && (
                                        <td className="p-5">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => onEdit(entry)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-primary transition-all flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => onDelete(entry)} className={`w-8 h-8 rounded-lg bg-white/5 transition-all flex items-center justify-center ${!isAdmin && entry.status === TransactionStatus.ESTORNADO ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-500' : 'hover:bg-red-500/20 text-slate-400 hover:text-red-500'}`} title={isAdmin ? 'Excluir permanentemente' : (entry.status === TransactionStatus.ESTORNADO ? 'Reativar Lançamento' : 'Desativar/Estornar')}>
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {isAdmin ? 'delete' : (entry.status === TransactionStatus.ESTORNADO ? 'restore_from_trash' : 'block')}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinancialTable;
