
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
        // --- REGISTER FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create profile with Cliente role by default, no school assigned yet
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: email,
              name: fullName,
              role: UserRole.CLIENTE, // Role padrão: Cliente (apenas visualização)
              school_id: null, // Sem escola vinculada inicialmente
              active: true // Permitir login para ver a página de espera
            });

          if (profileError) {
            // Lógica de "Claim Profile": Se o perfil já foi criado pelo Admin (pré-cadastro)
            if (profileError.code === '23505') { // Unique violation (email duplication)
              console.log("Perfil pré-existente detectado. Executando vínculo seguro...");

              // Chamada RPC Segura
              const { data: claimSuccess, error: claimError } = await supabase.rpc('claim_profile_by_email');

              if (claimSuccess && !claimError) {
                setSuccessMsg('Conta vinculada com sucesso! Seu perfil pré-aprovado foi ativado.');
                setIsRegistering(false);
                setEmail('');
                setPassword('');
                setFullName('');
                return;
              } else {
                console.error("Falha no vínculo RPC:", claimError);
                setErrorMsg(`Erro ao vincular perfil: ${claimError?.message || 'Erro Desconhecido ao tentar vincular conta pré-existente.'}`);
              }
            } else {
              console.error("Profile creation failed detail:", profileError);
              setErrorMsg(`Erro ao salvar perfil: ${profileError.message}`);
            }
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
          // Check if profile exists
          let { data: profile, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          // Self-Healing & Vínculo RPC no Login
          if (!profile) {
            console.log("Perfil não encontrado via ID. Tentando vincular via RPC (Login Flow)...");

            // 1. Tenta vincular conta legada
            const { data: claimed } = await supabase.rpc('claim_profile_by_email');

            if (claimed) {
              // 2. Se vinculou, recarrega o perfil (agora deve existir no ID correto)
              const { data: refreshed } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
              profile = refreshed;
            } else {
              // 3. Se não vinculou, cria novo perfil (Self-Healing Básico)
              console.log("Nenhum perfil pré-existente. Criando novo...");
              const newProfile = {
                id: authData.user.id,
                email: authData.user.email!,
                name: fullName || 'Usuário',
                role: UserRole.CLIENTE,
                school_id: null,
                active: true
              };

              const { error: insertError } = await supabase.from('users').insert(newProfile);

              if (insertError) {
                console.error("Self-healing failed:", insertError);
                if (insertError.code === '23505') {
                  // Isso é raro aqui se o RPC falhou, mas pode acontecer se houver race condition
                  setErrorMsg('Erro de conflito. Seu email existe no cadastro administrativo mas o vínculo falhou. Contate o suporte.');
                  return;
                }
                throw insertError;
              }
              profile = newProfile as any;
            }
          }

          // Notificar o App.tsx sobre o login bem-sucedido
          if (profile) {
            onLogin({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role as UserRole,
              schoolId: profile.school_id,
              assignedSchools: profile.assigned_schools,
              active: profile.active,
              gee: profile.gee,
              avatar_url: profile.avatar_url
            });
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
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
              <div>
                <p className="font-bold mb-1 uppercase tracking-wider text-[10px]">Bem-vindo à Jornada!</p>
                <p className="text-slate-300 leading-relaxed">
                  Crie sua conta agora para conhecer todas as vantagens e funcionalidades do sistema.
                  O acesso aos dados da sua escola será liberado após a validação do Administrador.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {isRegistering && (
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
