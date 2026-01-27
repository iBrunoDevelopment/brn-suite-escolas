import React from 'react';

interface PaymentMethodsSectionProps {
    paymentMethods: any[];
    newPaymentMethod: string;
    setNewPaymentMethod: (s: string) => void;
    onSave: () => void;
    onDelete: (id: string) => void;
}

const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({
    paymentMethods, newPaymentMethod, setNewPaymentMethod, onSave, onDelete
}) => {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in">
            <h3 className="text-xl font-bold text-white border-b border-surface-border pb-4 uppercase tracking-wider">Tipos de Pagamento</h3>

            <div className="bg-[#111a22] p-6 rounded-xl border border-surface-border flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="pay_name" className="text-xs text-slate-400 font-bold uppercase">Novo Tipo de Pagamento</label>
                    <div className="flex gap-2">
                        <input
                            id="pay_name"
                            type="text"
                            value={newPaymentMethod}
                            onChange={e => setNewPaymentMethod(e.target.value)}
                            placeholder="Ex: Pix, Cartão, Dinheiro..."
                            className="flex-1 bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                        <button onClick={onSave} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded font-bold text-sm shadow-lg">Adicionar</button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {paymentMethods.map(pm => (
                    <div key={pm.id} className="bg-[#111a22] border border-surface-border px-4 py-2 rounded-full flex items-center gap-3 group">
                        <span className="text-sm font-bold text-white">{pm.name}</span>
                        <button onClick={() => onDelete(pm.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentMethodsSection;
