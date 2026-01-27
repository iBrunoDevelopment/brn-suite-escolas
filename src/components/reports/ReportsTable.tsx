
import React from 'react';
import { AccountabilityProcess, UserRole } from '../../types';
import { formatCurrency } from '../../lib/printUtils';

interface ReportsTableProps {
    processes: AccountabilityProcess[];
    onEdit: (process: AccountabilityProcess) => void;
    onDelete: (id: string) => void;
    onPrint: (process: AccountabilityProcess, template: string) => void;
}

const ReportsTable: React.FC<ReportsTableProps> = ({ processes, onEdit, onDelete, onPrint }) => {
    return (
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
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-black text-white">{formatCurrency(Math.abs(entry?.value || 0))}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${process.status === 'Concluído' ? 'text-green-500' : 'text-primary'}`}>
                                    {process.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/20 p-1.5 rounded-xl border border-white/5">
                                <button
                                    onClick={() => onEdit(process)}
                                    className="p-2.5 bg-white/5 hover:bg-primary text-slate-400 hover:text-white rounded-lg transition-all"
                                    title="Editar / Visualizar"
                                >
                                    <span className="material-symbols-outlined text-[20px]">edit_document</span>
                                </button>
                                <div className="w-px h-6 bg-white/10 mx-1"></div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onPrint(process, 'ata')} className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all" title="Ata de Assembleia"><span className="material-symbols-outlined text-[20px]">description</span></button>
                                    <button onClick={() => onPrint(process, 'ordem')} className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all" title="Ordem de Compra"><span className="material-symbols-outlined text-[20px]">shopping_cart</span></button>
                                    <button onClick={() => onPrint(process, 'consolidacao')} className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all" title="Consolidação de Preços"><span className="material-symbols-outlined text-[20px]">analytics</span></button>
                                </div>
                                <div className="w-px h-6 bg-white/10 mx-1"></div>
                                <button
                                    onClick={() => onDelete(process.id)}
                                    className="p-2.5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                    title="Excluir Processo"
                                >
                                    <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ReportsTable;
