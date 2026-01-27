import React from 'react';

interface SupportContactsSectionProps {
    supportContacts: any;
    setSupportContacts: (data: any) => void;
    loadingContacts: boolean;
    savingContacts: boolean;
    onSave: () => void;
}

const SupportContactsSection: React.FC<SupportContactsSectionProps> = ({
    supportContacts, setSupportContacts, loadingContacts, savingContacts, onSave
}) => {
    const formatPhone = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length <= 10) {
            return cleanValue
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .slice(0, 14);
        }
        return cleanValue
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{1})(\d{4})(\d)/, '$1 $2-$3')
            .slice(0, 16);
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in">
            <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-3xl">contact_support</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-wider uppercase">Contatos Globais</h3>
                    <p className="text-slate-400 text-sm italic">Estes contatos serão exibidos para todos os usuários na página de Ajuda e Suporte.</p>
                </div>
            </div>

            {loadingContacts ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sup_cont_email" className="text-xs text-slate-400 font-bold uppercase">E-mail de Suporte</label>
                        <input
                            id="sup_cont_email"
                            type="email"
                            value={supportContacts.email}
                            onChange={e => setSupportContacts({ ...supportContacts, email: e.target.value })}
                            placeholder="contato@empresa.com"
                            className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sup_cont_phone" className="text-xs text-slate-400 font-bold uppercase">Telefone de Contato</label>
                        <input
                            id="sup_cont_phone"
                            type="text"
                            value={supportContacts.phone}
                            onChange={e => setSupportContacts({ ...supportContacts, phone: formatPhone(e.target.value) })}
                            placeholder="(00) 0 0000-0000"
                            className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                            maxLength={16}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sup_cont_wa" className="text-xs text-slate-400 font-bold uppercase">WhatsApp</label>
                        <input
                            id="sup_cont_wa"
                            type="text"
                            value={supportContacts.whatsapp}
                            onChange={e => setSupportContacts({ ...supportContacts, whatsapp: formatPhone(e.target.value) })}
                            placeholder="(00) 0 0000-0000"
                            className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                            maxLength={16}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sup_cont_ig" className="text-xs text-slate-400 font-bold uppercase">Instagram</label>
                        <input
                            id="sup_cont_ig"
                            type="text"
                            value={supportContacts.instagram}
                            onChange={e => setSupportContacts({ ...supportContacts, instagram: e.target.value })}
                            placeholder="@seunome"
                            className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                        />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1">
                        <label htmlFor="sup_cont_site" className="text-xs text-slate-400 font-bold uppercase">Site Oficial</label>
                        <input
                            id="sup_cont_site"
                            type="text"
                            value={supportContacts.website}
                            onChange={e => setSupportContacts({ ...supportContacts, website: e.target.value })}
                            placeholder="www.empresa.com.br"
                            className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                        />
                    </div>

                    <div className="md:col-span-2 flex justify-end pt-4">
                        <button
                            onClick={onSave}
                            disabled={savingContacts}
                            className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">{savingContacts ? 'sync' : 'save'}</span>
                            {savingContacts ? 'Salvando...' : 'Salvar Contatos Globais'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportContactsSection;
