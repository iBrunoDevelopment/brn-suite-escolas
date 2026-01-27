import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Supplier } from '../types';

export const BRAZIL_STATES = [
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

const DEFAULT_PLANS = [
    {
        id: "bbagil_gestao",
        title: "BBÁgil & Gestão",
        subtitle: "Ferramentas Digitais",
        price_value: "R$ 300",
        price_period: "/mês",
        billing_info: "Valor mensal: R$ 300,00. Valor anual: R$ 3.600,00. O controle absoluto nas suas mãos.",
        features: [
            "BBÁgil Automático",
            "Livro Caixa Digital",
            "Livro Tombo Patrimonial",
            "Atas de Assembleia",
            "Planos de Ação"
        ],
        details: "O pacote completo de ferramentas digitais para facilitar a gestão do dia a dia. Inclui o BBÁgil para automação bancária, Livro Caixa, Livro Tombo e toda a parte de documentação de Atas e Planos de Ação. Uma solução robusta para a organização administrativa da sua escola.",
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
        billing_info: "Economia de R$ 150/mês! Valor anual: R$ 9.000,00. A solução completa e definitiva.",
        features: [
            "Tudo do plano Prestação de Contas",
            "Tudo do plano BBÁgil & Gestão",
            "Suporte VIP prioritário",
            "Economia real de R$ 1.800/ano"
        ],
        details: "A experiência máxima do BRN Suite. Este combo une nossa assessoria especializada e humana com toda a nossa tecnologia de ponta. Ao contratar o pacote FULL, você economiza R$ 150,00 mensais em relação à contratação individual dos serviços, garantindo gestão total e tecnologia por um preço muito mais competitivo.",
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
        billing_info: "Valor mensal: R$ 600,00. Valor anual: R$ 7.200,00. Tranquilidade e conformidade total.",
        features: [
            "Confecção de Notas e Espelhos",
            "Consolidação de Documentos",
            "Ordens de Compra e Serviço",
            "Atas de Compra e Certidões",
            "Recibos e Autenticações"
        ],
        details: "Este é o plano de assessoria especializada. Nós cuidamos de toda a parte burocrática da sua prestação de contas, garantindo que tudo esteja em conformidade com as normas vigentes. Inclui acompanhamento mensal e conferência minuciosa de documentos fiscais.",
        highlight: false,
        highlight_text: "",
        icon: "verified_user",
        order: 3
    }
];

export const useSettings = (user: User) => {
    const [activeTab, setActiveTab] = useState('profile');

    // Aux Data
    const [schools, setSchools] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);

    // Rubrics
    const [rubrics, setRubrics] = useState<any[]>([]);
    const [newRubric, setNewRubric] = useState({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
    const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
    const [rubricSearch, setRubricSearch] = useState('');
    const [rubricFilterProgram, setRubricFilterProgram] = useState('');
    const [rubricFilterSchool, setRubricFilterSchool] = useState('');

    // Programs
    const [newProgram, setNewProgram] = useState({ name: '', description: '' });

    // Suppliers
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [newSupplier, setNewSupplier] = useState({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [isUploadingStamp, setIsUploadingStamp] = useState(false);

    // Banks
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [newBank, setNewBank] = useState({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [bankSearch, setBankSearch] = useState('');
    const [bankFilterProgram, setBankFilterProgram] = useState('');
    const [bankFilterSchool, setBankFilterSchool] = useState('');

    // Payment Methods
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [newPaymentMethod, setNewPaymentMethod] = useState('');

    // Periods
    const [periods, setPeriods] = useState<any[]>([]);
    const [newPeriod, setNewPeriod] = useState({ name: '', is_active: true });
    const [isSavingPeriod, setIsSavingPeriod] = useState(false);

    // Profile & Password
    const [profileData, setProfileData] = useState({ name: user.name, email: user.email || '' });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Support Contacts
    const [supportContacts, setSupportContacts] = useState({ email: '', phone: '', whatsapp: '', instagram: '', website: '' });
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [savingContacts, setSavingContacts] = useState(false);

    // Plans
    const [plans, setPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [savingPlans, setSavingPlans] = useState(false);

    // Assets
    const [templateUrl, setTemplateUrl] = useState('');
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

    const [loading, setLoading] = useState(false);

    // Fetch functions
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
        const { data } = await supabase.from('rubrics').select(`
      *,
      programs (name),
      schools (name)
    `).order('name');
        if (data) setRubrics(data);
        setLoading(false);
    };

    const fetchSupplierData = async () => {
        setLoading(true);
        const { data } = await supabase.from('suppliers').select('*').order('name');
        if (data) setSuppliers(data);
        setLoading(false);
    };

    const fetchBankData = async () => {
        setLoading(true);
        const { data } = await supabase.from('bank_accounts').select('*, schools(name), programs(name)').order('name');
        if (data) setBankAccounts(data);
        setLoading(false);
    };

    const fetchPaymentData = async () => {
        setLoading(true);
        const { data } = await supabase.from('payment_methods').select('*').order('name');
        if (data) setPaymentMethods(data);
        setLoading(false);
    };

    const fetchPeriodData = async () => {
        setLoading(true);
        const { data } = await supabase.from('periods').select('*').order('name', { ascending: false });
        if (data) setPeriods(data);
        setLoading(false);
    };

    const fetchSupportContacts = async () => {
        setLoadingContacts(true);
        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'support_contacts').maybeSingle();
            if (data?.value) setSupportContacts(data.value);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchPlans = async () => {
        setLoadingPlans(true);
        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'landing_page_plans').maybeSingle();
            setPlans(data?.value || DEFAULT_PLANS);
        } finally {
            setLoadingPlans(false);
        }
    };

    const fetchAssets = async () => {
        setLoadingAssets(true);
        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'import_template_url').maybeSingle();
            if (data?.value) setTemplateUrl(data.value);
        } finally {
            setLoadingAssets(false);
        }
    };

    const fetchCities = async (uf: string) => {
        setLoadingCities(true);
        try {
            const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
            const data = await response.json();
            setCities(data.map((c: any) => c.nome).sort());
        } finally {
            setLoadingCities(false);
        }
    };

    // Actions
    const handleSaveRubric = async () => {
        if (!newRubric.name || !newRubric.program_id) return alert('Nome e Programa são obrigatórios');
        const payload = { ...newRubric, school_id: newRubric.school_id || null };

        let error;
        if (editingRubricId) {
            const { error: err } = await supabase.from('rubrics').update(payload).eq('id', editingRubricId);
            error = err;
        } else {
            const { error: err } = await supabase.from('rubrics').insert(payload);
            error = err;
        }

        if (error) alert('Erro ao salvar rubrica: ' + error.message);
        else {
            setNewRubric({ name: '', program_id: '', school_id: '', default_nature: 'Custeio' });
            setEditingRubricId(null);
            fetchRubricData();
        }
    };

    const handleDeleteRubric = async (id: string) => {
        if (!confirm('Tem certeza? Isso excluirá a rubrica permanentemente.')) return;
        const { error } = await supabase.from('rubrics').delete().eq('id', id);
        if (error) alert('Não foi possível excluir. Provavelmente esta rubrica já possui lançamentos.');
        else fetchRubricData();
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

    const handleCreateProgram = async () => {
        if (!newProgram.name) return alert('Nome do programa é obrigatório');
        const { error } = await supabase.from('programs').insert(newProgram);
        if (error) alert('Erro ao criar programa');
        else {
            setNewProgram({ name: '', description: '' });
            fetchAuxOptions();
            fetchRubricData();
        }
    };

    const handleDeleteProgram = async (id: string) => {
        if (!confirm('Isso pode afetar as rubricas vinculadas. Continuar?')) return;
        await supabase.from('programs').delete().eq('id', id);
        fetchAuxOptions();
        fetchRubricData();
    };

    const handleCreateSupplier = async () => {
        if (!newSupplier.name) return alert('Nome é obrigatório');

        let error;
        if (editingSupplierId) {
            const { error: err } = await supabase.from('suppliers').update(newSupplier).eq('id', editingSupplierId);
            error = err;
        } else {
            const { error: err } = await supabase.from('suppliers').insert(newSupplier);
            error = err;
        }

        if (error) alert('Erro ao salvar fornecedor: ' + error.message);
        else {
            setNewSupplier({ name: '', cnpj: '', email: '', phone: '', cep: '', address: '', city: '', uf: '', stamp_url: '' });
            setEditingSupplierId(null);
            fetchSupplierData();
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

    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingStamp(true);
        try {
            const fileName = `stamps/${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('attachments').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
            setNewSupplier(prev => ({ ...prev, stamp_url: publicUrl }));
        } catch (err: any) { alert(err.message); } finally { setIsUploadingStamp(false); }
    };

    const handleCreateBank = async () => {
        if (!newBank.name || !newBank.bank_name || !newBank.program_id) return alert('Nome, Banco e Programa são obrigatórios');
        const payload = { ...newBank, school_id: newBank.school_id || null, program_id: newBank.program_id || null };

        let error;
        if (editingBankId) {
            const { error: err } = await supabase.from('bank_accounts').update(payload).eq('id', editingBankId);
            error = err;
        } else {
            const { error: err } = await supabase.from('bank_accounts').insert(payload);
            error = err;
        }

        if (error) alert('Erro ao salvar conta bancária');
        else {
            setNewBank({ name: '', bank_name: '', agency: '', account_number: '', school_id: '', program_id: '' });
            setEditingBankId(null);
            fetchBankData();
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

    const handleCreatePaymentMethod = async () => {
        if (!newPaymentMethod) return alert('Nome é obrigatório');
        const { error } = await supabase.from('payment_methods').insert({ name: newPaymentMethod });
        if (error) alert('Erro ao criar método');
        else { setNewPaymentMethod(''); fetchPaymentData(); }
    };

    const handleDeletePaymentMethod = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        await supabase.from('payment_methods').delete().eq('id', id);
        fetchPaymentData();
    };

    const handleCreatePeriod = async () => {
        if (!newPeriod.name) return alert('Nome é obrigatório');
        setIsSavingPeriod(true);
        const { error } = await supabase.from('periods').insert(newPeriod);
        if (error) alert('Erro ao criar período');
        else { setNewPeriod({ name: '', is_active: true }); fetchPeriodData(); }
        setIsSavingPeriod(false);
    };

    const handleTogglePeriod = async (id: string, current: boolean) => {
        await supabase.from('periods').update({ is_active: !current }).eq('id', id);
        fetchPeriodData();
    };

    const handleDeletePeriod = async (id: string) => {
        if (!confirm('Excluir este período?')) return;
        await supabase.from('periods').delete().eq('id', id);
        fetchPeriodData();
    };

    const handleUpdateProfile = async () => {
        if (!profileData.name.trim()) return alert('Nome é obrigatório');
        setUpdatingProfile(true);
        try {
            const { error } = await supabase.from('users').update({ name: profileData.name.trim() }).eq('id', user.id);
            if (error) throw error;
            alert('Perfil atualizado!');
        } catch (err: any) { alert(err.message); } finally { setUpdatingProfile(false); }
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) return alert('Senhas não coincidem');
        if (passwords.new.length < 6) return alert('Mínimo 6 caracteres');
        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwords.new });
            if (error) throw error;
            alert('Senha atualizada!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err: any) { alert(err.message); } finally { setUpdatingPassword(false); }
    };

    const handleSaveContacts = async () => {
        setSavingContacts(true);
        try {
            const { error } = await supabase.from('system_settings').upsert({ key: 'support_contacts', value: supportContacts, updated_at: new Date().toISOString() });
            if (error) throw error;
            alert('Contatos salvos!');
        } catch (err: any) { alert(err.message); } finally { setSavingContacts(false); }
    };

    const handleSavePlans = async () => {
        setSavingPlans(true);
        try {
            const { error } = await supabase.from('system_settings').upsert({ key: 'landing_page_plans', value: plans, updated_at: new Date().toISOString() });
            if (error) throw error;
            alert('Planos salvos!');
        } catch (err: any) { alert(err.message); } finally { setSavingPlans(false); }
    };

    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingTemplate(true);
        try {
            const fileName = `templates/model_${Date.now()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('attachments').upload(fileName, file);
            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
            await supabase.from('system_settings').upsert({ key: 'import_template_url', value: publicUrl }, { onConflict: 'key' });
            setTemplateUrl(publicUrl);
            alert('Modelo atualizado!');
        } catch (err: any) { alert(err.message); } finally { setIsUploadingTemplate(false); }
    };

    const updatePlanField = (index: number, field: string, value: any) => {
        const newPlans = [...plans];
        newPlans[index] = { ...newPlans[index], [field]: value };
        setPlans(newPlans);
    };

    const handleAddFeature = (planIndex: number) => {
        const updatedPlans = [...plans];
        if (!updatedPlans[planIndex].features) updatedPlans[planIndex].features = [];
        updatedPlans[planIndex].features.push("");
        setPlans(updatedPlans);
    };

    const handleRemoveFeature = (planIndex: number, featureIndex: number) => {
        const updatedPlans = [...plans];
        updatedPlans[planIndex].features = updatedPlans[planIndex].features.filter((_: any, i: number) => i !== featureIndex);
        setPlans(updatedPlans);
    };

    const handleUpdateFeature = (planIndex: number, featureIndex: number, value: string) => {
        const updatedPlans = [...plans];
        updatedPlans[planIndex].features[featureIndex] = value;
        setPlans(updatedPlans);
    };

    return {
        activeTab, setActiveTab,
        schools, programs, cities, loadingCities,
        rubrics, newRubric, setNewRubric, editingRubricId, setEditingRubricId, rubricSearch, setRubricSearch, rubricFilterProgram, setRubricFilterProgram, rubricFilterSchool, setRubricFilterSchool,
        newProgram, setNewProgram,
        suppliers, newSupplier, setNewSupplier, editingSupplierId, setEditingSupplierId, isUploadingStamp,
        bankAccounts, newBank, setNewBank, editingBankId, setEditingBankId, bankSearch, setBankSearch, bankFilterProgram, setBankFilterProgram, bankFilterSchool, setBankFilterSchool,
        paymentMethods, newPaymentMethod, setNewPaymentMethod,
        periods, newPeriod, setNewPeriod, isSavingPeriod,
        profileData, setProfileData, updatingProfile, passwords, setPasswords, updatingPassword,
        supportContacts, setSupportContacts, loadingContacts, savingContacts,
        plans, setPlans, loadingPlans, savingPlans,
        templateUrl, loadingAssets, isUploadingTemplate,
        loading,
        fetchAuxOptions, fetchRubricData, fetchSupplierData, fetchBankData, fetchPaymentData, fetchPeriodData, fetchSupportContacts, fetchPlans, fetchAssets, fetchCities,
        handleSaveRubric, handleEditRubric, handleDeleteRubric, handleCreateProgram, handleDeleteProgram,
        handleCreateSupplier, handleEditSupplier, handleDeleteSupplier, handleStampUpload,
        handleCreateBank, handleEditBank, handleDeleteBank,
        handleCreatePaymentMethod, handleDeletePaymentMethod,
        handleCreatePeriod, handleTogglePeriod, handleDeletePeriod,
        handleUpdateProfile, handleChangePassword,
        handleSaveContacts, handleSavePlans, handleTemplateUpload,
        updatePlanField, handleAddFeature, handleRemoveFeature, handleUpdateFeature
    };
};
