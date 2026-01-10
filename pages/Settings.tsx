
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' }
];

const Settings: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const configTabs = [
    { id: 'profile', label: 'Minha Conta', icon: 'person', roles: [] },
    { id: 'security', label: 'Segurança', icon: 'lock', roles: [] },
    { id: 'general', label: 'Configurações Gerais', icon: 'tune', roles: ['Administrador', 'Operador'] },
    { id: 'rubrics', label: 'Recursos & Rubricas', icon: 'category', roles: ['Administrador', 'Operador'] },
    { id: 'status', label: 'Status de Movimentação', icon: 'sync_alt', roles: ['Administrador', 'Operador'] },
    { id: 'payment', label: 'Tipos de Pagamento', icon: 'payments', roles: ['Administrador', 'Operador'] },
    { id: 'periods', label: 'Períodos / Semestres', icon: 'calendar_month', roles: ['Administrador', 'Operador'] },
    { id: 'banks', label: 'Contas Bancárias', icon: 'account_balance', roles: ['Administrador', 'Operador'] },
    { id: 'suppliers', label: 'Fornecedores', icon: 'local_shipping', roles: ['Administrador', 'Operador'] },
    { id: 'contacts', label: 'Contatos de Suporte', icon: 'contact_support', roles: ['Administrador'] }
  ].filter(tab => tab.roles.length === 0 || tab.roles.includes(user.role));

  // State for Cities
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Rubrics State
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [newRubric, setNewRubric] = useState({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
  const [newSupplier, setNewSupplier] = useState({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [newBank, setNewBank] = useState({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rubricSearch, setRubricSearch] = useState('');
  const [rubricFilterProgram, setRubricFilterProgram] = useState('');
  const [rubricFilterSchool, setRubricFilterSchool] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [bankFilterProgram, setBankFilterProgram] = useState('');
  const [bankFilterSchool, setBankFilterSchool] = useState('');

  // Periods State
  const [periods, setPeriods] = useState<any[]>([]);
  const [newPeriod, setNewPeriod] = useState({ name: '', is_active: true });
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({ name: user.name, email: user.email || '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Support Contacts State
  const [supportContacts, setSupportContacts] = useState({
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    website: ''
  });
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);

  useEffect(() => {
    if (activeTab === 'rubrics' || activeTab === 'banks') fetchAuxOptions();
    if (activeTab === 'rubrics') fetchRubricData();
    if (activeTab === 'suppliers') fetchSupplierData();
    if (activeTab === 'banks') fetchBankData();
    if (activeTab === 'payment') fetchPaymentData();
    if (activeTab === 'periods') fetchPeriodData();
    if (activeTab === 'contacts') fetchSupportContacts();
  }, [activeTab]);

  const fetchSupportContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'support_contacts')
        .maybeSingle();

      if (data?.value) {
        setSupportContacts(data.value);
      }
    } catch (error) {
      console.error('Error fetching support contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSaveContacts = async () => {
    setSavingContacts(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'support_contacts',
          value: supportContacts,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Contatos salvos com sucesso!');
    } catch (error: any) {
      alert(`Erro ao salvar contatos: ${error.message}`);
    } finally {
      setSavingContacts(false);
    }
  };

  // Effect to fetch cities when UF changes
  useEffect(() => {
    if (newSupplier.uf) {
      fetchCities(newSupplier.uf);
    } else {
      setCities([]);
    }
  }, [newSupplier.uf]);

  const fetchCities = async (uf: string) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const data = await response.json();
      const cityNames = data.map((c: any) => c.nome).sort();
      setCities(cityNames);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchAuxOptions = async () => {
    const [s, p] = await Promise.all([
      supabase.from('schools').select('*').order('name'),
      supabase.from('programs').select('*').order('name')
    ]);
    if (s.data) setSchools(s.data);
    if (p.data) setPrograms(p.data);
  };

  const fetchRubricData = async () => {
    setLoading(true);
    const [r, s, p] = await Promise.all([
      supabase.from('rubrics').select(`
        *,
        programs (name),
        schools (name)
      `).order('name'),
      supabase.from('schools').select('*').order('name'),
      supabase.from('programs').select('*').order('name')
    ]);

    if (r.data) setRubrics(r.data);
    if (s.data) setSchools(s.data);
    if (p.data) setPrograms(p.data);
    setLoading(false);
  };

  const handleSaveRubric = async () => {
    if (!newRubric.name || !newRubric.program_id) return alert('Nome e Programa são obrigatórios');

    const payload = {
      name: newRubric.name,
      program_id: newRubric.program_id,
      default_nature: newRubric.default_nature,
      school_id: newRubric.school_id || null
    };

    if (editingRubricId) {
      const { error } = await supabase.from('rubrics').update(payload).eq('id', editingRubricId);
      if (error) {
        console.error('Erro ao atualizar rubrica:', error);
        alert(`Erro ao atualizar rubrica: ${error.message}`);
      } else {
        setNewRubric({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
        setEditingRubricId(null);
        fetchRubricData();
      }
    } else {
      const { error } = await supabase.from('rubrics').insert(payload);
      if (error) {
        console.error('Erro detalhado:', error);
        alert(`Erro ao criar rubrica: ${error.message} (Código: ${error.code})`);
      } else {
        setNewRubric({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
        fetchRubricData();
      }
    }
  };

  const handleEditRubric = (r: any) => {
    setNewRubric({
      name: r.name,
      program_id: r.program_id,
      school_id: r.school_id || '',
      default_nature: r.default_nature || 'Custeio'
    });
    setEditingRubricId(r.id);
  };

  const [newProgram, setNewProgram] = useState({ name: '', description: '' });

  const handleCreateProgram = async () => {
    if (!newProgram.name) return alert('Nome do programa é obrigatório');
    const { error } = await supabase.from('programs').insert(newProgram);
    if (error) alert('Erro ao criar programa');
    else {
      setNewProgram({ name: '', description: '' });
      fetchRubricData();
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('Isso pode afetar as rubricas vinculadas. Continuar?')) return;
    await supabase.from('programs').delete().eq('id', id);
    fetchRubricData();
  };

  const formatCPFCNPJ = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return cleanValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    }
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{1})(\d{4})(\d)/, '$1 $2-$3')
      .slice(0, 16);
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const fetchSupplierData = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('name');
    if (data) setSuppliers(data);
    setLoading(false);
  };

  const handleSaveSupplier = async () => {
    if (!newSupplier.name) return alert('Nome é obrigatório');

    if (editingSupplierId) {
      const { error } = await supabase.from('suppliers').update(newSupplier).eq('id', editingSupplierId);
      if (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        alert(`Erro ao atualizar fornecedor: ${error.message}`);
      } else {
        setNewSupplier({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
        setEditingSupplierId(null);
        fetchSupplierData();
      }
    } else {
      const { error } = await supabase.from('suppliers').insert(newSupplier);
      if (error) {
        console.error('Erro ao criar fornecedor:', error);
        alert(`Erro ao criar fornecedor: ${error.message} (Código: ${error.code})`);
      } else {
        setNewSupplier({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
        fetchSupplierData();
      }
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStamp(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `stamps/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      setNewSupplier(prev => ({ ...prev, stamp_url: publicUrl }));
    } catch (error: any) {
      alert(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploadingStamp(false);
    }
  };

  const handleEditSupplier = (s: any) => {
    setNewSupplier({
      name: s.name,
      cnpj: s.cnpj || '',
      email: s.email || '',
      phone: s.phone || '',
      cep: s.cep || '',
      address: s.address || '',
      city: s.city || '',
      uf: s.uf || '',
      stamp_url: s.stamp_url || ''
    });
    setEditingSupplierId(s.id);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    fetchSupplierData();
  };

  const handleDeleteRubric = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá a rubrica permanentemente.')) return;
    const { error } = await supabase.from('rubrics').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert(`Não foi possível excluir. Provavelmente esta rubrica já possui lançamentos vinculados.`);
    } else {
      fetchRubricData();
    }
  };

  const fetchBankData = async () => {
    setLoading(true);
    const { data } = await supabase.from('bank_accounts').select('*, schools(name), programs(name)').order('name');
    if (data) setBankAccounts(data);
    setLoading(false);
  };

  const handleCreateBank = async () => {
    if (!newBank.name || !newBank.bank_name || !newBank.program_id) return alert('Nome, Banco e Programa são obrigatórios');

    const payload = {
      ...newBank,
      school_id: newBank.school_id || null,
      program_id: newBank.program_id || null
    };

    if (editingBankId) {
      const { error } = await supabase.from('bank_accounts').update(payload).eq('id', editingBankId);
      if (error) {
        console.error(error);
        alert('Erro ao atualizar conta bancária');
      } else {
        setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
        setEditingBankId(null);
        fetchBankData();
      }
    } else {
      const { error } = await supabase.from('bank_accounts').insert(payload);
      if (error) {
        console.error(error);
        alert('Erro ao criar conta bancária');
      } else {
        setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
        fetchBankData();
      }
    }
  };

  const handleEditBank = (bank: any) => {
    setNewBank({
      name: bank.name,
      bank_name: bank.bank_name,
      agency: bank.agency || '',
      account_number: bank.account_number || '',
      school_id: bank.school_id || '',
      program_id: bank.program_id || ''
    });
    setEditingBankId(bank.id);
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    await supabase.from('bank_accounts').delete().eq('id', id);
    fetchBankData();
  };

  const fetchPaymentData = async () => {
    setLoading(true);
    const { data } = await supabase.from('payment_methods').select('*').order('name');
    if (data) setPaymentMethods(data);
    setLoading(false);
  };

  const handleCreatePaymentMethod = async () => {
    if (!newPaymentMethod) return alert('Nome é obrigatório');
    const { error } = await supabase.from('payment_methods').insert({ name: newPaymentMethod });
    if (error) alert('Erro ao criar método de pagamento');
    else {
      setNewPaymentMethod('');
      fetchPaymentData();
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    await supabase.from('payment_methods').delete().eq('id', id);
    fetchPaymentData();
  };

  const fetchPeriodData = async () => {
    setLoading(true);
    const { data } = await supabase.from('periods').select('*').order('name', { ascending: false });
    if (data) setPeriods(data);
    setLoading(false);
  };

  const handleCreatePeriod = async () => {
    if (!newPeriod.name) return alert('Nome do período é obrigatório');
    setIsSavingPeriod(true);
    const { error } = await supabase.from('periods').insert(newPeriod);
    if (error) alert('Erro ao criar período: ' + error.message);
    else {
      setNewPeriod({ name: '', is_active: true });
      fetchPeriodData();
    }
    setIsSavingPeriod(false);
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Excluir este período? Isso pode afetar filtros relacionados.')) return;
    await supabase.from('periods').delete().eq('id', id);
    fetchPeriodData();
  };

  const handleTogglePeriod = async (id: string, current: boolean) => {
    await supabase.from('periods').update({ is_active: !current }).eq('id', id);
    fetchPeriodData();
  };

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      alert('Preencha a nova senha e a confirmação');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      alert('As senhas não coincidem');
      return;
    }
    if (passwords.new.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;
      alert('Senha atualizada com sucesso!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      console.error('Erro ao mudar senha:', error);
      alert('Erro ao mudar senha: ' + error.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileData.name.trim()) return alert('Nome é obrigatório');

    try {
      setUpdatingProfile(true);
      const { error } = await supabase
        .from('users')
        .update({ name: profileData.name.trim() })
        .eq('id', user.id);

      if (error) throw error;
      alert('Perfil atualizado com sucesso! (Recarregue a página para ver as mudanças na barra lateral)');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Configurações do Sistema</h1>
        <p className="text-text-secondary text-sm">Gerencie parâmetros, cadastros base e regras de negócio do BRN Suite.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Mini */}
        <div className="flex flex-col gap-2">
          {configTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === tab.id ? 'bg-primary/10 text-white border-l-4 border-primary font-bold' : 'text-text-secondary hover:bg-surface-dark hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 flex flex-col gap-6 bg-surface-dark border border-surface-border rounded-xl p-8">
          <div className="flex flex-col gap-6">
            {activeTab === 'profile' && (
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
                    <label className="text-xs text-slate-400 font-bold uppercase">Nome Completo</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">E-mail (Apenas Leitura)</label>
                    <input
                      type="text"
                      value={profileData.email}
                      disabled
                      className="bg-[#111a22]/50 border border-surface-border text-slate-500 rounded-lg px-4 py-2 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={updatingProfile}
                    className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {updatingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="flex flex-col gap-8 animate-in fade-in">
                <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-wider uppercase">Segurança & Senha</h3>
                    <p className="text-slate-400 text-sm italic">Proteja sua conta alterando sua senha periodicamente.</p>
                  </div>
                </div>

                <div className="bg-[#111a22] p-6 rounded-2xl border border-surface-border max-w-xl">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Nova Senha</label>
                      <input
                        type="password"
                        value={passwords.new}
                        onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="bg-surface-dark border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                        placeholder="Repita a nova senha"
                        className="bg-surface-dark border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={updatingPassword}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">{updatingPassword ? 'sync' : 'key'}</span>
                      {updatingPassword ? 'Atualizando...' : 'Atualizar Minha Senha'}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3 max-w-xl">
                  <span className="material-symbols-outlined text-amber-500">info</span>
                  <div className="text-xs text-amber-100/70 leading-relaxed">
                    <strong>Dica de Segurança:</strong> Use pelo menos uma letra maiúscula, um número e um caractere especial para uma senha mais forte.
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'general' && (
              <>
                <h3 className="text-xl font-bold text-white border-b border-surface-border pb-4">Parâmetros Gerais</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-white">Formato de Data Padrão (Exibição)</label>
                    <select className="bg-[#111a22] border-surface-border text-white rounded-lg text-sm">
                      <option>DD/MM/YYYY (Brasil)</option>
                      <option>YYYY-MM-DD (Internacional)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-white">Moeda Base</label>
                    <div className="text-text-secondary text-sm bg-[#111a22] p-2 rounded border border-surface-border">Real Brasileiro (R$)</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-white">Limite Mínimo Global para Alerta de Saldo</label>
                  <div className="relative flex items-center max-w-xs">
                    <span className="absolute left-3 text-text-secondary">R$</span>
                    <input type="number" defaultValue="5000" className="bg-[#111a22] border-surface-border text-white rounded-lg text-sm w-full pl-10" />
                  </div>
                  <p className="text-xs text-text-secondary">Quando o saldo de qualquer conta atingir este valor, um alerta crítico será gerado.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg mt-4">
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-bold">Modo de Auditoria Estrita</span>
                    <span className="text-text-secondary text-xs">Exige anexo de documento para qualquer saída acima de R$ 500,00</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[#233648] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </>
            )}

            {activeTab === 'rubrics' && (
              <div className="flex flex-col gap-8 animate-in fade-in">

                {/* Seção de Programas (Contas) */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">1. Programas / Contas</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111a22] p-4 rounded-xl border border-surface-border">
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-400">Nome do Programa (ex: PDDE, Escola da Hora)</label>
                      <input
                        type="text"
                        value={newProgram.name}
                        onChange={e => setNewProgram({ ...newProgram, name: e.target.value })}
                        className="w-full bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none mt-1"
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleCreateProgram} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded text-sm transition-colors shadow-lg">
                        Criar Programa
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {programs.map(p => (
                      <div key={p.id} className="bg-surface-dark border border-surface-border rounded-lg px-3 py-1.5 flex items-center gap-3">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <button onClick={() => handleDeleteProgram(p.id)} className="text-slate-500 hover:text-red-500"><span className="material-symbols-outlined text-[16px]">close</span></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção de Rubricas */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                      {editingRubricId ? 'Editar Rubrica' : '2. Rubricas'}
                    </h3>
                    {editingRubricId && (
                      <button
                        onClick={() => { setEditingRubricId(null); setNewRubric({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' }); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  {/* Creation Form */}
                  <div className="bg-[#111a22] p-4 rounded-xl border border-surface-border flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Nome da Rubrica</label>
                        <input
                          type="text"
                          value={newRubric.name}
                          onChange={e => setNewRubric({ ...newRubric, name: e.target.value })}
                          placeholder="Ex: Material Didático"
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Vincular à Conta</label>
                        <select
                          value={newRubric.program_id}
                          onChange={e => setNewRubric({ ...newRubric, program_id: e.target.value })}
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        >
                          <option value="">Selecione...</option>
                          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Escola (Vínculo Específico)</label>
                        <select
                          value={newRubric.school_id}
                          onChange={e => setNewRubric({ ...newRubric, school_id: e.target.value })}
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        >
                          <option value="">Global (Todas as Escolas)</option>
                          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Natureza Sugerida</label>
                        <div className="flex items-center gap-2 h-full">
                          <button
                            onClick={() => setNewRubric({ ...newRubric, default_nature: 'Custeio' })}
                            className={`flex-1 h-[38px] rounded border text-xs font-bold transition-all ${newRubric.default_nature === 'Custeio' ? 'bg-primary text-white border-primary border-b-2' : 'border-surface-border text-slate-400'}`}
                          >Custeio</button>
                          <button
                            onClick={() => setNewRubric({ ...newRubric, default_nature: 'Capital' })}
                            className={`flex-1 h-[38px] rounded border text-xs font-bold transition-all ${newRubric.default_nature === 'Capital' ? 'bg-orange-600 text-white border-orange-600 border-b-2' : 'border-surface-border text-slate-400'}`}
                          >Capital</button>
                        </div>
                      </div>

                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleSaveRubric} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded font-bold text-sm shadow-lg transition-all active:scale-95">
                        {editingRubricId ? 'Salvar Alterações' : 'Cadastrar Rubrica'}
                      </button>
                    </div>
                  </div>

                  {/* Rubric List Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mt-6">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rubricSearch}
                        onChange={e => setRubricSearch(e.target.value)}
                        placeholder="Buscar rubrica..."
                        className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                      />
                    </div>
                    <div className="w-full md:w-56">
                      <select
                        value={rubricFilterProgram}
                        onChange={e => setRubricFilterProgram(e.target.value)}
                        className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                      >
                        <option value="">Todas as Contas</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-full md:w-56">
                      <select
                        value={rubricFilterSchool}
                        onChange={e => setRubricFilterSchool(e.target.value)}
                        className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                      >
                        <option value="">Todas as Escolas</option>
                        <option value="Global">Global (Sem Escola)</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* List */}
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <div className="flex items-center px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <div className="flex-1 text-left">Rubrica / Conta</div>
                      <div className="w-48 text-left">Vínculo</div>
                      <div className="w-32 text-center text-right">Natureza</div>
                      <div className="w-12"></div>
                    </div>
                    {loading ? <div className="text-white text-center py-4">Carregando...</div> : rubrics
                      .filter(r =>
                        (!rubricSearch || r.name.toLowerCase().includes(rubricSearch.toLowerCase())) &&
                        (!rubricFilterProgram || r.program_id === rubricFilterProgram) &&
                        (!rubricFilterSchool || (rubricFilterSchool === 'Global' ? (!r.school_id) : r.school_id === rubricFilterSchool))
                      )
                      .map((r) => (
                        <div key={r.id} className="flex items-center p-4 bg-surface-dark border border-surface-border rounded-xl hover:border-slate-500 transition-colors group">
                          <div className="flex-1 flex flex-col">
                            <span className="font-bold text-white text-sm">{r.name}</span>
                            <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">{r.programs?.name || 'Sem Conta'}</span>
                          </div>

                          <div className="w-48">
                            {r.schools ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-400/5 px-2 py-1 rounded w-fit border border-emerald-400/20">
                                <span className="material-symbols-outlined text-[14px]">school</span>
                                {r.schools.name}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold px-2 py-1 italic">
                                <span className="material-symbols-outlined text-[14px]">public</span>
                                Global
                              </div>
                            )}
                          </div>

                          <div className="w-32 text-right">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-b-2 ${r.default_nature === 'Capital' ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' : 'text-blue-400 border-blue-400/30 bg-blue-400/10'}`}>
                              {r.default_nature || 'Custeio'}
                            </span>
                          </div>

                          <div className="w-24 flex justify-end gap-2">
                            <button onClick={() => handleEditRubric(r)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => handleDeleteRubric(r.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'suppliers' && (
              <div className="flex flex-col gap-6 animate-in fade-in">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                      {editingSupplierId ? 'Editar Fornecedor' : 'Gestão de Fornecedores'}
                    </h3>
                    {editingSupplierId && (
                      <button
                        onClick={() => { setEditingSupplierId(null); setNewSupplier({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' }); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  <div className="bg-[#111a22] p-6 rounded-xl border border-surface-border flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-xs text-slate-400">Nome / Razão Social</label>
                        <input
                          type="text"
                          value={newSupplier.name}
                          onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                          placeholder="Nome da empresa"
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">CPF / CNPJ</label>
                        <input
                          type="text"
                          value={newSupplier.cnpj}
                          onChange={e => setNewSupplier({ ...newSupplier, cnpj: formatCPFCNPJ(e.target.value) })}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                          maxLength={18}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">E-mail</label>
                        <input
                          type="email"
                          value={newSupplier.email}
                          onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                          placeholder="contato@empresa.com"
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center border border-surface-border p-4 rounded-lg bg-surface-dark/50">
                      <div className="flex flex-col gap-1 items-center">
                        <div className="relative group w-20 h-20">
                          {newSupplier.stamp_url ? (
                            <img src={newSupplier.stamp_url} className="w-full h-full object-contain bg-white rounded border border-slate-700 p-1" />
                          ) : (
                            <div className="w-full h-full rounded bg-slate-800 flex items-center justify-center border border-slate-700 border-dashed">
                              <span className="material-symbols-outlined text-2xl text-slate-600">stamp</span>
                            </div>
                          )}
                          <input type="file" onChange={handleStampUpload} className="hidden" id="stamp-input" accept="image/*" />
                          <label htmlFor="stamp-input" className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded text-white font-bold text-[8px] uppercase text-center p-1">Anexar Carimbo</label>
                          {isUploadingStamp && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded"><span className="material-symbols-outlined animate-spin text-white text-sm">sync</span></div>}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Carimbo da Empresa</span>
                      </div>
                      <div className="lg:col-span-3 text-xs text-slate-400">
                        <p className="font-bold text-slate-300 mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">info</span>
                          Dica de Uso
                        </p>
                        <p>O carimbo da empresa será inserido automaticamente em recibos e planilhas de cotação. Para melhores resultados, utilize uma imagem com fundo transparente (PNG) ou fundo branco limpo.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">CEP</label>
                        <input
                          type="text"
                          value={newSupplier.cep}
                          onChange={e => setNewSupplier({ ...newSupplier, cep: formatCEP(e.target.value) })}
                          placeholder="00000-000"
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                          maxLength={9}
                        />
                      </div>
                      <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-xs text-slate-400">Endereço</label>
                        <input
                          type="text"
                          value={newSupplier.address}
                          onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                          placeholder="Rua, número, bairro..."
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Telefone</label>
                        <input
                          type="text"
                          value={newSupplier.phone}
                          onChange={e => setNewSupplier({ ...newSupplier, phone: formatPhone(e.target.value) })}
                          placeholder="(00) 0 0000-0000"
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                          maxLength={16}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">UF</label>
                        <select
                          value={newSupplier.uf}
                          onChange={e => setNewSupplier({ ...newSupplier, uf: e.target.value })}
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        >
                          <option value="">Selecione o Estado...</option>
                          {BRAZIL_STATES.map(state => (
                            <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs text-slate-400">Cidade {loadingCities && <span className="text-[10px] text-primary animate-pulse font-bold">(Carregando...)</span>}</label>
                        <select
                          value={newSupplier.city}
                          onChange={e => setNewSupplier({ ...newSupplier, city: e.target.value })}
                          className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                          disabled={!newSupplier.uf || loadingCities}
                        >
                          <option value="">{newSupplier.uf ? 'Selecione a Cidade...' : 'Selecione primeiro o UF'}</option>
                          {cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      {editingSupplierId && (
                        <button onClick={() => { setEditingSupplierId(null); setNewSupplier({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' }); }} className="bg-surface-dark border border-surface-border text-white px-6 py-2 rounded font-bold text-sm shadow-lg transition-all">
                          Cancelar
                        </button>
                      )}
                      <button onClick={handleSaveSupplier} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded font-bold text-sm shadow-lg transition-all">
                        {editingSupplierId ? 'Salvar Alterações' : 'Adicionar Fornecedor'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mt-4">
                    {suppliers.map(s => (
                      <div key={s.id} className="flex flex-col md:flex-row md:items-center p-4 bg-surface-dark border border-surface-border rounded-xl hover:border-slate-500 transition-colors group">
                        <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center mr-4 overflow-hidden">
                          {s.stamp_url ? (
                            <img src={s.stamp_url} alt="Stamp" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-700 text-xl">stamp</span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className="font-bold text-white text-sm">{s.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono tracking-wider">{s.cnpj ? formatCPFCNPJ(s.cnpj) : 'Documento não informado'}</span>
                        </div>
                        <div className="flex items-center gap-6 mt-3 md:mt-0">
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Localização</span>
                            <span className="text-xs text-white">{s.city ? `${s.city} - ${s.uf}` : '-'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditSupplier(s)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors" title="Editar">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => handleDeleteSupplier(s.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors" title="Excluir">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {suppliers.length === 0 && !loading && (
                      <div className="text-center py-10 text-slate-600 bg-[#111a22]/50 border border-dashed border-slate-800 rounded-xl">
                        Nenhum fornecedor cadastrado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status' && (
              <div className="flex flex-col gap-6 animate-in fade-in">
                <h3 className="text-xl font-bold text-white border-b border-surface-border pb-4 uppercase tracking-wider">Status de Movimentação</h3>
                <p className="text-slate-400 text-sm italic">Estes são os status padrão do sistema para controle do fluxo financeiro.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { s: 'Pendente', d: 'Lançamento registrado, mas ainda não concluído financialmente.' },
                    { s: 'Pago', d: 'Saída de recurso confirmada com documento ou comprovante.' },
                    { s: 'Recebido', d: 'Entrada de recurso confirmada na conta.' },
                    { s: 'Agendado', d: 'Lançamento programado para uma data futura.' },
                    { s: 'Conciliado', d: 'Lançamento verificado contra o extrato bancário.' },
                    { s: 'Estornado', d: 'Lançamento cancelado com reversão de valores.' }
                  ].map(item => (
                    <div key={item.s} className="bg-[#111a22] p-4 rounded-xl border border-surface-border flex flex-col gap-1">
                      <span className="text-primary font-black uppercase text-xs">{item.s}</span>
                      <span className="text-slate-400 text-xs">{item.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="flex flex-col gap-6 animate-in fade-in">
                <h3 className="text-xl font-bold text-white border-b border-surface-border pb-4 uppercase tracking-wider">Tipos de Pagamento</h3>

                <div className="bg-[#111a22] p-6 rounded-xl border border-surface-border flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Novo Tipo de Pagamento</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPaymentMethod}
                        onChange={e => setNewPaymentMethod(e.target.value)}
                        placeholder="Ex: Pix, Cartão, Dinheiro..."
                        className="flex-1 bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                      />
                      <button onClick={handleCreatePaymentMethod} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded font-bold text-sm shadow-lg">Adicionar</button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className="bg-[#111a22] border border-surface-border px-4 py-2 rounded-full flex items-center gap-3 group">
                      <span className="text-sm font-bold text-white">{pm.name}</span>
                      <button onClick={() => handleDeletePaymentMethod(pm.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'periods' && (
              <div className="flex flex-col gap-8 animate-in fade-in">
                <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <span className="material-symbols-outlined text-3xl">calendar_month</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">Períodos do Sistema</h3>
                    <p className="text-slate-400 text-sm italic">Padronize os semestres e anos para registros de saldo e relatórios.</p>
                  </div>
                </div>

                <div className="bg-[#111a22] p-6 rounded-2xl border border-surface-border flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Nome do Período</label>
                      <input
                        type="text"
                        value={newPeriod.name}
                        onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })}
                        placeholder="Ex: 2025.1 ou 2025 - 2º Semestre"
                        className="w-full bg-surface-dark border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleCreatePeriod}
                        disabled={isSavingPeriod}
                        className="w-full h-[46px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSavingPeriod ? 'Salvando...' : 'Adicionar Período'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {periods.map(p => (
                      <div key={p.id} className="bg-surface-dark border border-surface-border rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                          <span className={`font-bold ${p.is_active ? 'text-white' : 'text-slate-500'}`}>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePeriod(p.id, p.is_active)}
                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors ${p.is_active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}
                          >
                            {p.is_active ? 'Ativo' : 'Inativo'}
                          </button>
                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {periods.length === 0 && !loading && (
                      <div className="md:col-span-2 text-center py-8 text-slate-500 italic border border-dashed border-slate-700 rounded-2xl">
                        Nenhum período cadastrado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'banks' && (
              <div className="flex flex-col gap-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-surface-border pb-4">
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Contas Bancárias da Instituição</h3>
                  {editingBankId && (
                    <button onClick={() => { setEditingBankId(null); setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' }); }} className="text-xs text-primary hover:underline">Cancelar Edição</button>
                  )}
                </div>

                <div className="bg-[#111a22] p-6 rounded-xl border border-surface-border flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Nome Identificador (Ex: Conta PDDE Principal)</label>
                      <input type="text" value={newBank.name} onChange={e => setNewBank({ ...newBank, name: e.target.value.toUpperCase() })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Vincular a Programa / Conta</label>
                      <select value={newBank.program_id} onChange={e => setNewBank({ ...newBank, program_id: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none">
                        <option value="">Selecione...</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Escola Responsável</label>
                      <select value={newBank.school_id} onChange={e => setNewBank({ ...newBank, school_id: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none">
                        <option value="">Selecione a Escola...</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Banco</label>
                      <input type="text" value={newBank.bank_name} onChange={e => setNewBank({ ...newBank, bank_name: e.target.value.toUpperCase() })} placeholder="Ex: Banco do Brasil" className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Agência</label>
                      <input type="text" value={newBank.agency} onChange={e => setNewBank({ ...newBank, agency: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">Número da Conta</label>
                      <input type="text" value={newBank.account_number} onChange={e => setNewBank({ ...newBank, account_number: e.target.value })} className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    {editingBankId && (
                      <button onClick={() => { setEditingBankId(null); setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' }); }} className="bg-surface-dark border border-surface-border text-white px-6 py-2 rounded font-bold text-sm">Cancelar</button>
                    )}
                    <button onClick={handleCreateBank} className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded font-bold text-sm shadow-lg">
                      {editingBankId ? 'Salvar Alterações' : 'Cadastrar Conta'}
                    </button>
                  </div>
                </div>

                {/* Bank List Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={e => setBankSearch(e.target.value)}
                      placeholder="Buscar conta..."
                      className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div className="w-full md:w-56">
                    <select
                      value={bankFilterProgram}
                      onChange={e => setBankFilterProgram(e.target.value)}
                      className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    >
                      <option value="">Todas as Contas</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-full md:w-56">
                    <select
                      value={bankFilterSchool}
                      onChange={e => setBankFilterSchool(e.target.value)}
                      className="w-full bg-[#111a22] border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    >
                      <option value="">Todas as Escolas</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankAccounts
                    .filter(b =>
                      (!bankSearch || b.name.toLowerCase().includes(bankSearch.toLowerCase()) || b.bank_name.toLowerCase().includes(bankSearch.toLowerCase())) &&
                      (!bankFilterProgram || b.program_id === bankFilterProgram) &&
                      (!bankFilterSchool || b.school_id === bankFilterSchool)
                    )
                    .map(bank => (
                      <div key={bank.id} className="bg-[#111a22] p-5 rounded-xl border border-surface-border flex justify-between items-center group">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{bank.name}</span>
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black uppercase">{bank.programs?.name}</span>
                          </div>
                          <span className="text-xs text-slate-400">{bank.bank_name} - Ag: {bank.agency} / Cc: {bank.account_number}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{bank.schools?.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditBank(bank)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteBank(bank.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="flex flex-col gap-8 animate-in fade-in">
                <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-3xl">contact_support</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-wider uppercase">Contatos Globais</h3>
                    <p className="text-slate-400 text-sm italic">Estes contatos serão exibidos para todos os usuários na página de Ajuda e Suporte.</p>
                  </div>
                </div>

                {loadingContacts ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">E-mail de Suporte</label>
                      <input
                        type="email"
                        value={supportContacts.email}
                        onChange={e => setSupportContacts({ ...supportContacts, email: e.target.value })}
                        placeholder="contato@empresa.com"
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Telefone de Contato</label>
                      <input
                        type="text"
                        value={supportContacts.phone}
                        onChange={e => setSupportContacts({ ...supportContacts, phone: formatPhone(e.target.value) })}
                        placeholder="(00) 0 0000-0000"
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                        maxLength={16}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">WhatsApp</label>
                      <input
                        type="text"
                        value={supportContacts.whatsapp}
                        onChange={e => setSupportContacts({ ...supportContacts, whatsapp: formatPhone(e.target.value) })}
                        placeholder="(00) 0 0000-0000"
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                        maxLength={16}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Instagram</label>
                      <input
                        type="text"
                        value={supportContacts.instagram}
                        onChange={e => setSupportContacts({ ...supportContacts, instagram: e.target.value })}
                        placeholder="@seunome"
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Site Oficial</label>
                      <input
                        type="text"
                        value={supportContacts.website}
                        onChange={e => setSupportContacts({ ...supportContacts, website: e.target.value })}
                        placeholder="www.empresa.com.br"
                        className="bg-[#111a22] border border-surface-border text-white rounded-lg px-4 py-2 focus:border-primary outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end pt-4">
                      <button
                        onClick={handleSaveContacts}
                        disabled={savingContacts}
                        className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">{savingContacts ? 'sync' : 'save'}</span>
                        {savingContacts ? 'Salvando...' : 'Salvar Contatos Globais'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-8 border-t border-surface-border pt-6">
            <button className="h-10 px-6 rounded-lg text-white font-medium hover:bg-[#233648] transition-colors">Restaurar Padrão</button>
            <button className="h-10 px-8 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20 transition-all">Salvar Alterações</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
