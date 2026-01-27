import React from 'react';
import { User, UserRole } from '../types';
import { useUsers } from '../hooks/useUsers';

// Components
import UserListSection from '../components/users/UserListSection';
import ApprovalsSection from '../components/users/ApprovalsSection';
import SupportSection from '../components/users/SupportSection';
import PermissionsSection from '../components/users/PermissionsSection';
import AnnouncementsSection from '../components/users/AnnouncementsSection';
import ClosureSection from '../components/users/ClosureSection';
import UserFormModal from '../components/users/UserFormModal';
import ConfirmDeleteModal from '../components/users/ConfirmDeleteModal';

const Users: React.FC<{ user: User }> = ({ user }) => {
    const manager = useUsers(user);

    if (user.role !== UserRole.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <span className="material-symbols-outlined text-6xl opacity-20">lock</span>
                <p className="text-xl font-bold">Acesso Restrito</p>
                <p className="text-sm">Apenas administradores podem gerenciar usuários e aprovações.</p>
            </div>
        );
    }

    if (manager.loading || manager.isLoadingPerms) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium">Carregando dados...</p>
                </div>
            </div>
        );
    }

    const handleCreate = () => {
        manager.setEditingUser({
            name: '',
            email: '',
            role: UserRole.CLIENTE,
            active: true,
            assignedSchools: []
        });
        manager.setShowModal(true);
    };

    const handleEdit = (u: User) => {
        manager.setEditingUser({
            id: u.id,
            name: u.name,
            email: u.email || '',
            role: u.role,
            schoolId: u.schoolId,
            gee: u.gee,
            assignedSchools: u.assignedSchools || [],
            active: u.active ?? true,
            avatar_url: u.avatar_url
        });
        manager.setShowModal(true);
    };

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
                {manager.activeTab === 'users' && (
                    <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                        <span className="material-symbols-outlined">person_add</span>
                        Novo Usuário
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap bg-white/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 w-fit gap-1">
                <button onClick={() => manager.setActiveTab('users')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${manager.activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Colaboradores
                </button>
                <button onClick={() => manager.setActiveTab('approvals')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${manager.activeTab === 'approvals' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Aprovações
                    {manager.counts.pendingUsers > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${manager.activeTab === 'approvals' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{manager.counts.pendingUsers}</span>}
                </button>
                <button onClick={() => manager.setActiveTab('support')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${manager.activeTab === 'support' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Suporte
                    {manager.counts.pendingSupport > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${manager.activeTab === 'support' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{manager.counts.pendingSupport}</span>}
                </button>
                <button onClick={() => manager.setActiveTab('permissions')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${manager.activeTab === 'permissions' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    Permissões
                </button>
                <button onClick={() => manager.setActiveTab('announcements')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${manager.activeTab === 'announcements' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                    Comunicados
                </button>
                <button onClick={() => manager.setActiveTab('closure')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${manager.activeTab === 'closure' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                    Encerramento
                </button>
            </div>

            {/* Sections */}
            {manager.activeTab === 'users' && (
                <UserListSection
                    users={manager.users}
                    currentUser={user}
                    searchTerm={manager.searchTerm}
                    setSearchTerm={manager.setSearchTerm}
                    filterRole={manager.filterRole}
                    setFilterRole={manager.setFilterRole}
                    filterStatus={manager.filterStatus}
                    setFilterStatus={manager.setFilterStatus}
                    onEdit={handleEdit}
                    onDelete={(id) => manager.setConfirmDelete({ isOpen: true, userId: id })}
                    onToggleStatus={manager.handleToggleStatus}
                />
            )}

            {manager.activeTab === 'approvals' && (
                <ApprovalsSection users={manager.users} onEdit={handleEdit} />
            )}

            {manager.activeTab === 'support' && (
                <SupportSection requests={manager.supportRequests} onUpdateStatus={manager.handleSupportStatus} />
            )}

            {manager.activeTab === 'permissions' && (
                <PermissionsSection
                    rolePermissions={manager.rolePermissions}
                    onTogglePermission={manager.handleTogglePermission}
                    onReset={manager.handleResetPermissions}
                />
            )}

            {manager.activeTab === 'announcements' && (
                <AnnouncementsSection
                    announcement={manager.announcement}
                    setAnnouncement={manager.setAnnouncement}
                    sendingNotice={manager.sendingNotice}
                    onSend={manager.handleSendAnnouncement}
                />
            )}

            {manager.activeTab === 'closure' && (
                <ClosureSection
                    closureSummary={manager.closureSummary}
                    isCalculating={manager.isCalculatingClosure}
                    periodName={manager.closurePeriodName}
                    setPeriodName={manager.setClosurePeriodName}
                    onExecute={manager.handleExecuteClosure}
                    schools={manager.schools}
                />
            )}

            {/* Modals */}
            {manager.showModal && manager.editingUser && (
                <UserFormModal
                    editingUser={manager.editingUser}
                    setEditingUser={manager.setEditingUser}
                    schools={manager.schools}
                    uploading={manager.uploading}
                    setUploading={manager.setUploading}
                    onSave={manager.handleSaveUser}
                    onClose={() => manager.setShowModal(false)}
                />
            )}

            {manager.confirmDelete.isOpen && (
                <ConfirmDeleteModal
                    onConfirm={manager.processDelete}
                    onCancel={() => manager.setConfirmDelete({ isOpen: false, userId: null })}
                />
            )}
        </div>
    );
};

export default Users;
