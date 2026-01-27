import React from 'react';
import { BankTransaction } from '../../hooks/useBankReconciliation';

interface ManualMatchModalProps {
    bt: BankTransaction;
    systemEntries: any[];
    manualSearch: string;
    setManualSearch: (s: string) => void;
    onConfirmMatch: (bt: BankTransaction, entryId: string) => void;
    onClose: () => void;
}

const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
    bt, systemEntries, manualSearch, setManualSearch, onConfirmMatch, onClose
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <span className="material-symbols-outlined">link</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Vincular Manualmente</h3>
                            <p className="text-slate-500 text-[10px] uppercase font-black">Conciliando: {bt.description} ({bt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-sm">search</span>
                        <input
                            type="text"
                            value={manualSearch}
                            onChange={e => setManualSearch(e.target.value)}
                            placeholder="Buscar por descrição, valor ou código..."
                            className="w-full bg-card-dark border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                            aria-label="Buscar lançamento"
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex flex-col gap-2">
                            {systemEntries
                                .filter(e =>
                                    e.description.toLowerCase().includes(manualSearch.toLowerCase()) ||
                                    e.value.toString().includes(manualSearch) ||
                                    (bt.type === 'C' ? e.type === 'Entrada' : e.type === 'Saída')
                                )
                                .sort((a, b) => {
                                    const aValDiff = Math.abs(Number(a.value) - bt.value);
                                    const bValDiff = Math.abs(Number(b.value) - bt.value);
                                    if (aValDiff !== bValDiff) return aValDiff - bValDiff;
                                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                                })
                                .map(entry => (
                                    <button
                                        key={entry.id}
                                        onClick={() => onConfirmMatch(bt, entry.id)}
                                        className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex justify-between items-center transition-all group"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-white font-bold group-hover:text-indigo-400 transition-colors uppercase">{entry.description}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500 font-mono">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 font-black uppercase tracking-tighter">
                                                    {entry.program}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs font-black ${entry.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {Number(entry.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Selecionar</span>
                                        </div>
                                    </button>
                                ))}
                            {systemEntries.length === 0 && (
                                <div className="py-12 text-center text-slate-500">
                                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-20">inventory_2</span>
                                    <p className="text-xs">Nenhum lançamento em aberto encontrado para esta escola/conta.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualMatchModal;
