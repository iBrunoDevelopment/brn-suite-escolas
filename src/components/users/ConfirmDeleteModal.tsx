import React from 'react';

interface ConfirmDeleteModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl">warning</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        ATENÇÃO: A exclusão deve ser feita apenas para cadastros incorretos ou duplicados que <span className="text-rose-400 font-bold underline">NÃO possuem movimentação</span> no sistema.<br /><br />
                        Para quem já utilizou o sistema, recomendamos apenas <span className="text-emerald-400 font-bold">DESATIVAR</span> o acesso.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 h-12 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 h-12 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                        >
                            Excluir Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
