import React from 'react';

interface HelpModalProps {
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-indigo-400">
                        <span className="material-symbols-outlined text-2xl">info</span>
                        <h3 className="text-white font-bold text-lg">Guia: Como solicitar os extratos</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-6">
                        <section>
                            <h4 className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.2em] mb-3">Por que não usar PDF?</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                O PDF é um documento de "imagem". O sistema precisa exportar os dados reais para garantir que centavos não sejam perdidos e que a conciliação seja 100% precisa.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                                    <span className="material-symbols-outlined text-emerald-400">description</span>
                                    Arquivo OFX
                                </div>
                                <p className="text-slate-500 text-xs">É o formato financeiro universal. Nele, cada transação tem um ID único que evita lançamentos duplicados no sistema.</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                                    <span className="material-symbols-outlined text-blue-400">table_chart</span>
                                    Arquivo CSV / Excel
                                </div>
                                <p className="text-slate-500 text-xs">Formato de planilha. Se o banco não oferecer OFX, o CSV é a segunda melhor opção para o processamento automático.</p>
                            </div>
                        </div>

                        <section className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl">
                            <h4 className="text-white font-bold text-sm mb-4">Texto para enviar às escolas:</h4>
                            <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-slate-300 relative select-all cursor-pointer group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white text-[8px] px-2 py-1 rounded">CLIQUE PARA COPIAR</div>
                                "Prezados, para agilizarmos a prestação de contas no sistema, solicitamos que ao enviarem o extrato mensal, exportem também o arquivo no formato **OFX** (preferencial) ou **CSV**. No seu Internet Banking, basta acessar o extrato e procurar pelo botão 'Exportar' ou 'Salvar como'. Não é necessário que seja apenas em PDF."
                            </div>
                        </section>

                        <div className="space-y-2">
                            <h4 className="text-slate-300 font-bold text-sm">Passo a passo nos principais bancos:</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="bg-white/5 p-3 rounded-xl text-[10px] text-slate-400"><strong>Banco do Brasil:</strong> Extrato &gt; Salvar em outros formatos &gt; OFX</div>
                                <div className="bg-white/5 p-3 rounded-xl text-[10px] text-slate-400"><strong>Caixa:</strong> Extrato &gt; Exportar &gt; Gerar arquivo para Gerenciador Financeiro</div>
                                <div className="bg-white/5 p-3 rounded-xl text-[10px] text-slate-400"><strong>Itaú:</strong> Extrato &gt; Salvar em outros formatos &gt; Money (OFX)</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white/5 border-top border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Entendi, obrigado!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
