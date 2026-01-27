import React from 'react';

interface ProfileSectionProps {
    profileData: { name: string; email: string };
    setProfileData: (data: any) => void;
    updatingProfile: boolean;
    onUpdate: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ profileData, setProfileData, updatingProfile, onUpdate }) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in">
            <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-3xl">person</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-wider uppercase">Dados do Perfil</h3>
                    <p className="text-slate-400 text-sm italic">Mantenha suas informações básicas atualizadas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                    <label htmlFor="profile_name" className="text-xs text-slate-400 font-bold uppercase">Nome Completo</label>
                    <input
                        id="profile_name"
                        type="text"
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="profile_email" className="text-xs text-slate-400 font-bold uppercase">E-mail (Apenas Leitura)</label>
                    <input
                        id="profile_email"
                        type="text"
                        value={profileData.email}
                        disabled
                        className="bg-[#111a22] border border-surface-border text-slate-500 rounded-lg px-4 py-2 cursor-not-allowed"
                    />
                </div>

                <div className="md:col-span-2 flex justify-end">
                    <button
                        onClick={onUpdate}
                        disabled={updatingProfile}
                        className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {updatingProfile ? 'Salvando...' : 'Atualizar Perfil'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSection;
