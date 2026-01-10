
import React from 'react';
import { TransactionStatus } from '../../types';

interface StatsCardsProps {
    stats: {
        income: number;
        expense: number;
        balance: number;
        pending: number;
    };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="group bg-surface-dark border border-surface-border p-6 rounded-2xl shadow-xl transition-all hover:border-green-500/30 hover:bg-green-500/5">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entradas do Período</span>
                    <span className="material-symbols-outlined text-green-500 text-[20px] opacity-50 group-hover:opacity-100">trending_up</span>
                </div>
                <div className="text-2xl font-black text-white">{stats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Confirmado em Conta</span>
                </div>
            </div>

            <div className="group bg-surface-dark border border-surface-border p-6 rounded-2xl shadow-xl transition-all hover:border-orange-500/30 hover:bg-orange-500/5">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saídas do Período</span>
                    <span className="material-symbols-outlined text-orange-500 text-[20px] opacity-50 group-hover:opacity-100">trending_down</span>
                </div>
                <div className="text-2xl font-black text-white">{stats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pagamentos Efetuados</span>
                </div>
            </div>

            <div className={`group border p-6 rounded-2xl shadow-xl transition-all ${stats.balance >= 0 ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40' : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Atual Disponível</span>
                    <span className={`material-symbols-outlined text-[20px] opacity-50 group-hover:opacity-100 ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{stats.balance >= 0 ? 'account_balance_wallet' : 'error_outline'}</span>
                </div>
                <div className={`text-2xl font-black ${stats.balance >= 0 ? 'text-white' : 'text-red-400'}`}>{stats.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <div className="mt-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${stats.balance >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Líquido em Caixa</span>
                </div>
            </div>

            <div className="group bg-surface-dark border border-surface-border p-6 rounded-2xl shadow-xl transition-all hover:border-yellow-500/30 hover:bg-yellow-500/5">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando Aprovação</span>
                    <span className="material-symbols-outlined text-yellow-500 text-[20px] opacity-50 group-hover:opacity-100">hourglass_empty</span>
                </div>
                <div className="text-2xl font-black text-white">{stats.pending} <span className="text-xs font-normal text-slate-500">itens</span></div>
                <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Status Pendente</span>
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
