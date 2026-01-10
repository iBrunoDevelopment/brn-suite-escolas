
import React from 'react';

const Help: React.FC = () => {
    const helpSections = [
        {
            title: 'Entendendo os Status',
            icon: 'sync',
            color: 'text-primary',
            items: [
                { label: 'Pendente', desc: 'Lançamento registrado, mas a transação financeira ainda não ocorreu (ex: boleto a vencer).' },
                { label: 'Pago / Recebido', desc: 'A transação foi concluída. O dinheiro saiu ou entrou efetivamente na conta bancária.' },
                { label: 'Agendado', desc: 'Pagamento já programado no banco para uma data futura.' },
                { label: 'Estornado', desc: 'Operação anulada ou devolvida pelo banco (mantém o histórico).' },
                { label: 'Conciliado', desc: 'Lançamento conferido com o extrato bancário. Status final de auditoria.' }
            ]
        },
        {
            title: 'Categorias Especiais',
            icon: 'category',
            color: 'text-emerald-500',
            items: [
                { label: 'Reembolso / Estorno (Entrada)', desc: 'Quando um valor pago volta para a conta da escola (ex: fornecedor devolveu pagamento).' },
                { label: 'Devolução de Recurso (Saída)', desc: 'Devolução formal de saldos não utilizados ao Tesouro ou órgão gestor (FNDE/Estado).' },
                { label: 'Rendimento de Aplicação', desc: 'Valores provenientes de juros da conta bancária (deve ser lançado mensalmente).' }
            ]
        },
        {
            title: 'Boas Práticas',
            icon: 'verified',
            color: 'text-orange-500',
            items: [
                { label: 'Data da Nota vs Pagamento', desc: 'Sempre registre a data de emissão da NF e a data real que o dinheiro saiu do banco.' },
                { label: 'Uso de Rubricas', desc: 'Vincule cada gasto à sua rubrica correta para facilitar a prestação de contas automática.' },
                { label: 'Fechamento Mensal', desc: 'Ao final do mês, mude o status para "Conciliado" apenas após bater com o extrato físico.' }
            ]
        },
        {
            title: 'Documentos e Auditoria',
            icon: 'analytics',
            color: 'text-primary',
            items: [
                { label: 'Participação / Eficiência', desc: 'Indica o quanto o preço do ganhador é mais econômico que o dos concorrentes. O ganhador é sempre o benchmark de 100%.' },
                { label: 'Desconto na Nota', desc: 'Utilizado para abater valores globais e garantir que a prestação de contas bata exatamente com o valor líquido pago no banco.' },
                { label: 'Consolidação', desc: 'Quadro comparativo oficial que demonstra a economicidade da compra perante os órgãos de fiscalização.' }
            ]
        }
    ];

    return (
        <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-primary">live_help</span>
                    Guia do Sistema
                </h1>
                <p className="text-text-secondary text-lg">Aprenda a dominar as ferramentas do BRN Suite Escolas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {helpSections.map((section, idx) => (
                    <div key={idx} className="bg-surface-dark border border-surface-border rounded-2xl p-6 shadow-xl hover:border-primary/30 transition-all group">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-12 h-12 rounded-xl bg-surface-border flex items-center justify-center ${section.color}`}>
                                <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">{section.icon}</span>
                            </div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">{section.title}</h2>
                        </div>

                        <div className="flex flex-col gap-5">
                            {section.items.map((item, i) => (
                                <div key={i} className="flex flex-col gap-1 border-l-2 border-surface-border pl-4 hover:border-primary transition-colors">
                                    <span className="text-sm font-bold text-white flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                        {item.label}
                                    </span>
                                    <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* FAQ Style Section */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 md:col-span-2 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-4xl text-primary">lightbulb</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold text-white">Dica de Ouro: Fluxo Digital</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Mantenha a aba de <strong>Lançamentos</strong> sempre atualizada. O segredo de uma prestação de contas sem erros é o registro imediato.
                            Assim que receber uma nota fiscal, lance como <strong>Pendente</strong>. Assim que pagar, mude para <strong>Pago</strong>.
                            Isso reduzirá o trabalho de fechamento mensal em até 80%!
                        </p>
                    </div>
                </div>
            </div>

            <footer className="text-center py-8">
                <p className="text-text-secondary text-sm">BRN Suite &copy; 2026 - Sistema de Apoio à Gestão Escolar v1.0</p>
            </footer>
        </div>
    );
};

export default Help;
