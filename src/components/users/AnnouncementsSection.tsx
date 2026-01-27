import React from 'react';
import { UserRole } from '../../types';

interface AnnouncementsSectionProps {
    announcement: { title: string; message: string; target: UserRole | 'all' };
    setAnnouncement: (a: any) => void;
    sendingNotice: boolean;
    onSend: () => void;
}

const AnnouncementsSection: React.FC<AnnouncementsSectionProps> = ({ announcement, setAnnouncement, sendingNotice, onSend }) => {
    return (
        <div className="card max-w-2xl mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-primary/5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-4xl">campaign</span></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Enviar Comunicado Geral</h3>
                        <p className="text-xs text-slate-500 mt-1 italic">Este aviso aparecerá instantaneamente nas notificações dos usuários selecionados.</p>
                    </div>
                </div>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2">
                    <label htmlFor="ann-target" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Público-Alvo</label>
                    <select id="ann-target" value={announcement.target} onChange={e => setAnnouncement({ ...announcement, target: e.target.value as any })} className="input-field">
                        <option value="all">Todos os Usuários</option>
                        {Object.values(UserRole).map(role => <option key={role} value={role}>{role}s</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="ann-title" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Título do Aviso</label>
                    <input id="ann-title" type="text" placeholder="Ex: Manutenção agendada ou Prazo de entrega" value={announcement.title} onChange={e => setAnnouncement({ ...announcement, title: e.target.value })} className="input-field" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="ann-msg" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mensagem do Comunicado</label>
                    <textarea id="ann-msg" rows={6} placeholder="Escreva aqui os detalhes do aviso aos diretores e funcionários..." value={announcement.message} onChange={e => setAnnouncement({ ...announcement, message: e.target.value })} className="input-field py-4 min-h-[150px]" />
                </div>
                <div className="pt-4 flex justify-end">
                    <button onClick={onSend} disabled={sendingNotice} className="bg-primary hover:bg-primary-hover text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                        {sendingNotice ? <><span className="material-symbols-outlined animate-spin">sync</span> Enviando...</> : <><span className="material-symbols-outlined">send</span> Disparar Comunicado</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementsSection;
