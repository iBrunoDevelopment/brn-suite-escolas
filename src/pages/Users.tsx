import React, { useState, useEffect } from 'react';
import { User, UserRole, School, Permission, RolePermission } from '../types';
import { supabase } from '../lib/supabaseClient';

interface UsersProps {
    user: User;
}

interface SupportRequest {
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    status: 'Pendente' | 'Em Atendimento' | 'Resolvido';
    created_at: string;
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
    const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'permissions' | 'support' | 'announcements' | 'closure'>('users');
    const [announcement, setAnnouncement] = useState({ title: '', message: '', target: 'all' as UserRole | 'all' });
    const [sendingNotice, setSendingNotice] = useState(false);
    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
    const [isLoadingPerms, setIsLoadingPerms] = useState(false);
    const [closureSummary, setClosureSummary] = useState<any[]>([]);
    const [isCalculatingClosure, setIsCalculatingClosure] = useState(false);
    const [closurePeriodName, setClosurePeriodName] = useState('');

    // Suporte e Aprovações
    const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
    const [counts, setCounts] = useState({ pendingUsers: 0, pendingSupport: 0 });

    if (user.role !== UserRole.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <span className="material-symbols-outlined text-6xl opacity-20">lock</span>
                <p className="text-xl font-bold">Acesso Restrito</p>
                <p className="text-sm">Apenas administradores podem gerenciar usuários e aprovações.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchData();
        fetchSchools();
        fetchRolePermissions();
    }, []);

    useEffect(() => {
        if (activeTab === 'closure') fetchClosureData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchSupportRequests()]);
        setLoading(false);
    };

    const fetchSupportRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('support_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSupportRequests(data || []);
            setCounts(prev => ({ ...prev, pendingSupport: data?.filter(r => r.status === 'Pendente').length || 0 }));
        } catch (error) {
            console.error('Erro ao buscar suporte:', error);
        }
    };

    const handleSupportStatus = async (id: string, status: SupportRequest['status']) => {
        try {
            const { error } = await supabase
                .from('support_requests')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            setSupportRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            // Recalcular contagem
            const newRequests = supportRequests.map(r => r.id === id ? { ...r, status } : r);
            setCounts(prev => ({ ...prev, pendingSupport: newRequests.filter(r => r.status === 'Pendente').length || 0 }));
        } catch (error) {
            console.error('Erro ao atualizar suporte:', error);
        }
    };

    const fetchRolePermissions = async () => {
        setIsLoadingPerms(true);
        try {
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*')
                .order('role', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                // Auto-populate defaults if empty
                const defaults = [
                    // ADMINISTRADOR
                    { role: 'Administrador', resource: 'entries', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Administrador', resource: 'schools', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Administrador', resource: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Administrador', resource: 'settings', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Administrador', resource: 'users', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    // OPERADOR
                    { role: 'Operador', resource: 'entries', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Operador', resource: 'schools', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Operador', resource: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Operador', resource: 'settings', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Operador', resource: 'users', can_view: true, can_create: true, can_edit: true, can_delete: false },
                    // DIRETOR
                    { role: 'Diretor', resource: 'entries', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Diretor', resource: 'schools', can_view: true, can_create: false, can_edit: true, can_delete: false },
                    { role: 'Diretor', resource: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
                    { role: 'Diretor', resource: 'settings', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Diretor', resource: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false },
                    // TÉCNICO GEE
                    { role: 'Técnico GEE', resource: 'entries', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Técnico GEE', resource: 'schools', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Técnico GEE', resource: 'reports', can_view: true, can_create: false, can_edit: true, can_delete: false },
                    { role: 'Técnico GEE', resource: 'settings', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Técnico GEE', resource: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false },
                    // CLIENTE
                    { role: 'Cliente', resource: 'entries', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Cliente', resource: 'schools', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Cliente', resource: 'reports', can_view: true, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Cliente', resource: 'settings', can_view: false, can_create: false, can_edit: false, can_delete: false },
                    { role: 'Cliente', resource: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false },
                ];

                const { data: newData, error: insertError } = await supabase
                    .from('role_permissions')
                    .upsert(defaults, { onConflict: 'role, resource' })
                    .select();

                if (insertError) throw insertError;
                setRolePermissions(newData || []);
            } else {
                setRolePermissions(data);
            }
        } catch (error: any) {
            console.error('Erro ao buscar/criar permissões:', error);
            if (error.code === '42501' || error.message?.includes('policy')) {
                alert('Erro de Permissão (RLS): Não foi possível sincronizar as permissões iniciais. Execute o script "db_fix_permissions_rls.sql" no banco de dados.');
            }
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

    const handleSendAnnouncement = async () => {
        if (!announcement.title || !announcement.message) {
            alert('Preencha o título e a mensagem do comunicado.');
            return;
        }

        setSendingNotice(true);
        try {
            let targetUsers = users;
            if (announcement.target !== 'all') {
                targetUsers = users.filter(u => u.role === announcement.target);
            }

            const notifications = targetUsers.map(u => ({
                user_id: u.id,
                title: announcement.title,
                message: announcement.message,
                type: 'info'
            }));

            const { error } = await supabase.from('notifications').insert(notifications);
            if (error) throw error;

            alert(`Comunicado enviado com sucesso para ${targetUsers.length} usuários!`);
            setAnnouncement({ title: '', message: '', target: 'all' });
        } catch (error: any) {
            alert('Erro ao enviar comunicado: ' + error.message);
        } finally {
            setSendingNotice(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name');

            if (error) throw error;

            const mappedUsers = data.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role as UserRole,
                schoolId: u.school_id,
                assignedSchools: u.assigned_schools,
                active: u.active ?? true,
                gee: u.gee,
                avatar_url: u.avatar_url
            }));
            setUsers(mappedUsers);

            const pending = mappedUsers.filter(u => u.active === false || (u.role === UserRole.CLIENTE && !u.schoolId)).length;
            setCounts(prev => ({ ...prev, pendingUsers: pending }));
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
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
            role: UserRole.CLIENTE,
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

    const handleSelectAllSchools = () => {
        if (!editingUser || !editingUser.gee) return;
        const allGeeSchoolIds = schoolsByGee.map(s => s.id);
        const currentAssigned = editingUser.assignedSchools || [];

        const allSelected = allGeeSchoolIds.every(id => currentAssigned.includes(id));

        if (allSelected) {
            setEditingUser({
                ...editingUser,
                assignedSchools: currentAssigned.filter(id => !allGeeSchoolIds.includes(id))
            });
        } else {
            const others = currentAssigned.filter(id => !allGeeSchoolIds.includes(id));
            setEditingUser({
                ...editingUser,
                assignedSchools: [...others, ...allGeeSchoolIds]
            });
        }
    };

    const fetchClosureData = async () => {
        setIsCalculatingClosure(true);
        try {
            const [entriesRes, reprogRes] = await Promise.all([
                supabase.from('financial_entries').select('school_id, program_id, value, type'),
                supabase.from('reprogrammed_balances').select('school_id, program_id, value')
            ]);

            const entries = entriesRes.data || [];
            const reprogs = reprogRes.data || [];

            const map = new Map();

            reprogs.forEach(r => {
                const key = `${r.school_id}-${r.program_id}`;
                if (!map.has(key)) map.set(key, { school_id: r.school_id, program_id: r.program_id, balance: 0 });
                map.get(key).balance += Number(r.value);
            });

            entries.forEach(e => {
                const key = `${e.school_id}-${e.program_id}`;
                if (!map.has(key)) map.set(key, { school_id: e.school_id, program_id: e.program_id, balance: 0 });
                const val = Number(e.value);
                if (e.type === 'Entrada') map.get(key).balance += val;
                else map.get(key).balance -= val;
            });

            setClosureSummary(Array.from(map.values()));
        } catch (error) {
            console.error('Erro ao calcular encerramento:', error);
        } finally {
            setIsCalculatingClosure(false);
        }
    };

    const handleExecuteClosure = async () => {
        if (!closurePeriodName.trim()) {
            alert('Informe o nome do novo período (ex: 2026/1)');
            return;
        }

        if (!confirm(`Deseja realizar o encerramento do exercício atual? Todos os saldos positivos serão reprogramados para "${closurePeriodName}".`)) return;

        setIsCalculatingClosure(true);
        try {
            const inserts = closureSummary
                .filter(c => c.balance > 0)
                .map(c => ({
                    school_id: c.school_id,
                    program_id: c.program_id,
                    period: closurePeriodName,
                    value: c.balance,
                    nature: 'Custeio'
                }));

            if (inserts.length > 0) {
                const { error } = await supabase.from('reprogrammed_balances').insert(inserts);
                if (error) throw error;
            }

            await supabase.from('periods').insert([{ name: closurePeriodName, is_active: true }]);

            alert('Encerramento realizado com sucesso!');
            setClosurePeriodName('');
            fetchClosureData();
        } catch (error: any) {
            alert('Erro no encerramento: ' + error.message);
        } finally {
            setIsCalculatingClosure(false);
        }
    };

    const handleResetPermissions = async () => {
        if (!confirm('Deseja redefinir todas as permissões para os padrões do sistema? Isso substituirá as configurações atuais.')) return;

        setIsLoadingPerms(true);
        try {
            const defaults = [
                { role: 'Administrador', resource: 'entries', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Administrador', resource: 'schools', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Administrador', resource: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Administrador', resource: 'settings', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Administrador', resource: 'users', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Operador', resource: 'entries', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Operador', resource: 'schools', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Operador', resource: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Operador', resource: 'settings', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Operador', resource: 'users', can_view: true, can_create: true, can_edit: true, can_delete: false },
                { role: 'Diretor', resource: 'entries', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Diretor', resource: 'schools', can_view: true, can_create: false, can_edit: true, can_delete: false },
                { role: 'Diretor', resource: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
                { role: 'Diretor', resource: 'settings', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Diretor', resource: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false },
                { role: 'Técnico GEE', resource: 'entries', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Técnico GEE', resource: 'schools', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Técnico GEE', resource: 'reports', can_view: true, can_create: false, can_edit: true, can_delete: false },
                { role: 'Técnico GEE', resource: 'settings', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Técnico GEE', resource: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false },
                { role: 'Cliente', resource: 'entries', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Cliente', resource: 'schools', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Cliente', resource: 'reports', can_view: true, can_create: false, can_edit: false, can_delete: false },
                { role: 'Cliente', resource: 'settings', can_view: false, can_create: false, can_edit: false, can_delete: false },
                { role: 'Cliente', resource: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false },
            ];

            const { error } = await supabase.from('role_permissions').upsert(defaults, { onConflict: 'role, resource' });
            if (error) throw error;

            alert('Permissões restauradas com sucesso!');
            fetchRolePermissions();
        } catch (error: any) {
            console.error('Erro ao resetar permissões:', error);
            alert('Erro ao resetar: ' + error.message);
        } finally {
            setIsLoadingPerms(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || u.role === filterRole;
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && u.active) || (filterStatus === 'inactive' && !u.active);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const pendingApprovals = users.filter(u => u.active === false || (u.role === UserRole.CLIENTE && !u.schoolId));

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
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Centro de Gestão</h1>
                        <p className="text-sm text-slate-500">Administração de usuários, permissões e suporte</p>
                    </div>
                </div>
                {activeTab === 'users' && (
                    <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                        <span className="material-symbols-outlined">person_add</span>
                        Novo Usuário
                    </button>
                )}
            </div>

            <div className="flex flex-wrap bg-white/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 w-fit gap-1">
                <button onClick={() => setActiveTab('users')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Colaboradores
                </button>
                <button onClick={() => setActiveTab('approvals')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Aprovações
                    {counts.pendingUsers > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'approvals' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{counts.pendingUsers}</span>}
                </button>
                <button onClick={() => setActiveTab('support')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'support' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Suporte
                    {counts.pendingSupport > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'support' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{counts.pendingSupport}</span>}
                </button>
                <button onClick={() => setActiveTab('permissions')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'permissions' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Permissões
                </button>
                <button onClick={() => setActiveTab('announcements')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'announcements' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                    Comunicados
                </button>
                <button onClick={() => setActiveTab('closure')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'closure' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                    Encerramento
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-6">
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
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
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
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{u.name.charAt(0)}</div>
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
                                                <button onClick={() => handleToggleStatus(u.id, u.active)} className={`text-xs font-bold ${u.active ? 'text-emerald-500' : 'text-rose-500'}`}>{u.active ? 'Ativo' : 'Inativo'}</button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(u)} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><span className="material-symbols-outlined text-sm">edit</span></button>
                                                    <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile List */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-100">
                            {filteredUsers.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 italic">Nenhum resultado encontrado.</div>
                            ) : (
                                filteredUsers.map(u => (
                                    <div key={u.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{u.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold leading-tight">{u.name}</p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEdit(u)} className="p-2 text-primary"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-500"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${getRoleBadgeColor(u.role)}`}>{u.role}</span>
                                            <button onClick={() => handleToggleStatus(u.id, u.active)} className={`text-[11px] font-black uppercase px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg ${u.active ? 'text-emerald-500' : 'text-rose-500'}`}>{u.active ? 'Ativo' : 'Inativo'}</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'approvals' && (
                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-primary/5">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">verified_user</span>
                            Usuários Aguardando Liberação
                        </h3>
                    </div>
                    {pendingApprovals.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">sentiment_satisfied</span>
                            <p>Parabéns! Não há aprovações pendentes.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 uppercase font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Nome / Email</th>
                                            <th className="px-6 py-4">Motivo da Retenção</th>
                                            <th className="px-6 py-4 text-right">Ação Rápida</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {pendingApprovals.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-100">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold">{u.name}</p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {!u.active && <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">lock</span> CONTA INATIVA</span>}
                                                        {u.role === UserRole.CLIENTE && !u.schoolId && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">school</span> SEM ESCOLA VINCULADA</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleEdit(u)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-all flex items-center gap-2 ml-auto">
                                                        <span className="material-symbols-outlined text-xs">how_to_reg</span> VINCULAR E ATIVAR
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Grid */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                                {pendingApprovals.map(u => (
                                    <div key={u.id} className="p-4 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white leading-tight">{u.name}</p>
                                                <p className="text-xs text-slate-400 mt-1">{u.email}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {!u.active && <span className="bg-rose-500/10 text-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter">INATIVA</span>}
                                                {u.role === UserRole.CLIENTE && !u.schoolId && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter">SEM VÍNCULO</span>}
                                            </div>
                                        </div>
                                        <button onClick={() => handleEdit(u)} className="w-full py-3 bg-emerald-500 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/20">
                                            <span className="material-symbols-outlined text-sm">how_to_reg</span> VINCULAR E ATIVAR
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'support' && (
                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-blue-500/5">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">support_agent</span>
                            Solicitações de Suporte (HelpDesk)
                        </h3>
                    </div>
                    {supportRequests.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 text-slate-800 dark:text-slate-100">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">mark_email_read</span>
                            <p>Caixa de entrada vazia.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-700">
                            {supportRequests.map(req => (
                                <div key={req.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all flex flex-col md:flex-row gap-6 text-slate-800 dark:text-slate-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${req.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : req.status === 'Em Atendimento' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                                {req.status}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">{new Date(req.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <h4 className="font-bold flex flex-wrap items-center gap-2">
                                            {req.name} <span className="text-xs font-normal text-slate-500">({req.email})</span>
                                        </h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-2xl italic border border-slate-200/50 dark:border-slate-700/50 leading-relaxed">
                                            "{req.message}"
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-primary font-bold text-xs"><span className="material-symbols-outlined text-xs">call</span> {req.phone}</div>
                                    </div>
                                    <div className="flex flex-row md:flex-col shrink-0 gap-2 items-start md:mt-6">
                                        {req.status !== 'Resolvido' && (
                                            <>
                                                <button onClick={() => handleSupportStatus(req.id, 'Em Atendimento')} className="flex-1 md:flex-none px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-black rounded-lg border border-blue-500/30 uppercase transition-all active:scale-95">ATENDER</button>
                                                <button onClick={() => handleSupportStatus(req.id, 'Resolvido')} className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-500 text-[10px] font-black rounded-lg border border-emerald-500/30 uppercase transition-all active:scale-95">RESOLVER</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={handleResetPermissions} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">restart_alt</span> Restaurar Padrões
                        </button>
                    </div>
                    <div className="card p-6 overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="text-xs text-slate-400 uppercase font-black border-b border-slate-100 dark:border-slate-700">
                                    <th className="py-4 px-4 w-48">Cargo</th>
                                    {['entries', 'schools', 'reports', 'settings', 'users'].map(res => <th key={res} className="py-4 px-4 text-center">{res}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {Object.values(UserRole).map(role => (
                                    <tr key={role}>
                                        <td className="py-6 px-4"><span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getRoleBadgeColor(role)}`}>{role}</span></td>
                                        {(['entries', 'schools', 'reports', 'settings', 'users'] as const).map(resource => {
                                            const perm = rolePermissions.find(rp => rp.role === role && rp.resource === resource);
                                            return (
                                                <td key={resource} className="py-6 px-4">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map(f => (
                                                            <label key={f} className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={perm ? (f === 'canView' ? perm.can_view : f === 'canCreate' ? perm.can_create : f === 'canEdit' ? perm.can_edit : perm.can_delete) : false} onChange={() => handleTogglePermission(role, resource, f)} className="w-3 h-3 rounded" />
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
                </div>
            )}

            {activeTab === 'announcements' && (
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Público-Alvo</label>
                            <select value={announcement.target} onChange={e => setAnnouncement({ ...announcement, target: e.target.value as any })} className="input-field">
                                <option value="all">Todos os Usuários</option>
                                {Object.values(UserRole).map(role => <option key={role} value={role}>{role}s</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Título do Aviso</label>
                            <input type="text" placeholder="Ex: Manutenção agendada ou Prazo de entrega" value={announcement.title} onChange={e => setAnnouncement({ ...announcement, title: e.target.value })} className="input-field" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mensagem do Comunicado</label>
                            <textarea rows={6} placeholder="Escreva aqui os detalhes do aviso aos diretores e funcionários..." value={announcement.message} onChange={e => setAnnouncement({ ...announcement, message: e.target.value })} className="input-field py-4 min-h-[150px]" />
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button onClick={handleSendAnnouncement} disabled={sendingNotice} className="bg-primary hover:bg-primary-hover text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                                {sendingNotice ? <><span className="material-symbols-outlined animate-spin">sync</span> Enviando...</> : <><span className="material-symbols-outlined">send</span> Disparar Comunicado</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'closure' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card pb-8 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-amber-500/5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><span className="material-symbols-outlined text-4xl">event_repeat</span></div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Encerramento de Exercício</h3>
                                        <p className="text-xs text-slate-500 mt-1 italic">Consolide os saldos atuais e inicie um novo semestre.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <input type="text" placeholder="Nome do Novo Período" value={closurePeriodName} onChange={e => setClosurePeriodName(e.target.value)} className="input-field w-full sm:w-64" />
                                    <button onClick={handleExecuteClosure} disabled={isCalculatingClosure || closureSummary.length === 0} className="btn-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 px-8 py-3 flex items-center gap-2 w-full sm:w-auto">
                                        <span className="material-symbols-outlined">key_visualizer</span> Executar Encerramento
                                    </button>
                                </div>
                            </div>
                        </div>
                        {isCalculatingClosure ? (
                            <div className="p-20 text-center"><span className="material-symbols-outlined animate-spin text-4xl text-amber-500">sync</span><p className="text-sm text-slate-500 mt-4">Calculando saldos...</p></div>
                        ) : closureSummary.length === 0 ? (
                            <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest opacity-30"><span className="material-symbols-outlined text-6xl mb-4">info</span><p>Nenhum saldo pendente encontrado.</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead className="bg-[#0f172a] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <tr><th className="px-8 py-4">Escola / Unidade</th><th className="px-8 py-4">Programa</th><th className="px-8 py-4 text-right">Saldo Atual</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-800 dark:text-slate-100">
                                        {closureSummary.map((item, idx) => {
                                            const school = schools.find(s => s.id === item.school_id);
                                            return (
                                                <tr key={idx} className="hover:bg-white/[0.02]">
                                                    <td className="px-8 py-4"><span className="text-sm font-bold">{school?.name || 'Não identificada'}</span></td>
                                                    <td className="px-8 py-4"><span className="text-xs font-black text-slate-500 uppercase">{item.program_id ? item.program_id.slice(0, 8) : 'GERAL'}</span></td>
                                                    <td className="px-8 py-4 text-right"><span className={`text-sm font-mono font-bold ${item.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.balance)}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showModal && editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-800 dark:text-slate-100">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">close</button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {editingUser.avatar_url ? <img src={editingUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-slate-300 flex items-center justify-center h-full">person</span>}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110"><span className="material-symbols-outlined text-sm">{uploading ? 'sync' : 'photo_camera'}</span><input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={async (e) => {
                                        const file = e.target.files?.[0]; if (!file) return;
                                        try {
                                            setUploading(true); const fileExt = file.name.split('.').pop(); const fileName = `${Math.random()}.${fileExt}`; const filePath = `avatars/${fileName}`;
                                            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file); if (uploadError) throw uploadError;
                                            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath); setEditingUser({ ...editingUser, avatar_url: publicUrl });
                                        } catch (err) { console.error(err); alert('Erro no upload'); } finally { setUploading(false); }
                                    }} /></label>
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Foto do Perfil</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome</label><input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="input-field" /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Email</label><input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="input-field" disabled={!!editingUser.id} /></div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Função</label><select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole, schoolId: undefined, gee: undefined, assignedSchools: [] })} className="input-field">{Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}</select></div>
                            {(editingUser.role === UserRole.DIRETOR || editingUser.role === UserRole.CLIENTE) && (<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Escola Vinculada</label><select value={editingUser.schoolId || ''} onChange={e => setEditingUser({ ...editingUser, schoolId: e.target.value })} className="input-field"><option value="">Selecione uma escola</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>)}
                            {editingUser.role === UserRole.TECNICO_GEE && (
                                <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">GEE de Atuação</label><select value={editingUser.gee || ''} onChange={e => setEditingUser({ ...editingUser, gee: e.target.value, assignedSchools: [] })} className="input-field"><option value="">Selecione a Regional</option>{geeList.map(gee => <option key={gee} value={gee}>{gee}</option>)}</select></div>
                                    {editingUser.gee && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase">Escolas sob Supervisão</label><button onClick={handleSelectAllSchools} type="button" className="text-[9px] font-black uppercase text-primary">{(editingUser.assignedSchools || []).length === schoolsByGee.length ? 'Desmarcar Todas' : 'Selecionar Todas'}</button></div>
                                            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                                {schoolsByGee.map(s => (<label key={s.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"><input type="checkbox" checked={editingUser.assignedSchools?.includes(s.id)} onChange={e => handleAssignedSchoolsChange(s.id, e.target.checked)} className="rounded border-slate-300" /><span className="text-sm font-medium">{s.name}</span></label>))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500">Cancelar</button><button onClick={handleSave} className="btn-primary px-8">Salvar</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
