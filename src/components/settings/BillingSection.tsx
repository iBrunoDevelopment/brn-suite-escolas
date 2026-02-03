import React, { useState } from 'react';
import { PlatformBilling } from '../../types';
import { formatCurrency } from '../../lib/printUtils';

interface BillingSectionProps {
    billingRecords: PlatformBilling[];
    loading: boolean;
    onUpdateStatus: (data: { id: string, status: string, payment_date?: string, payment_method?: string }) => void;
    onGenerate: (month: string) => void;
}

const BillingSection: React.FC<BillingSectionProps> = ({
    billingRecords, loading, onUpdateStatus, onGenerate
}) => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });

    const filteredRecords = billingRecords.filter(r => r.reference_month === selectedMonth);

    const months = [
        { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
        { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
        { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
        { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const [selYear, selMonth] = selectedMonth.split('-');

    const updateMonth = (m: string) => setSelectedMonth(`${selYear}-${m}-01`);
    const updateYear = (y: string) => setSelectedMonth(`${y}-${selMonth}-01`);

    const handleMarkAsPaid = (record: PlatformBilling) => {
        if (!confirm(`Confirmar pagamento de ${formatCurrency(record.amount)} para ${record.school?.name}?`)) return;
        onUpdateStatus({
            id: record.id,
            status: 'Pago',
            payment_date: new Date().toISOString(),
            payment_method: 'Manual'
        });
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111a22] p-6 rounded-2xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total no Mês</span>
                    <span className="text-2xl font-black text-white">
                        {formatCurrency(filteredRecords.reduce((acc, current) => acc + (Number(current.amount) || 0), 0))}
                    </span>
                </div>
                <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Recebido</span>
                    <span className="text-2xl font-black text-emerald-500">
                        {formatCurrency(filteredRecords.filter(r => r.status === 'Pago').reduce((acc, current) => acc + (Number(current.amount) || 0), 0))}
                    </span>
                </div>
                <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pendente</span>
                    <span className="text-2xl font-black text-amber-500">
                        {formatCurrency(filteredRecords.filter(r => r.status === 'Pendente').reduce((acc, current) => acc + (Number(current.amount) || 0), 0))}
                    </span>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-[#111a22] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Período de Referência</label>
                    <div className="flex gap-2">
                        <select
                            title="Selecione o Mês"
                            value={selMonth}
                            onChange={(e) => updateMonth(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary transition-all cursor-pointer appearance-none text-center font-bold"
                        >
                            {months.map(m => <option key={m.value} value={m.value} className="bg-[#1e293b]">{m.label}</option>)}
                        </select>
                        <select
                            title="Selecione o Ano"
                            value={selYear}
                            onChange={(e) => updateYear(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary transition-all cursor-pointer appearance-none text-center font-bold"
                        >
                            {years.map(y => <option key={y} value={y} className="bg-[#1e293b]">{y}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => onGenerate(selectedMonth)}
                    className="w-full md:w-auto px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <span className="material-symbols-outlined">sync</span>
                    Gerar Cobranças do Mês
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-3">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 italic">Carregando registros...</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="bg-black/20 border border-dashed border-white/5 rounded-3xl p-20 text-center text-slate-500 italic">
                        <span className="material-symbols-outlined text-5xl mb-4 opacity-10">payments</span>
                        <p>Nenhuma cobrança gerada para este mês.</p>
                        <p className="text-xs mt-2">Clique no botão acima para sincronizar com as escolas ativas.</p>
                    </div>
                ) : (
                    filteredRecords.map((record) => (
                        <div key={record.id} className="bg-[#111a22] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${record.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    <span className="material-symbols-outlined text-[24px]">
                                        {record.status === 'Pago' ? 'check_circle' : 'hourglass_empty'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-tight">{record.school?.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{record.school?.plan_id || 'Plano não definido'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        <span className={`text-[10px] font-black uppercase ${record.status === 'Pago' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {record.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 justify-between md:justify-end">
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Valor</span>
                                    <span className="text-lg font-black text-white">{formatCurrency(record.amount)}</span>
                                </div>

                                {record.status !== 'Pago' && (
                                    <button
                                        onClick={() => handleMarkAsPaid(record)}
                                        className="h-10 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                    >
                                        Marcar como Pago
                                    </button>
                                )}

                                {record.status === 'Pago' && (
                                    <div className="text-right hidden md:block">
                                        <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest block italic">Pago em</span>
                                        <span className="text-[10px] font-bold text-emerald-500 italic">
                                            {record.payment_date ? new Date(record.payment_date).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                <div className="flex gap-3">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        <strong className="text-primary uppercase mr-1">Nota:</strong>
                        Este módulo é de uso exclusivo da <strong>BRN GROUP</strong>. Estes pagamentos referem-se à licença de uso do software e assessoria, pagos de forma externa pelos gestores, não impactando o livro caixa oficial das escolas cadastrado no sistema.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BillingSection;
