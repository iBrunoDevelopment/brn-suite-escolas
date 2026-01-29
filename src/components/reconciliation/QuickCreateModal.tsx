import React from 'react';
import { BankTransaction } from '../../hooks/useBankReconciliation';

interface QuickCreateModalProps {
    bt: BankTransaction;
    quickForm: any;
    setQuickForm: (form: any) => void;
    programs: any[];
    rubrics: any[];
    suppliers: any[];
    isMatching: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
    bt, quickForm, setQuickForm, programs, rubrics, suppliers, isMatching, onClose, onConfirm
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bt.type === 'C' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            <span className="material-symbols-outlined">{bt.type === 'C' ? 'add_circle' : 'remove_circle'}</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Lançamento Rápido</h3>
                            <p className="text-slate-500 text-[10px] uppercase font-black">{bt.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Data do Banco</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white font-mono">{new Date(bt.date).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Valor</label>
                            <div className={`bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-black ${bt.type === 'C' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {bt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="qc-desc" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Descrição</label>
                        <input
                            id="qc-desc"
                            type="text"
                            value={quickForm.description}
                            onChange={e => setQuickForm({ ...quickForm, description: e.target.value })}
                            placeholder={bt.description}
                            className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="qc-program" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Programa</label>
                        <select
                            id="qc-program"
                            value={quickForm.program_id}
                            onChange={e => setQuickForm({ ...quickForm, program_id: e.target.value })}
                            className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        >
                            <option value="">Selecione o Programa</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="qc-rubric" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rubrica (Opcional)</label>
                        <select
                            id="qc-rubric"
                            value={quickForm.rubric_id}
                            onChange={e => {
                                const rub = rubrics.find(r => r.id === e.target.value);
                                setQuickForm({
                                    ...quickForm,
                                    rubric_id: e.target.value,
                                    nature: rub?.default_nature || quickForm.nature
                                });
                            }}
                            className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        >
                            <option value="">Nenhuma / Natureza Direta</option>
                            {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="qc-nature" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Natureza</label>
                        <select
                            id="qc-nature"
                            value={quickForm.nature}
                            onChange={e => setQuickForm({ ...quickForm, nature: e.target.value })}
                            className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        >
                            <option value="Custeio">Custeio</option>
                            <option value="Capital">Capital</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="qc-supplier" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fornecedor (Opcional)</label>
                        <select
                            id="qc-supplier"
                            value={quickForm.supplier_id}
                            onChange={e => setQuickForm({ ...quickForm, supplier_id: e.target.value })}
                            className="bg-card-dark border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        >
                            <option value="">Selecione o Fornecedor</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={onConfirm}
                        disabled={isMatching || !quickForm.program_id}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isMatching ? 'Processando...' : 'Confirmar Lançamento e Conciliar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickCreateModal;
