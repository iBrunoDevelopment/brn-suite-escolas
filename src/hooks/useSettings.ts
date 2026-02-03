import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { compressImage } from '../lib/imageUtils';
import { User } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const BRAZIL_STATES = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

const DEFAULT_PLANS = [
    {
        id: "bbagil_gestao",
        title: "BBÁgil & Gestão",
        subtitle: "Ferramentas Digitais",
        price_value: "R$ 300",
        price_period: "/mês",
        billing_info: "Valor mensal: R$ 300,00. Valor anual: R$ 3.600,00. O controle absoluto nas suas mãos.",
        features: ["BBÁgil Automático", "Livro Caixa Digital", "Livro Tombo Patrimonial", "Atas de Assembleia", "Planos de Ação"],
        details: "O pacote completo de ferramentas digitais para facilitar a gestão do dia a dia.",
        highlight: false,
        highlight_text: "",
        icon: "auto_awesome",
        order: 1
    },
    {
        id: "combo_full",
        title: "BRN Suite FULL",
        subtitle: "Assessoria + Tecnologia",
        price_value: "R$ 750",
        price_period: "/mês",
        billing_info: "Economia de R$ 150/mês!",
        features: ["Tudo do plano Prestação de Contas", "Tudo do plano BBÁgil & Gestão", "Suporte VIP prioritário"],
        details: "A experiência máxima do BRN Suite.",
        highlight: true,
        highlight_text: "Melhor Custo-Benefício",
        icon: "star",
        order: 2
    },
    {
        id: "prestacao_contas",
        title: "Prestação de Contas",
        subtitle: "Assessoria Especializada",
        price_value: "R$ 600",
        price_period: "/mês",
        billing_info: "Valor mensal: R$ 600,00.",
        features: ["Confecção de Notas e Espelhos", "Consolidação de Documentos", "Ordens de Compra e Serviço"],
        details: "Este é o plano de assessoria especializada.",
        highlight: false,
        highlight_text: "",
        icon: "verified_user",
        order: 3
    }
];

