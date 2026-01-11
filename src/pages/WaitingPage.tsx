import React, { useState } from 'react';
import { User } from '../types';
import SupportModal from '../components/SupportModal';

interface WaitingPageProps {
    user: User;
}

const WaitingPage: React.FC<WaitingPageProps> = ({ user }) => {
    const isInactive = user.active === false;
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-300 p-6 md:p-12 font-display">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                            Olá, <span className="text-primary">{user.name}</span>!
                        </h1>
                        <p className="text-lg text-slate-400">
                            {isInactive
                                ? 'Sua conta está temporariamente desativada.'
                                : 'Sua conta foi criada, mas ainda falta um pequeno passo.'}
                        </p>
                    </div>
                    <div className={`${isInactive ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'} border p-4 rounded-2xl flex items-center gap-4`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isInactive ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                            <span className="material-symbols-outlined animate-pulse">
                                {isInactive ? 'block' : 'hourglass_top'}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tighter">Status da Conta</p>
                            <p className={`text-xs font-medium ${isInactive ? 'text-red-400' : 'text-primary'}`}>
                                {isInactive ? 'Acesso Restrito' : 'Aguardando vínculo escolar'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Briefing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* O que é o sistema */}
                    <div className="bg-[#1e293b] border border-[#334155] p-8 rounded-3xl animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-3xl">hub</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">O que é o BRN Suite Escolas?</h3>
                        <p className="leading-relaxed text-slate-400">
                            É uma plataforma de <strong>Inteligência Financeira Governamental</strong> desenhada especificamente para simplificar a vida de diretores e secretários escolares.
                            Unificamos o controle de recursos, prestação de contas e documentação legal em um só lugar.
                        </p>
                    </div>

                    {/* Vantagens */}
                    <div className="bg-[#1e293b] border border-[#334155] p-8 rounded-3xl animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-3xl">verified</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">Principais Vantagens</h3>
                        <ul className="space-y-3">
                            {[
                                'Economia de até 70% do tempo gasto em burocracia',
                                'Zero risco de erros em cálculos de cotações',
                                'Documentação 100% em conformidade com o Tribunal de Contas',
                                'Transparência total na aplicação dos recursos públicos'
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Workflow Section */}
                <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155] p-8 md:p-12 rounded-[2rem] mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl font-bold text-white mb-2">Fluxo de Trabalho Inteligente</h3>
                        <p className="text-slate-400">Como o sistema transforma sua rotina diária:</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: 'add_shopping_cart', title: 'Lançamento', desc: 'Registre a nota fiscal ou a necessidade de compra.' },
                            { icon: 'attachment', title: 'Evidências', desc: 'Anexe fotos e documentos diretamente da câmera.' },
                            { icon: 'balance', title: 'Cotação Automática', desc: 'O sistema calcula o vencedor e gera os mapas de preços.' },
                            { icon: 'print', title: 'Documentos', desc: 'Gere Atas, Ordens e Recibos em um clique.' }
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center text-center p-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                                    <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                                </div>
                                <h4 className="font-bold text-white mb-2">{step.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Info */}
                <div className={`${isInactive ? 'bg-red-500/5 border-red-500/10' : 'bg-primary/5 border-primary/10'} text-center p-8 rounded-3xl border animate-in fade-in duration-1000 delay-500`}>
                    <h4 className="text-lg font-bold text-white mb-2">
                        {isInactive ? 'O que aconteceu?' : 'O que fazer agora?'}
                    </h4>
                    <p className="text-slate-400 mb-6 mx-auto max-w-2xl">
                        {isInactive
                            ? 'Sua conta foi desativada pelo administrador do sistema. Isso pode ocorrer por questões de segurança ou atualização cadastral.'
                            : 'Sua conta está ativa, mas você ainda não está vinculado a uma escola. Entre em contato com o seu Administrador ou GEE para que ele vincule seu perfil à unidade escolar correspondente.'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => setIsSupportOpen(true)}
                            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">support_agent</span>
                            Falar com Suporte
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            Já fui vinculado? Atualizar
                        </button>
                    </div>
                </div>
            </div>

            <SupportModal
                user={user}
                isOpen={isSupportOpen}
                onClose={() => setIsSupportOpen(false)}
            />
        </div>
    );
};

export default WaitingPage;
