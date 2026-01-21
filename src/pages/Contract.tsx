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
            <div className="min-h-screen bg-[#111827] flex flex-col items-center p-4 md:p-8 text-white font-sans overflow-y-auto print:bg-white print:p-0 print:block print:overflow-visible">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { 
                            size: A4; 
                            margin: 2cm; 
                        }
                        
                        /* Garantir que nada impeça o fluxo de múltiplas páginas */
                        body, html, #root {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                        }

                        /* Esconder UI do sistema */
                        aside, nav, header, .sidebar, .topbar, button:not(.print-root button) {
                            display: none !important;
                        }

                        /* Forçar o container do contrato a ser o fluxo principal */
                        .print-root {
                            position: static !important;
                            display: block !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            color: black !important;
                        }

                        .print-inner {
                            padding: 0 !important;
                            margin: 0 !important;
                            border: none !important;
                            box-shadow: none !important;
                        }

                        /* Estilização de texto para papel */
                        h1, h2, h3, p, li, strong, span, div {
                            color: black !important;
                        }

                        /* Quebras de página inteligentes */
                        .clause-block {
                            page-break-inside: avoid;
                            break-inside: avoid;
                            margin-bottom: 20px !important;
                            display: block !important;
                        }

                        .signature-block {
                            page-break-inside: avoid;
                            break-inside: avoid;
                            margin-top: 50px !important;
                        }

                        /* Esconder o que sobrar */
                        .print-hidden { display: none !important; }
                    }
                ` }} />

                <div className="print-root print-inner max-w-4xl w-full bg-[#16202a] border border-emerald-500/30 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden mb-8 print:shadow-none print:border-none print:bg-white print:text-black print:p-0 print:m-0 print:overflow-visible">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -mr-10 -mt-10 print:hidden pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start mb-8 gap-6 print:flex-row print:items-center print:border-b print:border-slate-200 print:pb-6 print:mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 print:bg-slate-100 print:text-slate-800 print:w-12 print:h-12">
                                <span className="material-symbols-outlined text-4xl print:text-2xl">verified_user</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white print:text-black print:text-xl uppercase">Contrato Digital</h1>
                                <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest print:text-slate-500 print:text-[10px]">Documento Assinado e Vigente</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 transition-all active:scale-95 print:hidden cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">print</span>
                            Imprimir / PDF
                        </button>
                    </div>

                    <div className="bg-black/30 p-6 rounded-2xl border border-white/5 mb-8 print:bg-white print:border-none print:p-0 print:mb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-12">
                            <div>
                                <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 print:text-slate-400">Informações do Signatário</h2>
                                <p className="text-white font-bold text-lg uppercase print:text-black print:text-base">{user.name}</p>
                                <p className="text-slate-400 text-sm print:text-slate-600 print:text-xs">{user.email}</p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 print:text-slate-400">Selo de Autenticidade Digital</h2>
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl font-mono text-[10px] leading-relaxed break-all text-emerald-300 print:bg-slate-50 print:border-slate-200 print:text-slate-600 print:p-3 print:text-[9px]">
                                    AUTH_ID: {signatureData.id}<br />
                                    TIMESTAMP: {new Date(signatureData.signed_at).toISOString()}<br />
                                    NETWORK_IP: {signatureData.ip_address || '0.0.0.0'}<br />
                                    VERSION: {signatureData.contract_version}<br />
                                    SIGNED_DOC_VERIFIED_BY_BRN_SYSTEM
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none text-slate-400 text-sm space-y-6 print:text-black print:prose-p:text-xs print:prose-h3:text-sm print:prose-h3:mt-6 print:prose-h3:mb-2 print:space-y-4">
                        <h3 className="text-white font-bold uppercase text-xs border-b border-white/10 pb-2 print:text-black print:border-slate-300 print:font-black">Termos do Contrato</h3>
                        <ContractTerms user={user} />
                    </div>

                    <div className="signature-block mt-12 pt-8 border-t border-white/10 flex flex-col items-center text-center gap-2 opacity-50 print:opacity-100 print:mt-16 print:pt-8 print:border-slate-200">
                        <div className="w-48 h-px bg-slate-500 mb-2 print:bg-slate-300"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 print:text-black print:text-xs">{user.name}</p>
                        <p className="text-[9px] text-slate-500 print:text-slate-500">Assinado Eletronicamente em {new Date(signatureData.signed_at).toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                {onSigned && (
                    <button
                        onClick={() => onSigned()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 mb-12 print:hidden"
                    >
                        Continuar para o Sistema
                    </button>
                )}
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
                <div className="flex-1 overflow-y-auto p-8 text-slate-300 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        <p className="text-lg font-medium text-white mb-6">
                            Pelo presente instrumento, eu, <strong className="text-yellow-500 uppercase">{user.name}</strong>, inscrito como usuário do sistema <strong>BRN Suite Escolas</strong>, declaro para os devidos fins que:
                        </p>

                        <ContractTerms user={user} />

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

const ContractTerms: React.FC<{ user: User }> = ({ user }) => {
    const [plan, setPlan] = React.useState<any>(null);

    React.useEffect(() => {
        const fetchPlanData = async () => {
            if (!user.schoolId) return;

            // 1. Get school's plan_id
            const { data: school } = await supabase
                .from('schools')
                .select('plan_id')
                .eq('id', user.schoolId)
                .maybeSingle();

            if (school?.plan_id) {
                // 2. Get plans from settings
                const { data: settings } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'landing_page_plans')
                    .maybeSingle();

                if (settings?.value) {
                    const matchedPlan = settings.value.find((p: any) => p.id === school.plan_id);
                    if (matchedPlan) setPlan(matchedPlan);
                }
            }
        };

        fetchPlanData();
    }, [user.schoolId]);

    return (
        <>
            <div className="clause-block">
                <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6 print:text-black print:border-slate-300">1. Acesso e Segurança</h3>
                <p>
                    Estou ciente de que meu acesso (login e senha) é <strong>pessoal e intransferível</strong>. Assumo total responsabilidade por todas as ações realizadas no sistema sob minhas credenciais, comprometendo-me a manter minha senha em sigilo absoluto e a não compartilhá-la com terceiros, sob pena de responsabilização administrativa.
                </p>
            </div>

            <div className="clause-block">
                <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6 print:text-black print:border-slate-300">2. Veracidade das Informações</h3>
                <p>
                    Declaro que todas as informações inseridas no sistema, incluindo lançamentos financeiros, cadastros de fornecedores e documentos anexados, são <strong>verdadeiras e correspondem fielmente aos documentos originais</strong>. Reconheço que a inserção de dados falsos pode acarretar em sanções legais, conforme legislação vigente sobre falsidade ideológica e improbidade administrativa.
                </p>
            </div>

            <div className="clause-block">
                <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6 print:text-black print:border-slate-300">3. Responsabilidades do Gestor</h3>
                <p>
                    É de inteira responsabilidade do gestor a <strong>coleta de todas as assinaturas</strong> necessárias nos documentos gerados pelo sistema, bem como a guarda dos mesmos. Além disso, o gestor compromete-me a fornecer/anexar no sistema a <strong>Nota Fiscal, Comprovante de Pagamento, Extratos de Investimento e Conta Corrente</strong> de cada conta bancária vinculada, além das certidões negativas de débito, impreterivelmente até o <strong>5º dia útil de cada mês</strong>.
                </p>
            </div>

            <div className="clause-block">
                <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6 print:text-black print:border-slate-300">4. Obrigações da BRN GROUP</h3>
                <div className="space-y-3">
                    <p>
                        A empresa <strong>BRN GROUP</strong> obriga-se a cumprir com os itens descritos no plano <strong>{plan?.title || 'Contratado'}</strong>, garantindo:
                    </p>
                    {plan?.features ? (
                        <ul className="list-disc pl-5 space-y-1 text-slate-400 print:text-black">
                            {plan.features.map((feature: string, idx: number) => (
                                <li key={idx} className="text-xs">{feature}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs italic text-slate-500">Planos e funcionalidades conforme proposta comercial aceita.</p>
                    )}
                </div>
            </div>

            <div className="clause-block">
                <h3 className="text-white font-bold uppercase text-sm border-b border-white/10 pb-2 mb-3 mt-6 print:text-black print:border-slate-300">5. Conformidade Legal e Auditoria</h3>
                <p>
                    Comprometo-me a seguir as normas do FNDE (PNAE/PDDE). Estou ciente de que todas as ações no sistema são registradas para fins de auditoria interna ou externa pelos órgãos de controle, incluindo registro de IP e timestamp de cada operação.
                </p>
            </div>
        </>
    );
};

export default Contract;
