
import React from 'react';
import { AccountabilityProcess } from '../../types';
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
                    <div key={process.id} className="bg-surface-dark border border-surface-border rounded-2xl p-4 md:p-6 hover:border-primary/40 transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 group">
                        <div className="flex items-start md:items-center gap-4 w-full lg:w-auto">
                            <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${process.status === 'Concluído' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
                                <span className="material-symbols-outlined text-3xl font-light">
                                    {process.status === 'Concluído' ? 'check_circle' : 'pending'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate text-sm md:text-base">{entry?.description}</h3>
                                    <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/10 font-black uppercase whitespace-nowrap">{entry?.nature}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap gap-x-4 gap-y-2 mt-2">
                                    <span className="text-[10px] uppercase font-black text-slate-300 flex items-center gap-1.5 min-w-0">
                                        <span className="material-symbols-outlined text-sm text-primary shrink-0">school</span>
                                        <span className="truncate">{schoolName}</span>
                                    </span>
                                    <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5 min-w-0">
                                        <span className="material-symbols-outlined text-sm shrink-0">person</span>
                                        <span className="truncate">{entry?.suppliers?.name || 'Sem Fornecedor'}</span>
                                    </span>
                                    <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                                        <span className="material-symbols-outlined text-sm shrink-0">calendar_month</span>
                                        {entry?.date ? new Date(entry.date).toLocaleDateString('pt-BR') : '---'}
                                    </span>
                                    <span className="text-[10px] uppercase font-black text-primary flex items-center gap-1.5 min-w-0">
                                        <span className="material-symbols-outlined text-sm shrink-0">account_balance</span>
                                        <span className="truncate">{entry?.programs?.name}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between lg:justify-end gap-5 w-full lg:w-auto pt-5 lg:pt-0 border-t lg:border-t-0 border-white/5">
                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1.5 px-1 md:px-0">
                                <span className="text-xl font-black text-white">{formatCurrency(Math.abs(entry?.value || 0))}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${process.status === 'Concluído' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                                    {process.status}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar scroll-smooth">
                                <button
                                    onClick={() => onEdit(process)}
                                    className="p-2.5 shrink-0 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl transition-all"
                                    title="Editar / Visualizar"
                                >
                                    <span className="material-symbols-outlined text-[20px]">edit_document</span>
                                </button>

                                <div className="w-px h-6 bg-white/10 mx-1.5 shrink-0"></div>

                                <div className="flex items-center gap-1">
                                    <button onClick={() => onPrint(process, 'ata')} className="p-2.5 shrink-0 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" title="Ata de Assembleia">
                                        <span className="material-symbols-outlined text-[20px]">description</span>
                                    </button>
                                    <button onClick={() => onPrint(process, 'ordem')} className="p-2.5 shrink-0 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" title="Ordem de Compra">
                                        <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                                    </button>
                                    <button onClick={() => onPrint(process, 'consolidacao')} className="p-2.5 shrink-0 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" title="Consolidação de Preços">
                                        <span className="material-symbols-outlined text-[20px]">analytics</span>
                                    </button>
                                    <button onClick={() => onPrint(process, 'recibo')} className="p-2.5 shrink-0 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" title="Recibo de Pagamento">
                                        <span className="material-symbols-outlined text-[20px]">payments</span>
                                    </button>

                                    <div className="w-px h-4 bg-white/5 mx-1 shrink-0"></div>

                                    <div className="flex items-center gap-0.5 px-1 bg-white/5 rounded-lg py-0.5">
                                        <button onClick={() => onPrint(process, 'cotacao1')} className="p-2 shrink-0 hover:bg-primary/20 text-slate-400 hover:text-primary rounded-lg transition-all flex flex-col items-center" title="Cotação 1">
                                            <span className="material-symbols-outlined text-[16px]">request_quote</span>
                                            <span className="text-[7px] font-black">1</span>
                                        </button>
                                        <button onClick={() => onPrint(process, 'cotacao2')} className="p-2 shrink-0 hover:bg-primary/20 text-slate-400 hover:text-primary rounded-lg transition-all flex flex-col items-center" title="Cotação 2">
                                            <span className="material-symbols-outlined text-[16px]">request_quote</span>
                                            <span className="text-[7px] font-black">2</span>
                                        </button>
                                        <button onClick={() => onPrint(process, 'cotacao3')} className="p-2 shrink-0 hover:bg-primary/20 text-slate-400 hover:text-primary rounded-lg transition-all flex flex-col items-center" title="Cotação 3">
                                            <span className="material-symbols-outlined text-[16px]">request_quote</span>
                                            <span className="text-[7px] font-black">3</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="w-px h-6 bg-white/10 mx-1.5 shrink-0"></div>

                                <button
                                    onClick={() => onDelete(process.id)}
                                    className="p-2.5 shrink-0 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all"
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
