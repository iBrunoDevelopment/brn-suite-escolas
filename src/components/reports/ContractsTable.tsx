
import React from 'react';
import { formatCurrency } from '../../lib/printUtils';

interface ContractTableProps {
    contracts: any[];
    onDelete?: (id: string) => void;
    onEdit?: (contract: any) => void;
    onPrint?: (contract: any) => void;
}

const ContractsTable: React.FC<ContractTableProps> = ({ contracts, onDelete, onEdit, onPrint }) => {
    if (contracts.length === 0) {
        return (
            <div className="bg-surface-dark border border-surface-border rounded-3xl p-20 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-slate-600">history_edu</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhum contrato encontrado</h3>
                <p className="text-slate-500 max-w-md">Registre novos contratos de serviços recorrentes para gerenciar o saldo e as prestações vinculadas.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contracts.map(contract => {
                const total = contract.total_value || 0;
                const executed = contract.executed_value || 0;
                const balance = Math.max(0, total - executed);
                const progress = total > 0 ? (executed / total) * 100 : 0;

                return (
                    <div key={contract.id} className="bg-[#111a22] border border-white/5 rounded-[32px] p-6 md:p-8 hover:border-primary/30 transition-all group shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${contract.category === 'INTERNET' ? 'bg-blue-500/20 text-blue-400' :
                                    contract.category === 'GÁS' ? 'bg-orange-500/20 text-orange-400' : 'bg-primary/20 text-primary'
                                    }`}>
                                    <span className="material-symbols-outlined">
                                        {contract.category === 'INTERNET' ? 'wifi' : contract.category === 'GÁS' ? 'propane_tank' : 'description'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-black text-white uppercase tracking-tight line-clamp-1">{contract.suppliers?.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{contract.contract_number || 'Sem Número'}</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${contract.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {contract.status}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Objeto do Contrato</p>
                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{contract.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Valor Total</p>
                                    <p className="text-sm font-black text-white text-center">{formatCurrency(total)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Valor Mensal</p>
                                    <p className="text-sm font-black text-primary text-center">{formatCurrency(contract.monthly_value)}</p>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Execução Financeira</p>
                                        <p className="text-xs font-black text-white">{formatCurrency(executed)} <span className="text-slate-500 font-medium">de {formatCurrency(total)}</span></p>
                                    </div>
                                    <p className={`text-xs font-black transition-colors duration-500 ${progress < 30 ? 'text-red-500' :
                                        progress < 60 ? 'text-yellow-500' :
                                            progress < 90 ? 'text-orange-500' : 'text-green-500'
                                        }`}>{progress.toFixed(1)}%</p>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className={`h-full transition-all duration-1000 ${progress < 30 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                            progress < 60 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                                                progress < 90 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                            }`}
                                        style={{ width: `${Math.min(100, progress)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">calendar_month</span>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                        {new Date(contract.start_date).toLocaleDateString()} — {new Date(contract.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onPrint?.(contract)}
                                        className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                        title="Imprimir Contrato"
                                    >
                                        <span className="material-symbols-outlined text-lg">print</span>
                                    </button>
                                    <button
                                        onClick={() => onEdit?.(contract)}
                                        className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                        title="Editar Contrato"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(contract.id)}
                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Excluir Contrato"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ContractsTable;
