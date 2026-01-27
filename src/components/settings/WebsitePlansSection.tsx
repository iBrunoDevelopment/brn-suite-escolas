import React from 'react';

interface WebsitePlansSectionProps {
    plans: any[];
    savingPlans: boolean;
    onSavePlans: () => void;
    updatePlanField: (index: number, field: string, value: any) => void;
    onAddFeature: (planIndex: number) => void;
    onRemoveFeature: (planIndex: number, featureIndex: number) => void;
    onUpdateFeature: (planIndex: number, featureIndex: number, value: string) => void;
}

const WebsitePlansSection: React.FC<WebsitePlansSectionProps> = ({
    plans, savingPlans, onSavePlans, updatePlanField, onAddFeature, onRemoveFeature, onUpdateFeature
}) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <span className="material-symbols-outlined text-3xl">public</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-wider uppercase">Gerenciar Landing Page</h3>
                        <p className="text-slate-400 text-sm italic">Edite os planos e preços exibidos na página inicial.</p>
                    </div>
                </div>
                <button
                    onClick={onSavePlans}
                    disabled={savingPlans}
                    className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex justify-center items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">{savingPlans ? 'sync' : 'save'}</span>
                    <span>{savingPlans ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
            </div>

            <div className="space-y-8">
                {plans.map((plan, index) => (
                    <div key={index} className="bg-[#111a22] p-6 rounded-2xl border border-surface-border">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-text-secondary">{plan.icon}</span>
                            <h4 className="text-lg font-bold text-white">{plan.title}</h4>
                            {plan.highlight && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-bold">Destaque</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`plan_title_${index}`} className="text-xs text-slate-400 font-bold uppercase">Título do Plano</label>
                                <input
                                    id={`plan_title_${index}`}
                                    type="text"
                                    value={plan.title}
                                    onChange={(e) => updatePlanField(index, 'title', e.target.value)}
                                    className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`plan_subtitle_${index}`} className="text-xs text-slate-400 font-bold uppercase">Subtítulo</label>
                                <input
                                    id={`plan_subtitle_${index}`}
                                    type="text"
                                    value={plan.subtitle}
                                    onChange={(e) => updatePlanField(index, 'subtitle', e.target.value)}
                                    className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`plan_price_${index}`} className="text-xs text-slate-400 font-bold uppercase">Valor (R$)</label>
                                <input
                                    id={`plan_price_${index}`}
                                    type="text"
                                    value={plan.price_value}
                                    onChange={(e) => updatePlanField(index, 'price_value', e.target.value)}
                                    className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm font-bold text-emerald-400"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`plan_period_${index}`} className="text-xs text-slate-400 font-bold uppercase">Período (ex: /mês)</label>
                                <input
                                    id={`plan_period_${index}`}
                                    type="text"
                                    value={plan.price_period}
                                    onChange={(e) => updatePlanField(index, 'price_period', e.target.value)}
                                    className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 mb-4">
                            <label htmlFor={`plan_bill_${index}`} className="text-xs text-slate-400 font-bold uppercase">Informação de Cobrança / Pagamento</label>
                            <input
                                id={`plan_bill_${index}`}
                                type="text"
                                value={plan.billing_info}
                                onChange={(e) => updatePlanField(index, 'billing_info', e.target.value)}
                                className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm w-full"
                                placeholder="Ex: Faturado semestralmente..."
                            />
                        </div>

                        <div className="flex flex-col gap-1 mb-4">
                            <label htmlFor={`plan_det_${index}`} className="text-xs text-slate-400 font-bold uppercase">Detalhes Completos (para Modal)</label>
                            <textarea
                                id={`plan_det_${index}`}
                                rows={3}
                                value={plan.details || ''}
                                onChange={(e) => updatePlanField(index, 'details', e.target.value)}
                                className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm w-full resize-none"
                                placeholder="Descreva detalhadamente o plano para aparecer no modal..."
                            />
                        </div>

                        <div className="flex flex-col gap-2 mb-4">
                            <label className="text-xs text-slate-400 font-bold uppercase">Itens Inclusos (Features)</label>
                            <div className="space-y-2">
                                {plan.features?.map((feature: any, fIndex: number) => (
                                    <div key={fIndex} className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                                        <input
                                            aria-label={`Feature ${fIndex + 1} do plano ${plan.title}`}
                                            type="text"
                                            value={typeof feature === 'string' ? feature : feature.text}
                                            onChange={(e) => onUpdateFeature(index, fIndex, e.target.value)}
                                            className="flex-1 bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-white text-sm"
                                            placeholder="Descrição do item..."
                                        />
                                        <button
                                            onClick={() => onRemoveFeature(index, fIndex)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                            title="Remover item"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => onAddFeature(index)}
                                className="mt-2 w-full py-2 border border-dashed border-slate-700 hover:border-primary text-slate-500 hover:text-primary rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">add</span>
                                Adicionar Item
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={plan.highlight}
                                    onChange={(e) => updatePlanField(index, 'highlight', e.target.checked)}
                                />
                                <span className="text-sm text-slate-300">Destacar este plano</span>
                            </label>
                            {plan.highlight && (
                                <input
                                    aria-label="Texto de destaque"
                                    type="text"
                                    value={plan.highlight_text}
                                    onChange={(e) => updatePlanField(index, 'highlight_text', e.target.value)}
                                    placeholder="Texto do destaque (ex: Mais Popular)"
                                    className="bg-surface-dark border border-surface-border rounded-lg px-3 py-1 text-white text-xs"
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WebsitePlansSection;
