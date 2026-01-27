import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole, School, Permission, RolePermission } from '../types';

export interface SupportRequest {
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    status: 'Pendente' | 'Em Atendimento' | 'Resolvido';
    created_at: string;
}

export interface UserForm {
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

export const useUsers = (currentUser: User) => {
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
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
    const [closureSummary, setClosureSummary] = useState<any[]>([]);
    const [isCalculatingClosure, setIsCalculatingClosure] = useState(false);
    const [closurePeriodName, setClosurePeriodName] = useState('');

    const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
    const [counts, setCounts] = useState({ pendingUsers: 0, pendingSupport: 0 });

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

            const newRequests = supportRequests.map(r => r.id === id ? { ...r, status } : r);
            setSupportRequests(newRequests);
            setCounts(prev => ({ ...prev, pendingSupport: newRequests.filter(r => r.status === 'Pendente').length || 0 }));
        } catch (error) {
            console.error('Erro ao atualizar suporte:', error);
        }
    };

    const fetchSchools = async () => {
        try {
            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .order('name');

            if (error) throw error;
            setSchools(data || []);
        } catch (error) {
            console.error('Erro ao carregar escolas:', error);
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
                const { data: newData, error: insertError } = await supabase.from('role_permissions').upsert(defaults, { onConflict: 'role, resource' }).select();
                if (insertError) throw insertError;
                setRolePermissions(newData || []);
            } else {
                setRolePermissions(data);
            }
        } catch (error: any) {
            console.error('Erro ao buscar/criar permissões:', error);
        } finally {
            setIsLoadingPerms(false);
        }
    };

    const handleTogglePermission = async (role: UserRole, resource: RolePermission['resource'], field: string) => {
        const dbField = field === 'canView' ? 'can_view' : field === 'canCreate' ? 'can_create' : field === 'canEdit' ? 'can_edit' : 'can_delete';
        const existing = rolePermissions.find(rp => rp.role === role && rp.resource === resource);
        const newValue = existing ? !(existing as any)[dbField] : true;

        try {
            if (existing) {
                const { error } = await supabase.from('role_permissions').update({ [dbField]: newValue }).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('role_permissions').insert([{ role, resource, [dbField]: newValue }]);
                if (error) throw error;
            }
            fetchRolePermissions();
        } catch (error) {
            console.error('Erro ao salvar permissão:', error);
        }
    };

    const handleResetPermissions = async () => {
        if (!confirm('Deseja redefinir todas as permissões para os padrões do sistema?')) return;
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
            fetchRolePermissions();
        } catch (error: any) {
            console.error('Erro ao resetar permissões:', error);
        } finally {
            setIsLoadingPerms(false);
        }
    };

    const handleSendAnnouncement = async () => {
        if (!announcement.title || !announcement.message) return alert('Preencha o título e a mensagem.');
        setSendingNotice(true);
        try {
            let targetUsers = users;
            if (announcement.target !== 'all') targetUsers = users.filter(u => u.role === announcement.target);
            const notifications = targetUsers.map(u => ({ user_id: u.id, title: announcement.title, message: announcement.message, type: 'info' }));
            const { error } = await supabase.from('notifications').insert(notifications);
            if (error) throw error;
            alert('Comunicado enviado!');
            setAnnouncement({ title: '', message: '', target: 'all' });
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setSendingNotice(false);
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        if (!editingUser.name.trim() || !editingUser.email.trim()) return alert('Nome e Email são obrigatórios');

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
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const processDelete = async () => {
        if (!confirmDelete.userId) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', confirmDelete.userId);
            if (error) throw error;
            fetchUsers();
            setConfirmDelete({ isOpen: false, userId: null });
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        if (userId === currentUser.id) return;
        try {
            const { error } = await supabase.from('users').update({ active: !currentStatus }).eq('id', userId);
            if (error) throw error;
            fetchUsers();
        } catch (error: any) {
            alert('Erro ao alterar status: ' + error.message);
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
        if (!closurePeriodName.trim()) return alert('Informe o nome do novo período');
        if (!confirm(`Deseja realizar o encerramento do exercício atual?`)) return;

        setIsCalculatingClosure(true);
        try {
            const inserts = closureSummary
                .filter(c => c.balance > 0)
                .map(c => ({ school_id: c.school_id, program_id: c.program_id, period: closurePeriodName, value: c.balance, nature: 'Custeio' }));

            if (inserts.length > 0) {
                const { error } = await supabase.from('reprogrammed_balances').insert(inserts);
                if (error) throw error;
            }

            await supabase.from('periods').insert([{ name: closurePeriodName, is_active: true }]);
            alert('Encerramento realizado!');
            setClosurePeriodName('');
            fetchClosureData();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setIsCalculatingClosure(false);
        }
    };

    return {
        users, setUsers, schools, loading, showModal, setShowModal, editingUser, setEditingUser,
        searchTerm, setSearchTerm, filterRole, setFilterRole, filterStatus, setFilterStatus,
        uploading, setUploading, activeTab, setActiveTab, announcement, setAnnouncement,
        sendingNotice, rolePermissions, isLoadingPerms, confirmDelete, setConfirmDelete,
        closureSummary, isCalculatingClosure, closurePeriodName, setClosurePeriodName,
        supportRequests, counts,
        handleSupportStatus, handleTogglePermission, handleResetPermissions, handleSendAnnouncement,
        handleSaveUser, processDelete, handleToggleStatus, handleExecuteClosure, fetchClosureData
    };
};
