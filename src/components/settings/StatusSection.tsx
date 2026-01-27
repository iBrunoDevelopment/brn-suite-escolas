import React from 'react';

const StatusSection: React.FC = () => {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in">
            <h3 className="text-xl font-bold text-white border-b border-surface-border pb-4 uppercase tracking-wider">Status de Movimentação</h3>
            <p className="text-slate-400 text-sm italic">Estes são os status padrão do sistema para controle do fluxo financeiro.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { s: 'Pendente', d: 'Lançamento registrado, mas ainda não concluído financialmente.' },
                    { s: 'Pago', d: 'Saída de recurso confirmada com documento ou comprovante.' },
                    { s: 'Recebido', d: 'Entrada de recurso confirmada na conta.' },
                    { s: 'Agendado', d: 'Lançamento programado para uma data futura.' },
                    { s: 'Conciliado', d: 'Lançamento verificado contra o extrato bancário.' },
                    { s: 'Estornado', d: 'Lançamento cancelado com reversão de valores.' }
                ].map(item => (
                    <div key={item.s} className="bg-[#111a22] p-4 rounded-xl border border-surface-border flex flex-col gap-1">
                        <span className="text-primary font-black uppercase text-xs">{item.s}</span>
                        <span className="text-slate-400 text-xs">{item.d}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusSection;
