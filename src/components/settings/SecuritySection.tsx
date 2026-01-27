import React from 'react';

interface SecuritySectionProps {
    passwords: any;
    setPasswords: (data: any) => void;
    updatingPassword: boolean;
    onUpdate: () => void;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({ passwords, setPasswords, updatingPassword, onUpdate }) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in">
            <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-wider uppercase">Segurança da Conta</h3>
                    <p className="text-slate-400 text-sm italic">Altere sua senha de acesso periodicamente.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                    <label htmlFor="new_password" className="text-xs text-slate-400 font-bold uppercase">Nova Senha</label>
                    <input
                        id="new_password"
                        type="password"
                        value={passwords.new}
                        onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="confirm_password" className="text-xs text-slate-400 font-bold uppercase">Confirmar Nova Senha</label>
                    <input
                        id="confirm_password"
                        type="password"
                        value={passwords.confirm}
                        onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                    />
                </div>

                <div className="flex items-end">
                    <button
                        onClick={onUpdate}
                        disabled={updatingPassword}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {updatingPassword ? 'Alterando...' : 'Mudar Senha'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecuritySection;