export const useSettings = (user: User) => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('profile');

    // --- FORM STATES ---
    const [newRubric, setNewRubric] = useState({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
    const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
    const [rubricSearch, setRubricSearch] = useState('');
    const [rubricFilterProgram, setRubricFilterProgram] = useState('');
    const [rubricFilterSchool, setRubricFilterSchool] = useState('');

    const [newProgram, setNewProgram] = useState({ name: '', description: '' });

    const [newSupplier, setNewSupplier] = useState({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [isUploadingStamp, setIsUploadingStamp] = useState(false);

    const [newBank, setNewBank] = useState({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [bankSearch, setBankSearch] = useState('');
    const [bankFilterProgram, setBankFilterProgram] = useState('');
    const [bankFilterSchool, setBankFilterSchool] = useState('');

    const [newPaymentMethod, setNewPaymentMethod] = useState('');
    const [newPeriod, setNewPeriod] = useState({ name: '', is_active: true });

    const [profileData, setProfileData] = useState({ name: user.name, email: user.email || '' });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    const [cities, setCities] = useState<string[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);

    // --- QUERIES ---
    const { data: schools = [] } = useQuery({ queryKey: ['schools'], queryFn: async () => (await supabase.from('schools').select('*').order('name')).data || [] });
    const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: async () => (await supabase.from('programs').select('*').order('name')).data || [] });
    const { data: rubrics = [], isLoading: loadingRubrics } = useQuery({
        queryKey: ['rubrics'],
        queryFn: async () => (await supabase.from('rubrics').select('*, programs(name), schools(name)').order('name')).data || []
    });
    const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await supabase.from('suppliers').select('*').order('name')).data || [] });
    const { data: bankAccounts = [], isLoading: loadingBanks } = useQuery({
        queryKey: ['bank_accounts'],
        queryFn: async () => (await supabase.from('bank_accounts').select('*, schools(name), programs(name)').order('name')).data || []
    });
    const { data: paymentMethods = [], isLoading: loadingPayments } = useQuery({ queryKey: ['payment_methods'], queryFn: async () => (await supabase.from('payment_methods').select('*').order('name')).data || [] });
    const { data: periods = [], isLoading: loadingPeriods } = useQuery({ queryKey: ['periods'], queryFn: async () => (await supabase.from('periods').select('*').order('name', { ascending: false })).data || [] });

    const { data: systemSettings = { contacts: { email: '', phone: '', whatsapp: '', instagram: '', website: '' }, plans: DEFAULT_PLANS, templateUrl: '' } } = useQuery({
        queryKey: ['system_settings'],
        queryFn: async () => {
            const { data } = await supabase.from('system_settings').select('key, value');
            const map: any = {};
            data?.forEach(d => map[d.key] = d.value);
            return {
                contacts: map.support_contacts || { email: '', phone: '', whatsapp: '', instagram: '', website: '' },
                plans: map.landing_page_plans || DEFAULT_PLANS,
                templateUrl: map.import_template_url || ''
            };
        }
    });

    // Derived states (reactive to systemSettings)
    const [localPlans, setLocalPlans] = React.useState<any[]>([]);
    const [localContacts, setLocalContacts] = React.useState<any>({ email: '', phone: '', whatsapp: '', instagram: '', website: '' });

    React.useEffect(() => {
        if (systemSettings) {
            setLocalPlans(systemSettings.plans);
            setLocalContacts(systemSettings.contacts);
        }
    }, [systemSettings]);

    // --- MUTATIONS ---
    const createMutation = (table: string, queryKey: string[], onSuccess?: () => void) => useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from(table).insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            onSuccess?.();
        }
    });

    const updateMutation = (table: string, queryKey: string[], onSuccess?: () => void) => useMutation({
        mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
            const { error } = await supabase.from(table).update(payload).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            onSuccess?.();
        }
    });

    const deleteMutation = (table: string, queryKey: string[]) => useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey })
    });

    // Specific Mutations
    const saveRubricMut = useMutation({
        mutationFn: async (payload: any) => {
            if (editingRubricId) await supabase.from('rubrics').update(payload).eq('id', editingRubricId);
            else await supabase.from('rubrics').insert(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rubrics'] });
            setNewRubric({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
            setEditingRubricId(null);
        }
    });

    const saveSupplierMut = useMutation({
        mutationFn: async (payload: any) => {
            if (editingSupplierId) await supabase.from('suppliers').update(payload).eq('id', editingSupplierId);
            else await supabase.from('suppliers').insert(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setNewSupplier({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
            setEditingSupplierId(null);
        }
    });

    const saveBankMut = useMutation({
        mutationFn: async (payload: any) => {
            if (editingBankId) await supabase.from('bank_accounts').update(payload).eq('id', editingBankId);
            else await supabase.from('bank_accounts').insert(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
            setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
            setEditingBankId(null);
        }
    });

    const upsertSettingMut = useMutation({
        mutationFn: async ({ key, value }: { key: string, value: any }) => {
            const { error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system_settings'] })
    });

    const updateProfileMut = useMutation({
        mutationFn: async (name: string) => await supabase.from('users').update({ name }).eq('id', user.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current_user'] });
            addToast('Perfil atualizado com sucesso!', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    // --- HANDLERS ---
    const handleSaveRubric = () => {
        if (!newRubric.name || !newRubric.program_id) return addToast('Preencha os campos obrigatórios', 'warning');
        saveRubricMut.mutate({ ...newRubric, school_id: newRubric.school_id || null });
    };

    const handleDeleteRubric = (id: string) => confirm('Excluir?') && deleteMutation('rubrics', ['rubrics']).mutate(id);

    const handleCreateProgram = () => newProgram.name && createMutation('programs', ['programs'], () => { setNewProgram({ name: '', description: '' }); addToast('Programa criado!', 'success'); }).mutate(newProgram);

    const handleDeleteProgram = (id: string) => confirm('Excluir?') && deleteMutation('programs', ['programs']).mutate(id);

    const handleCreateSupplier = () => {
        if (!newSupplier.name) return addToast('Nome obrigatório', 'warning');
        saveSupplierMut.mutate(newSupplier);
    };

    const handleDeleteSupplier = (id: string) => confirm('Excluir?') && deleteMutation('suppliers', ['suppliers']).mutate(id);

    const handleCreateBank = () => {
        if (!newBank.name || !newBank.bank_name) return addToast('Campos obrigatórios', 'warning');
        saveBankMut.mutate({ ...newBank, school_id: newBank.school_id || null, program_id: newBank.program_id || null });
    };

    const handleDeleteBank = (id: string) => confirm('Excluir?') && deleteMutation('bank_accounts', ['bank_accounts']).mutate(id);

    const handleCreatePaymentMethod = () => newPaymentMethod && createMutation('payment_methods', ['payment_methods'], () => { setNewPaymentMethod(''); addToast('Método de pagamento criado!', 'success'); }).mutate({ name: newPaymentMethod });

    const handleDeletePaymentMethod = (id: string) => confirm('Excluir?') && deleteMutation('payment_methods', ['payment_methods']).mutate(id);

    const handleCreatePeriod = () => newPeriod.name && createMutation('periods', ['periods'], () => { setNewPeriod({ name: '', is_active: true }); addToast('Período criado!', 'success'); }).mutate(newPeriod);

    const handleTogglePeriod = (id: string, current: boolean) => updateMutation('periods', ['periods'], () => addToast(`Período ${current ? 'desativado' : 'ativado'}!`, 'success')).mutate({ id, payload: { is_active: !current } });

    const handleDeletePeriod = (id: string) => confirm('Excluir?') && deleteMutation('periods', ['periods']).mutate(id);

    const handleUpdateProfile = () => profileData.name.trim() && updateProfileMut.mutate(profileData.name.trim());

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) return addToast('Senhas não conferem', 'warning');
        if (!passwords.new) return;

        const { error } = await supabase.auth.updateUser({ password: passwords.new });
        if (error) addToast(error.message, 'error');
        else { addToast('Senha alterada com sucesso!', 'success'); setPasswords({ current: '', new: '', confirm: '' }); }
    };

    const handleSaveContacts = () => upsertSettingMut.mutate({ key: 'support_contacts', value: localContacts }, { onSuccess: () => addToast('Contatos salvos!', 'success') });
    const handleSavePlans = () => upsertSettingMut.mutate({ key: 'landing_page_plans', value: localPlans }, { onSuccess: () => addToast('Planos salvos!', 'success') });

    const fetchCities = async (uf: string) => {
        setLoadingCities(true);
        try {
            const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
            const data = await res.json();
            setCities(data.map((c: any) => c.nome).sort());
        } finally { setLoadingCities(false); }
    };

    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingStamp(true);
        try {
            const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
            const fileName = `stamps/${Date.now()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('attachments').upload(fileName, processedFile);
            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
            setNewSupplier(prev => ({ ...prev, stamp_url: publicUrl }));
            addToast('Carimbo enviado com sucesso!', 'success');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally { setIsUploadingStamp(false); }
    };

    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const fileName = `templates/model_${Date.now()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('attachments').upload(fileName, file);
            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
            upsertSettingMut.mutate({ key: 'import_template_url', value: publicUrl }, { onSuccess: () => addToast('Modelo atualizado!', 'success') });
        } catch (err: any) { addToast(err.message, 'error'); }
    };

    return {
        activeTab, setActiveTab,
        schools, programs, cities, loadingCities,
        rubrics, newRubric, setNewRubric, editingRubricId, setEditingRubricId, rubricSearch, setRubricSearch, rubricFilterProgram, setRubricFilterProgram, rubricFilterSchool, setRubricFilterSchool,
        newProgram, setNewProgram,
        suppliers, newSupplier, setNewSupplier, editingSupplierId, setEditingSupplierId, isUploadingStamp,
        bankAccounts, newBank, setNewBank, editingBankId, setEditingBankId, bankSearch, setBankSearch, bankFilterProgram, setBankFilterProgram, bankFilterSchool, setBankFilterSchool,
        paymentMethods, newPaymentMethod, setNewPaymentMethod,
        periods, newPeriod, setNewPeriod, isSavingPeriod: createMutation('periods', []).isPending,
        profileData, setProfileData, updatingProfile: updateProfileMut.isPending, passwords, setPasswords,
        updatingPassword: false,
        supportContacts: localContacts, setSupportContacts: setLocalContacts, loadingContacts: false, savingContacts: upsertSettingMut.isPending,
        plans: localPlans, setPlans: setLocalPlans, loadingPlans: false, savingPlans: upsertSettingMut.isPending,
        templateUrl: systemSettings.templateUrl, loadingAssets: false, isUploadingTemplate: false,
        loading: loadingRubrics || loadingSuppliers || loadingBanks || loadingPayments || loadingPeriods,
        fetchAuxOptions: () => { }, // Compatibility
        fetchRubricData: () => { },
        fetchSupplierData: () => { },
        fetchBankData: () => { },
        fetchPaymentData: () => { },
        fetchPeriodData: () => { },
        fetchSupportContacts: () => { },
        fetchPlans: () => { },
        fetchAssets: () => { },
        fetchCities,
        handleSaveRubric, handleEditRubric: (r: any) => { setNewRubric({ name: r.name, program_id: r.program_id, school_id: r.school_id || '', default_nature: r.default_nature || 'Custeio' }); setEditingRubricId(r.id); },
        handleDeleteRubric, handleCreateProgram, handleDeleteProgram,
        handleCreateSupplier, handleEditSupplier: (s: any) => { setNewSupplier({ ...s }); setEditingSupplierId(s.id); },
        handleDeleteSupplier, handleStampUpload,
        handleCreateBank, handleEditBank: (b: any) => { setNewBank({ ...b, school_id: b.school_id || '', program_id: b.program_id || '' }); setEditingBankId(b.id); },
        handleDeleteBank,
        handleCreatePaymentMethod, handleDeletePaymentMethod,
        handleCreatePeriod, handleTogglePeriod, handleDeletePeriod,
        handleUpdateProfile, handleChangePassword,
        handleSaveContacts, handleSavePlans, handleTemplateUpload,
        updatePlanField: (i: number, f: string, v: any) => { const p = [...localPlans]; p[i] = { ...p[i], [f]: v }; setLocalPlans(p); },
        handleAddFeature: (pi: number) => { const p = [...localPlans]; if (!p[pi].features) p[pi].features = []; p[pi].features.push(""); setLocalPlans(p); },
        handleRemoveFeature: (pi: number, fi: number) => { const p = [...localPlans]; p[pi].features = p[pi].features.filter((_: any, i: number) => i !== fi); setLocalPlans(p); },
        handleUpdateFeature: (pi: number, fi: number, v: string) => { const p = [...localPlans]; p[pi].features[fi] = v; setLocalPlans(p); },
        handleAddPlan: () => {
            const newPlan = {
                id: `custom_${Date.now()}`,
                title: 'Novo Plano',
                subtitle: 'Personalizado',
                price_value: '0',
                price_period: '/mês',
                billing_info: '',
                features: [],
                details: '',
                highlight: false,
                highlight_text: '',
                icon: 'auto_awesome',
                order: localPlans.length + 1
            };
            setLocalPlans([...localPlans, newPlan]);
        }
    };
};
