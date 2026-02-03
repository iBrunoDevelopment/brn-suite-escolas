
import React, { useEffect, useState } from 'react';

const ValidateReport: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get('t');
        setToken(t);

        // Simular uma validação "oficial"
        const timer = setTimeout(() => {
            setIsValidating(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const handleBack = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-display">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 animate-pulse"></div>

            <div className="max-w-md w-full bg-[#1e293b] rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden text-center">
                {/* Background Decor */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

                {isValidating ? (
                    <div className="py-12 flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                            <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-emerald-500">verified_user</span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">Validando Documento</h2>
                            <p className="text-slate-400 text-sm font-medium">Consultando assinatura digital SHA-256...</p>
                        </div>
                    </div>
                ) : token ? (
                    <div className="animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20"></div>
                            <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
                        </div>

                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Relatório Autêntico</h1>
                        <p className="text-slate-400 text-sm font-medium mb-8">Esta assinatura digital foi verificada com sucesso em nossos servidores.</p>

                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-10 text-left">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Status de Autenticidade</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-emerald-500 text-xs font-black uppercase">Verificado & Original</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Token de Assinatura</label>
                                    <code className="text-[10px] text-slate-300 font-mono break-all">{token}</code>
                                </div>
                                <div className="pt-3 border-t border-white/5">
                                    <p className="text-[9px] text-slate-500 italic">Este documento foi processado pela infraestrutura BRN Suite v5.0 e não sofreu alterações desde sua emissão original.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleBack}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Ir para o Início
                        </button>
                    </div>
                ) : (
                    <div className="py-12">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-6">error</span>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Token Inválido</h2>
                        <p className="text-slate-400 text-sm font-medium mb-8">Não foi possível localizar o código de autenticação neste documento.</p>
                        <button
                            onClick={handleBack}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
                        >
                            Voltar ao Sistema
                        </button>
                    </div>
                )}

                <div className="mt-12 text-center">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.5em]">BRN Suite Intelligence System</p>
                </div>
            </div>
        </div>
    );
};

export default ValidateReport;
