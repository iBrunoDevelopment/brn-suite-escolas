
import React from 'react';
import { User, UserRole } from '../types';

interface SidebarProps {
    user: User | null;
    activePage: string;
    onPageChange: (page: string) => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activePage, onPageChange, onLogout }) => {
    const getNavItems = () => {
        const items = [
            { id: 'dashboard', label: 'Visão Geral', icon: 'dashboard', roles: [] },
            { id: 'entries', label: 'Lançamentos', icon: 'receipt_long', roles: [] },
            { id: 'schools', label: 'Escolas', icon: 'school', roles: [UserRole.ADMIN, UserRole.OPERADOR, UserRole.TECNICO_GEE, UserRole.DIRETOR] },
            { id: 'users', label: 'Usuários', icon: 'group', roles: [UserRole.ADMIN] },
            { id: 'reports', label: 'Prestação de Contas', icon: 'description', roles: [] },
            { id: 'vault', label: 'Cofre de Documentos', icon: 'folder_managed', roles: [UserRole.ADMIN, UserRole.OPERADOR, UserRole.TECNICO_GEE] },
            { id: 'reconciliation', label: 'Conciliação Bancária', icon: 'account_balance', roles: [UserRole.ADMIN, UserRole.OPERADOR] },
            { id: 'notifications', label: 'Notificações', icon: 'notifications', roles: [] },
            { id: 'settings', label: 'Configurações', icon: 'settings', roles: [] },
            { id: 'help', label: 'Ajuda', icon: 'help', roles: [] },
        ];

        if (!user) return [];

        return items.filter(item => {
            if (item.roles.length === 0) return true;
            return item.roles.includes(user.role);
        });
    };

    const menuItems = getNavItems();

    return (
        <aside className="w-64 bg-background-dark border-r border-[#1e293b] flex flex-col transition-all duration-300">
            {/* Header / Logo */}
            <div className="h-16 flex items-center px-6 border-b border-[#1e293b]">
                <div className="flex items-center gap-2 text-primary font-black text-xl tracking-tight">
                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                    <span>BRN Suite</span>
                </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-[#1e293b]/50">
                <div className="bg-[#1e293b]/50 rounded-lg p-3 flex items-center gap-3">
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-white truncate">{user?.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{user?.role}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onPageChange(item.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${activePage === item.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className={`material-symbols-outlined text-xl ${activePage === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>
                            {item.icon}
                        </span>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-[#1e293b] mt-auto">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Sair do Sistema
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
