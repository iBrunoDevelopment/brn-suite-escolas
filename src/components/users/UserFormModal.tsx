import React from 'react';
import { UserRole, School } from '../../types';
import { UserForm } from '../../hooks/useUsers';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../lib/imageUtils';

interface UserFormModalProps {
    editingUser: UserForm;
    setEditingUser: (u: UserForm) => void;
    schools: School[];
    uploading: boolean;
    setUploading: (u: boolean) => void;
    onSave: () => void;
    onClose: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
    editingUser, setEditingUser, schools, uploading, setUploading, onSave, onClose
}) => {
    const { addToast } = useToast();
    const geeList = Array.from(new Set(schools.map(s => s.gee).filter(Boolean))) as string[];
    const schoolsByGee = editingUser.gee ? schools.filter(s => s.gee === editingUser.gee) : [];

    const handleAssignedSchoolsChange = (schoolId: string, checked: boolean) => {
        const currentSchools = editingUser.assignedSchools || [];
        const newSchools = checked ? [...currentSchools, schoolId] : currentSchools.filter(id => id !== schoolId);
        setEditingUser({ ...editingUser, assignedSchools: newSchools });
    };

    const handleSelectAllSchools = () => {
        if (!editingUser.gee) return;
        const allGeeSchoolIds = schoolsByGee.map(s => s.id);
        const currentAssigned = editingUser.assignedSchools || [];
        const allSelected = allGeeSchoolIds.every(id => currentAssigned.includes(id));

        if (allSelected) {
            setEditingUser({ ...editingUser, assignedSchools: currentAssigned.filter(id => !allGeeSchoolIds.includes(id)) });
        } else {
            const others = currentAssigned.filter(id => !allGeeSchoolIds.includes(id));
            setEditingUser({ ...editingUser, assignedSchools: [...others, ...allGeeSchoolIds] });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, processedFile);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setEditingUser({ ...editingUser, avatar_url: publicUrl });
        } catch (err) {
            console.error(err);
            addToast('Erro no upload', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-800 dark:text-slate-100">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                    <button onClick={onClose} className="material-symbols-outlined text-slate-400">close</button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                                {editingUser.avatar_url ? <img src={editingUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-slate-300 flex items-center justify-center h-full">person</span>}
                            </div>
                            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110">
                                <span className="material-symbols-outlined text-sm">{uploading ? 'sync' : 'photo_camera'}</span>
                                <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={handleFileUpload} />
                            </label>
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Foto do Perfil</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1"><label htmlFor="user-name" className="text-[10px] font-black text-slate-400 uppercase">Nome</label><input id="user-name" type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="input-field" /></div>
                        <div className="space-y-1"><label htmlFor="user-email" className="text-[10px] font-black text-slate-400 uppercase">Email</label><input id="user-email" type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="input-field" disabled={!!editingUser.id} /></div>
                    </div>
                    <div className="space-y-1"><label htmlFor="user-role" className="text-[10px] font-black text-slate-400 uppercase">Função</label><select id="user-role" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole, schoolId: undefined, gee: undefined, assignedSchools: [] })} className="input-field">{Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}</select></div>
                    {(editingUser.role === UserRole.DIRETOR || editingUser.role === UserRole.CLIENTE) && (<div className="space-y-1"><label htmlFor="user-school" className="text-[10px] font-black text-slate-400 uppercase">Escola Vinculada</label><select id="user-school" value={editingUser.schoolId || ''} onChange={e => setEditingUser({ ...editingUser, schoolId: e.target.value })} className="input-field"><option value="">Selecione uma escola</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>)}
                    {editingUser.role === UserRole.TECNICO_GEE && (
                        <div className="space-y-4">
                            <div className="space-y-1"><label htmlFor="user-gee" className="text-[10px] font-black text-slate-400 uppercase">GEE de Atuação</label><select id="user-gee" value={editingUser.gee || ''} onChange={e => setEditingUser({ ...editingUser, gee: e.target.value, assignedSchools: [] })} className="input-field"><option value="">Selecione a Regional</option>{geeList.map(gee => <option key={gee} value={gee}>{gee}</option>)}</select></div>
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
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500">Cancelar</button><button onClick={onSave} className="btn-primary px-8">Salvar</button></div>
            </div>
        </div>
    );
};

export default UserFormModal;
