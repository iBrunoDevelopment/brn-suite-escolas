
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, School } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isRegistering) {
      fetchSchools();
    }
  }, [isRegistering]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isRegistering) {
        // Validação de escola selecionada
        if (!selectedSchoolId) {
          setErrorMsg('Por favor, selecione uma escola');
          setLoading(false);
          return;
        }

        // --- REGISTER FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create profile with Cliente role by default
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: email,
              name: fullName,
              role: UserRole.CLIENTE, // Role padrão: Cliente (apenas visualização)
              school_id: selectedSchoolId,
              active: true // Ativo por padrão, mas com permissões limitadas
            });

          if (profileError) {
            console.error("Profile creation failed:", profileError);
            setErrorMsg("Conta criada, mas houve erro ao salvar perfil no banco. Contate o administrador.");
          } else {
            setSuccessMsg('Conta criada com sucesso! Agora você pode fazer login.');
            setIsRegistering(false);
            // Limpar campos
            setEmail('');
            setPassword('');
            setFullName('');
            setSelectedSchoolId('');
          }
        }

      } else {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Check if profile exists, if not, create it (Self-Healing)
          const { data: profile, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!profile && !fetchError) {
            console.log("User has no profile (legacy user?), creating one...");
            const { data: firstSchool } = await supabase.from('schools').select('id').limit(1).single();
            const { error: insertError } = await supabase.from('users').insert({
              id: authData.user.id,
              email: authData.user.email!,
              name: 'Usuário Recuperado',
              role: UserRole.CLIENTE, // Usuários recuperados também começam como Cliente
              school_id: firstSchool?.id || null,
              active: true
            });
            if (insertError) console.error("Self-healing failed:", insertError);
          }

          // Verificar se o usuário está ativo
          if (profile && profile.active === false) {
            await supabase.auth.signOut();
            setErrorMsg('Sua conta está desativada. Entre em contato com o administrador.');
            setLoading(false);
            return;
          }
        }
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-display">
      <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
            <span className="material-symbols-outlined text-3xl">account_balance</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">BRN Suite Escolas</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão financeira profissional para educação.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2 duration-300">
            <span className="material-symbols-outlined text-xl">error</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm animate-in slide-in-from-top-2 duration-300">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {isRegistering && !successMsg && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-xl">info</span>
              <div>
                <p className="font-bold mb-1 uppercase tracking-wider text-[10px]">Informação de Cadastro</p>
                <p className="text-blue-300 leading-relaxed">
                  Novas contas são criadas com acesso de <strong>Cliente</strong> (somente leitura).
                  Selecione sua escola abaixo para prosseguir.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {isRegistering && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">person</span>
                  <input
                    type="text"
                    required
                    className="bg-[#0f172a] border border-[#334155] text-white text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block w-full pl-11 p-3 transition-all outline-none"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Sua Escola</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">school</span>
                  <select
                    required
                    value={selectedSchoolId}
                    onChange={e => setSelectedSchoolId(e.target.value)}
                    className="bg-[#0f172a] border border-[#334155] text-white text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block w-full pl-11 p-3 transition-all outline-none appearance-none"
                  >
                    <option value="">Selecione sua escola</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
              <input
                type="email"
                required
                className="bg-[#0f172a] border border-[#334155] text-white text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block w-full pl-11 p-3 transition-all outline-none"
                placeholder="exemplo@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
              <input
                type="password"
                required
                minLength={6}
                className="bg-[#0f172a] border border-[#334155] text-white text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block w-full pl-11 p-3 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 text-white bg-primary hover:bg-primary-hover active:scale-[0.98] focus:ring-4 focus:outline-none focus:ring-primary/30 font-bold rounded-xl text-sm px-5 py-4 text-center transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Processando...
              </>
            ) : (
              <>{isRegistering ? 'Criar minha conta' : 'Acessar Sistema'}</>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#334155] text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
              setSuccessMsg('');
              setEmail('');
              setPassword('');
              setFullName('');
              setSelectedSchoolId('');
            }}
            className="text-sm text-slate-400 hover:text-primary font-medium transition-all group"
          >
            {isRegistering ? (
              <span className="flex items-center gap-1 justify-center">
                Já tem uma conta? <strong className="text-primary group-hover:underline">Faça login</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1 justify-center">
                Não tem conta? <strong className="text-primary group-hover:underline">Cadastre-se aqui</strong>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
