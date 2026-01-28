
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { useToast } from '../context/ToastContext';

interface SupportModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ user, isOpen, onClose }) => {
    const [message, setMessage] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { addToast } = useToast();

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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from('support_requests').insert({
                user_id: user.id,
                name: user.name,
                email: user.email,
                phone: phone,
                message: message
            });

            if (error) throw error;

            // Notificar Administradores e Operadores
            const { data: adminUsers } = await supabase
                .from('users')
                .select('id')
                .in('role', ['Administrador', 'Operador']);

            if (adminUsers && adminUsers.length > 0) {
                const notifications = adminUsers.map(admin => ({
                    user_id: admin.id,
                    title: 'Novo Ticket de Suporte',
                    message: `${user.name} enviou uma nova mensagem de suporte.`,
                    type: 'info'
                }));
                await supabase.from('notifications').insert(notifications);
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setMessage('');
                setPhone('');
            }, 3000);
        } catch (err: any) {
            addToast(`Erro ao enviar mensagem: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1e293b] border border-[#334155] w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">support_agent</span>
                            Suporte Técnico
                        </h3>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {success ? (
                        <div className="py-12 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-5xl">check_circle</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Mensagem Enviada!</h4>
                            <p className="text-slate-400">Nossa equipe entrará em contato com você em breve.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Olá {user.name.split(' ')[0]}, descreva como podemos te ajudar e confirme seus contatos para que possamos retornar.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="support-email" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                                    <input
                                        id="support-email"
                                        type="email"
                                        disabled
                                        className="w-full bg-[#0f172a]/50 border border-[#334155] text-slate-500 text-sm rounded-xl p-3 outline-none opacity-70 cursor-not-allowed"
                                        value={user.email || ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="support-phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                    <input
                                        id="support-phone"
                                        type="text"
                                        required
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white text-sm rounded-xl p-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                        placeholder="(00) 0 0000-0000"
                                        value={phone}
                                        onChange={e => setPhone(formatPhone(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="support-message" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Sua Mensagem</label>
                                <textarea
                                    id="support-message"
                                    required
                                    rows={4}
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white text-sm rounded-xl p-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none"
                                    placeholder="Explique detalhadamente sua dúvida ou solicitação..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Enviar Solicitação
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportModal;
