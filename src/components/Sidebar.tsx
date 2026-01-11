
import React from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

interface SidebarProps {
    user: User | null;
    activePage: string;
    onPageChange: (page: string) => void;
    onLogout: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activePage, onPageChange, onLogout, isCollapsed, onToggleCollapse }) => {
    const [counts, setCounts] = React.useState({ notifications: 0, pendingUsers: 0 });

    React.useEffect(() => {
        if (user) {
            fetchCounts();
            const interval = setInterval(fetchCounts, 30000); // 30s
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchCounts = async () => {
        if (!user) return;

        try {
            const [notifRes, userRes] = await Promise.all([
                supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
                user.role === UserRole.ADMIN
                    ? supabase.from('users').select('id', { count: 'exact', head: true }).or('active.eq.false,and(role.eq.Cliente,school_id.is.null)')
                    : { count: 0 }
            ]);

            setCounts({
                notifications: notifRes.count || 0,
                pendingUsers: userRes.count || 0
            });
        } catch (e) {
            console.error("Error fetching sidebar counts:", e);
        }
    };

    const getNavGroups = () => {
        if (!user) return [];

        const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.OPERADOR;
        const hasAssignedSchools = user.assignedSchools && user.assignedSchools.length > 0;
        const isAuthorized = isStaff || user.schoolId || hasAssignedSchools;
        const isWaiting = user.active === false || !isAuthorized;
        if (isWaiting) return [];

        const groups = [
            {
                title: 'Operações',
                items: [
                    { id: 'dashboard', label: 'Visão Geral', icon: 'dashboard', roles: [] },
                    { id: 'entries', label: 'Lançamentos', icon: 'receipt_long', roles: [] },
                    { id: 'reports', label: 'Prestação de Contas', icon: 'description', roles: [] },
                    { id: 'reconciliation', label: 'Conciliação Bancária', icon: 'account_balance', roles: [UserRole.ADMIN, UserRole.OPERADOR] },
                    { id: 'vault', label: 'Cofre Docs', icon: 'folder_managed', roles: [UserRole.ADMIN, UserRole.OPERADOR, UserRole.TECNICO_GEE] },
                ]
            },
            {
                title: 'Gestão',
                items: [
                    { id: 'schools', label: 'Escolas', icon: 'school', roles: [UserRole.ADMIN, UserRole.OPERADOR, UserRole.TECNICO_GEE] },
                    { id: 'gee', label: 'Regionais (GEE)', icon: 'map', roles: [UserRole.ADMIN] },
                    { id: 'users', label: 'Usuários', icon: 'group', roles: [UserRole.ADMIN] },
                ]
            },
            {
                title: 'Suporte',
                items: [
                    { id: 'notifications', label: 'Notificações', icon: 'notifications', roles: [] },
                    { id: 'settings', label: 'Configurações', icon: 'settings', roles: [] },
                    { id: 'help', label: 'Ajuda', icon: 'help', roles: [] },
                ]
            }
        ];

        return groups.map(group => ({
            ...group,
            items: group.items.filter(item => {
                if (item.roles.length === 0) return true;
                return item.roles.includes(user.role);
            })
        })).filter(group => group.items.length > 0);
    };

    const navGroups = getNavGroups();

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#0f172a] border-r border-[#1e293b] flex flex-col transition-all duration-500 ease-in-out relative group/sidebar shadow-2xl z-[60]`}>
            {/* Toggle Button */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-20 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-50 border-2 border-[#0f172a]"
            >
                <span className="material-symbols-outlined text-xs font-bold leading-none">
                    {isCollapsed ? 'chevron_right' : 'chevron_left'}
                </span>
            </button>

            {/* Header / Logo */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-[#1e293b]/50 overflow-hidden`}>
                <div className="flex items-center gap-2 text-primary font-black text-2xl tracking-tighter shrink-0">
                    <span className="material-symbols-outlined text-3xl">account_balance</span>
                    {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2">BRN <span className="text-white">Suite</span></span>}
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto py-6 ${isCollapsed ? 'px-2' : 'px-4'} flex flex-col gap-6 scrollbar-hide`}>
                {navGroups.map((group, gIdx) => (
                    <div key={gIdx} className="flex flex-col gap-1.5">
                        {!isCollapsed && (
                            <h5 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 animate-in fade-in duration-500">
                                {group.title}
                            </h5>
                        )}
                        {group.items.map(item => {
                            const hasBadge = (item.id === 'notifications' && counts.notifications > 0) || (item.id === 'users' && counts.pendingUsers > 0);
                            const badgeCount = item.id === 'notifications' ? counts.notifications : counts.pendingUsers;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onPageChange(item.id)}
                                    title={isCollapsed ? item.label : ''}
                                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-bold transition-all duration-300 group/item relative ${activePage === item.id
                                        ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[22px] shrink-0 ${activePage === item.id ? 'text-white' : 'text-slate-500 group-hover/item:text-primary transition-colors'}`}>
                                        {item.icon}
                                    </span>
                                    {!isCollapsed && <span className="truncate animate-in fade-in slide-in-from-left-1">{item.label}</span>}

                                    {/* Badge */}
                                    {hasBadge && (
                                        <span className={`absolute ${isCollapsed ? '-top-1 -right-1' : 'right-3'} flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-[#0f172a] shadow-lg animate-bounce`}>
                                            {badgeCount > 9 ? '9+' : badgeCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* User Info / Footer Slim */}
            <div className={`p-4 border-t border-[#1e293b] bg-surface-dark/30 overflow-hidden`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 p-2'} mb-3`}>
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} className="w-8 h-8 rounded-lg object-cover border border-primary/20 shrink-0" alt="" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-black shrink-0">
                            {user?.name?.charAt(0)}
                        </div>
                    )}
                    {!isCollapsed && (
                        <div className="overflow-hidden animate-in fade-in">
                            <h4 className="text-xs font-bold text-white truncate">{user?.name}</h4>
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{user?.role}</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={onLogout}
                    title={isCollapsed ? 'Sair' : ''}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-xs font-bold w-full`}
                >
                    <span className="material-symbols-outlined text-lg shrink-0">logout</span>
                    {!isCollapsed && <span className="animate-in fade-in">Sair do Sistema</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
