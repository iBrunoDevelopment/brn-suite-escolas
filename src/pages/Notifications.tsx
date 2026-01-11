
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Notification } from '../types';

const Notifications: React.FC<{ user: User }> = ({ user }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'success': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'warning': return 'warning';
            case 'error': return 'error';
            default: return 'info';
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">notifications</span>
                        </span>
                        Central de Alertas
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 italic">Notificações e avisos preventivos do seu sistema.</p>
                </div>

                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={markAllAsRead}
                        className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="animate-pulse flex flex-col gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-surface-dark border border-surface-border rounded-2xl"></div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-surface-dark border border-dashed border-slate-700 rounded-3xl py-16 flex flex-col items-center justify-center text-slate-500 gap-4">
                        <span className="material-symbols-outlined text-5xl opacity-20">notifications_off</span>
                        <p className="font-medium italic">Você não possui notificações no momento.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            className={`p-5 rounded-2xl border transition-all flex items-start gap-4 group ${n.is_read ? 'bg-surface-dark/50 border-surface-border grayscale-[0.5]' : 'bg-[#1e293b] border-blue-500/30 shadow-lg shadow-blue-500/5'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTypeStyles(n.type)}`}>
                                <span className="material-symbols-outlined text-[20px]">{getTypeIcon(n.type)}</span>
                            </div>

                            <div className="flex-1 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={`text-sm font-bold ${n.is_read ? 'text-slate-300' : 'text-white'}`}>{n.title}</h4>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(n.created_at).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>

                                <div className="flex items-center gap-4 mt-3">
                                    {!n.is_read && (
                                        <button
                                            onClick={() => markAsRead(n.id)}
                                            className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest transition-colors flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">done_all</span>
                                            Marcar como lida
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(n.id)}
                                        className="text-[10px] font-black uppercase text-red-400/60 hover:text-red-400 tracking-widest transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
