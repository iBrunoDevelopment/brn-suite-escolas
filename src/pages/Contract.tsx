import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, ContractSignature } from '../types';

interface ContractProps {
    user: User;
    onSigned?: () => void;
}

const Contract: React.FC<ContractProps> = ({ user, onSigned }) => {
    const [loading, setLoading] = useState(false);
    const [signed, setSigned] = useState(false);
    const [signatureData, setSignatureData] = useState<ContractSignature | null>(null);
    const [ip, setIp] = useState('');

    useEffect(() => {
        checkSignature();
        fetchIp();
    }, []);

    const fetchIp = async () => {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            setIp(data.ip);
        } catch (e) {
            console.error('Failed to fetch IP', e);
        }
    };

    const checkSignature = async () => {
        const { data, error } = await supabase
            .from('contract_signatures')
            .select('*')
            .eq('user_id', user.id)
            .order('signed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            setSigned(true);
            setSignatureData(data);
        }
    };

    const handleSign = async () => {
        if (!confirm('Ao clicar em OK, você concorda com todos os termos apresentados e assina digitalmente este contrato.')) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('contract_signatures').insert({
                user_id: user.id,
                contract_version: 'v1.0-2026',
                ip_address: ip,
                status: 'signed',
                user_agent: navigator.userAgent
            });

            if (error) throw error;

            alert('Contrato assinado com sucesso! O acesso ao sistema está liberado.');
            setSigned(true);
            checkSignature();
            if (onSigned) onSigned();

        } catch (error: any) {
            console.error(error);
            alert('Erro ao assinar contrato: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (signed && signatureData) {
        return (
            <div className="min-h-screen bg-[#111827] flex items-center justify-center p-6 text-white font-sans">
                <div className="max-w-2xl w-full bg-[#16202a] border border-emerald-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -mr-10 -mt-10"></div>

                    <div className="flex flex-col items-center text-center gap-6 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                            <span className="material-symbols-outlined text-5xl">verified_user</span>
                        </div>

                        <h1 className="text-2xl font-black text-white">Contrato Assinado</h1>

                        <div className="bg-black/30 w-full p-6 rounded-2xl border border-white/5 text-sm md:text-base">
                            <p className="text-slate-300 mb-2">Este contrato foi assinado digitalmente por:</p>
                            <p className="text-white font-bold text-lg uppercase tracking-wider mb-6">{user.name}</p>

                            <div className="grid grid-cols-2 gap-4 text-xs md:text-sm text-slate-400 border-t border-white/5 pt-4">
                                <div className="text-left">
                                    <span className="block font-bold text-emerald-500 uppercase text-[10px]">Data e Hora</span>
                                    {new Date(signatureData.signed_at).toLocaleString('pt-BR')}
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-emerald-500 uppercase text-[10px]">Endereço IP</span>
                                    {signatureData.ip_address || 'N/A'}
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-emerald-500 uppercase text-[10px]">Versão</span>
                                    {signatureData.contract_version}
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-emerald-500 uppercase text-[10px]">Status</span>
                                    <span className="text-emerald-400 font-bold uppercase">Vigente</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-slate-500 text-xs">O comprovante de assinatura está armazenado em nossos servidores seguros.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4 md:p-8 text-white font-sans">
            <div className="max-w-4xl w-full bg-[#16202a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="bg-[#0f151c] p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-yellow-500 text-3xl">gavel</span>
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wider">Termo de Responsabilidade</h1>
                            <p className="text-xs text-slate-400">Leia atentamente antes de prosseguir</p>
                        </div>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-300 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="prose prose-invert max-w-none prose-p:text-sm prose-headings:text-white">
                        <p className="text-lg font-medium text-white mb-6">
                            Pelo presente instrumento, eu, <strong className="text-yellow-500 uppercase">{user.name}</strong>, inscrito como usuário do sistema <strong>BRN Suite Escolas</strong>, declaro para os devidos fins que:
                        </p>

                        <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6">1. Acesso e Segurança</h3>
                        <p>
                            Estou ciente de que meu acesso (login e senha) é <strong>pessoal e intransferível</strong>. Assumo total responsabilidade por todas as ações realizadas no sistema sob minhas credenciais, comprometendo-me a manter minha senha em sigilo absoluto e a não compartilhá-la com terceiros, sob pena de responsabilização administrativa.
                        </p>

                        <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6">2. Veracidade das Informações</h3>
                        <p>
                            Declaro que todas as informações inseridas no sistema, incluindo lançamentos financeiros, cadastros de fornecedores e documentos anexados, são <strong>verdadeiras e correspondem fielmente aos documentos originais</strong>. Reconheço que a inserção de dados falsos pode acarretar em sanções legais, conforme legislação vigente sobre falsidade ideológica e improbidade administrativa.
                        </p>

                        <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6">3. Conformidade Legal (PNAE/FNDE)</h3>
                        <p>
                            Comprometo-me a seguir rigorosamente as normas e resoluções do FNDE (Fundo Nacional de Desenvolvimento da Educação), especialmente no que tange à execução dos recursos do PNAE (Programa Nacional de Alimentação Escolar) e PDDE, garantindo a aplicação correta dos recursos públicos e a devida prestação de contas.
                        </p>

                        <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6">4. Auditoria e Monitoramento</h3>
                        <p>
                            Estou ciente de que todas as minhas ações no sistema são registradas (logs de auditoria), incluindo data, hora e endereço IP, e que esses dados podem ser utilizados para fins de auditoria interna ou externa pelos órgãos de controle.
                        </p>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mt-8">
                            <p className="text-yellow-200 text-xs font-bold uppercase tracking-wider mb-2">Declaração Final</p>
                            <p className="text-yellow-100 text-sm italic">
                                "Declaro ter lido, compreendido e aceito todos os termos acima descritos, assumindo plena responsabilidade pelo uso ético e legal do sistema."
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer - Action */}
                <div className="bg-[#0f151c] p-6 border-t border-white/10 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 text-center md:text-left">
                        <p>Endereço IP para registro: <span className="text-slate-300 font-mono">{ip || 'Carregando...'}</span></p>
                        <p>Data: <span className="text-slate-300">{new Date().toLocaleDateString('pt-BR')}</span></p>
                    </div>

                    <button
                        onClick={handleSign}
                        disabled={loading || !ip}
                        className={`
                            px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg
                            ${loading || !ip
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white hover:scale-105 hover:shadow-emerald-500/20'}
                        `}
                    >
                        {loading ? 'Assinando...' : 'Aceitar e Assinar Digitalmente'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Contract;
