import React, { useState, useEffect } from 'react';
import { User, UserRole, School, Permission, RolePermission } from '../types';
import { supabase } from '../lib/supabaseClient';

interface UsersProps {
    user: User;
}

interface UserForm {
    id?: string;
    name: string;
    email: string;
    role: UserRole;
    schoolId?: string;
    gee?: string;
    assignedSchools?: string[];
    active: boolean;
    avatar_url?: string;
}

const Users: React.FC<UsersProps> = ({ user }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserForm | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
    const [isLoadingPerms, setIsLoadingPerms] = useState(false);

    // Verificar se o usuário é admin
    if (user.role !== UserRole.ADMIN) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-red-500 mb-4">block</span>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        Acesso Negado
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Apenas administradores podem acessar esta página.
                    </p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        fetchUsers();
        fetchSchools();
        fetchRolePermissions();
    }, []);

    const fetchRolePermissions = async () => {
        try {
            setIsLoadingPerms(true);
            const { data, error } = await supabase.from('role_permissions').select('*');
            if (error) throw error;
            setRolePermissions(data || []);
        } catch (error) {
            console.error('Erro ao buscar permissões:', error);
        } finally {
            setIsLoadingPerms(false);
        }
    };

    const handleTogglePermission = async (role: UserRole, resource: RolePermission['resource'], field: keyof Permission) => {
        const dbField = field === 'canView' ? 'can_view' :
            field === 'canCreate' ? 'can_create' :
                field === 'canEdit' ? 'can_edit' : 'can_delete';

        const existing = rolePermissions.find(rp => rp.role === role && rp.resource === resource);
        const newValue = existing ? !(existing as any)[dbField] : true;

        try {
            if (existing) {
                const { error } = await supabase
                    .from('role_permissions')
                    .update({ [dbField]: newValue })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('role_permissions')
                    .insert([{
                        role,
                        resource,
                        [dbField]: newValue
                    }]);
                if (error) throw error;
            }

            // Atualizar localmente
            setRolePermissions(prev => {
                const isNew = !prev.find(rp => rp.role === role && rp.resource === resource);
                if (isNew) {
                    fetchRolePermissions();
                    return prev;
                }
                return prev.map(rp => (rp.role === role && rp.resource === resource) ? { ...rp, [dbField]: newValue } : rp);
            });
        } catch (error) {
            console.error('Erro ao salvar permissão:', error);
            alert('Erro ao sincronizar permissão com o servidor.');
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name');

            if (error) throw error;

            setUsers(data.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role as UserRole,
                schoolId: u.school_id,
                assignedSchools: u.assigned_schools,
                active: u.active ?? true,
                gee: u.gee,
                avatar_url: u.avatar_url
            })));
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            alert('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchools = async () => {
        try {
            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .order('name');

            if (error) throw error;
            setSchools(data);
        } catch (error) {
            console.error('Erro ao carregar escolas:', error);
        }
    };

    const handleCreate = () => {
        setEditingUser({
            name: '',
            email: '',
            role: UserRole.DIRETOR,
            active: true,
            assignedSchools: []
        });
        setShowModal(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser({
            id: user.id,
            name: user.name,
            email: user.email || '',
            role: user.role,
            schoolId: user.schoolId,
            gee: user.gee,
            assignedSchools: user.assignedSchools || [],
            active: user.active ?? true,
            avatar_url: user.avatar_url
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!editingUser) return;

        if (!editingUser.name.trim() || !editingUser.email.trim()) {
            alert('Nome e Email são obrigatórios');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editingUser.email)) {
            alert('Email inválido');
            return;
        }

        if ((editingUser.role === UserRole.DIRETOR || editingUser.role === UserRole.CLIENTE) && !editingUser.schoolId) {
            alert('Diretores e Clientes devem ter uma escola vinculada');
            return;
        }

        try {
            const userData = {
                name: editingUser.name.trim(),
                email: editingUser.email.trim().toLowerCase(),
                role: editingUser.role,
                school_id: (editingUser.role === UserRole.DIRETOR || editingUser.role === UserRole.CLIENTE) ? editingUser.schoolId : null,
                gee: editingUser.role === UserRole.TECNICO_GEE ? editingUser.gee : null,
                assigned_schools: editingUser.role === UserRole.TECNICO_GEE ? editingUser.assignedSchools : null,
                active: editingUser.active,
                avatar_url: editingUser.avatar_url
            };

            if (editingUser.id) {
                const { error } = await supabase.from('users').update(userData).eq('id', editingUser.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('users').insert([userData]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            console.error('Erro ao salvar usuário:', error);
            alert('Erro ao salvar usuário: ' + error.message);
        }
    };

    const handleDelete = async (userId: string) => {
        if (userId === user.id) {
            alert('Você não pode excluir sua própria conta.');
            return;
        }
        if (!confirm('Deseja excluir este usuário?')) return;

        try {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw error;
            fetchUsers();
        } catch (error: any) {
            console.error('Erro ao excluir usuário:', error);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        if (userId === user.id) return;
        const newStatus = !currentStatus;
        try {
            const { error } = await supabase.from('users').update({ active: newStatus }).eq('id', userId);
            if (error) throw error;
            fetchUsers();
        } catch (error: any) {
            console.error('Erro ao alterar status:', error);
        }
    };

    const handleAssignedSchoolsChange = (schoolId: string, checked: boolean) => {
        if (!editingUser) return;
        const currentSchools = editingUser.assignedSchools || [];
        const newSchools = checked ? [...currentSchools, schoolId] : currentSchools.filter(id => id !== schoolId);
        setEditingUser({ ...editingUser, assignedSchools: newSchools });
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || u.role === filterRole;
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && u.active) || (filterStatus === 'inactive' && !u.active);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const geeList = Array.from(new Set(schools.map(s => s.gee).filter(Boolean))) as string[];
    const schoolsByGee = editingUser?.gee ? schools.filter(s => s.gee === editingUser.gee) : [];

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
            case UserRole.OPERADOR: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            case UserRole.DIRETOR: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
            case UserRole.TECNICO_GEE: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
            case UserRole.CLIENTE: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading || isLoadingPerms) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">manage_accounts</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Usuários e Acessos</h1>
                        <p className="text-sm text-slate-500">Gestão centralizada de permissões e colaboradores</p>
                    </div>
                </div>
                {activeTab === 'users' && (
                    <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                        <span className="material-symbols-outlined">person_add</span>
                        Novo Usuário
                    </button>
                )}
            </div>

            <div className="flex bg-white/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 w-fit">
                <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-white' : 'text-slate-500'}`}>
                    Usuários
                </button>
                <button onClick={() => setActiveTab('permissions')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'permissions' ? 'bg-primary text-white' : 'text-slate-500'}`}>
                    Permissões
                </button>
            </div>

            {activeTab === 'users' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50">
                        <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" />
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="input-field">
                            <option value="all">Todos os Cargos</option>
                            {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
                            <option value="all">Todos os Status</option>
                            <option value="active">Ativos</option>
                            <option value="inactive">Inativos</option>
                        </select>
                    </div>

                    <div className="card overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4">Função</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getRoleBadgeColor(u.role)}`}>{u.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleToggleStatus(u.id, u.active)} className={`text-xs font-bold ${u.active ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {u.active ? 'Ativo' : 'Inativo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(u)} className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors">
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="card p-6 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs text-slate-400 uppercase font-black border-b border-slate-100 dark:border-slate-700">
                                <th className="py-4 px-4 w-48">Cargo</th>
                                {['entries', 'schools', 'reports', 'settings', 'users'].map(res => <th key={res} className="py-4 px-4 text-center">{res}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {Object.values(UserRole).map(role => (
                                <tr key={role}>
                                    <td className="py-6 px-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getRoleBadgeColor(role)}`}>{role}</span>
                                    </td>
                                    {(['entries', 'schools', 'reports', 'settings', 'users'] as const).map(resource => {
                                        const perm = rolePermissions.find(rp => rp.role === role && rp.resource === resource);
                                        return (
                                            <td key={resource} className="py-6 px-4">
                                                <div className="flex flex-col gap-1 items-center">
                                                    {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map(f => (
                                                        <label key={f} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={perm ? (f === 'canView' ? perm.can_view : f === 'canCreate' ? perm.can_create : f === 'canEdit' ? perm.can_edit : perm.can_delete) : false}
                                                                onChange={() => handleTogglePermission(role, resource, f)}
                                                                className="w-3 h-3 rounded"
                                                            />
                                                            <span className="text-[9px] font-bold uppercase text-slate-400">{f.replace('can', '')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">close</button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {editingUser.avatar_url ? (
                                            <img src={editingUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-4xl text-slate-300 flex items-center justify-center h-full">person</span>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 transition-all">
                                        <span className="material-symbols-outlined text-sm">{uploading ? 'sync' : 'photo_camera'}</span>
                                        <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                setUploading(true);
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${Math.random()}.${fileExt}`;
                                                const filePath = `avatars/${fileName}`;
                                                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
                                                if (uploadError) throw uploadError;
                                                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                                                setEditingUser({ ...editingUser, avatar_url: publicUrl });
                                            } catch (err) { console.error(err); alert('Erro no upload'); } finally { setUploading(false); }
                                        }} />
                                    </label>
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Foto do Perfil</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Nome</label>
                                    <input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="input-field mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                                    <input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="input-field mt-1" disabled={!!editingUser.id} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Função</label>
                                <select
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({
                                        ...editingUser,
                                        role: e.target.value as UserRole,
                                        schoolId: undefined,
                                        gee: undefined,
                                        assignedSchools: []
                                    })}
                                    className="input-field mt-1"
                                >
                                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </div>

                            {(editingUser.role === UserRole.DIRETOR || editingUser.role === UserRole.CLIENTE) && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Escola Vinculada</label>
                                    <select value={editingUser.schoolId || ''} onChange={e => setEditingUser({ ...editingUser, schoolId: e.target.value })} className="input-field mt-1">
                                        <option value="">Selecione uma escola</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {editingUser.role === UserRole.TECNICO_GEE && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">GEE de Atuação</label>
                                        <select
                                            value={editingUser.gee || ''}
                                            onChange={e => setEditingUser({ ...editingUser, gee: e.target.value, assignedSchools: [] })}
                                            className="input-field mt-1"
                                        >
                                            <option value="">Selecione a Regional (GEE)</option>
                                            {geeList.map(gee => <option key={gee} value={gee}>{gee}</option>)}
                                        </select>
                                    </div>

                                    {editingUser.gee && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Escolas sob Supervisão</label>
                                            <div className="mt-2 grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                                {schoolsByGee.map(s => (
                                                    <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingUser.assignedSchools?.includes(s.id)}
                                                            onChange={e => handleAssignedSchoolsChange(s.id, e.target.checked)}
                                                            className="rounded border-slate-300"
                                                        />
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary">{s.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500">Cancelar</button>
                            <button onClick={handleSave} className="btn-primary px-8">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
