
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, School, UserRole, ContractSignature } from '../types';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';
import { useToast } from '../context/ToastContext';
import { compressImage } from '../lib/imageUtils';
import Contract from './Contract';

const Schools: React.FC<{ user: User }> = ({ user }) => {
    const [schools, setSchools] = useState<School[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [gees, setGees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [viewingContract, setViewingContract] = useState<{ school: School, directorUser: User, signature: ContractSignature } | null>(null);
    const [isFetchingContract, setIsFetchingContract] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);

    // Verificação de Acesso
    const isAuthorized = user.role === UserRole.ADMIN || user.role === UserRole.OPERADOR || user.role === UserRole.TECNICO_GEE;

    // Permissions
    const schoolPerm = usePermissions(user, 'schools');
    const filteredSchools = useAccessibleSchools(user, schools);
    const { addToast } = useToast();

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-slate-500">
                <span className="material-symbols-outlined text-6xl opacity-20">lock</span>
                <p className="text-xl font-bold">Acesso Restrito</p>
                <p className="text-sm">Você não tem permissão para gerenciar escolas.</p>
            </div>
        );
    }

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        inep: '',
        seec: '',
        conselho_escolar: '',
        cnpj: '',
        phone: '',
        director: '',
        secretary: '',
        address: '',
        city: '',
        uf: '',
        image_url: '',
        gee: '',
        gee_id: '',
        plan_id: '',
        custom_price: '',
        custom_title: '',
        discount_value: 0,
        director_cpf: '',
        director_rg: '',
        director_address: ''
    });

    useEffect(() => {
        fetchSchools();
        fetchGEEs();
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'landing_page_plans').maybeSingle();
        if (data?.value) setAvailablePlans(data.value);
    };

    useEffect(() => {
        if (formData.uf) {
            fetchCities(formData.uf);
        } else {
            setCities([]);
        }
    }, [formData.uf]);

    const fetchGEEs = async () => {
        const { data } = await supabase.from('gee').select('id, name').order('name');
        if (data) setGees(data);
    };

    const fetchSchools = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('schools')
            .select('*')
            .order('name');

        if (data) setSchools(data);
        if (error) console.error('Error fetching schools:', error);
        setLoading(false);
    };

    const fetchCities = async (uf: string) => {
        setIsLoadingCities(true);
        try {
            const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
            const data = await response.json();
            setCities(data.map((c: any) => c.nome).sort());
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setIsLoadingCities(false);
        }
    };

    // Masks
    const formatCNPJ = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
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

    const formatCPFCNPJ_Local = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length <= 11) {
            return cleanValue
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .slice(0, 14);
        }
        return cleanValue
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .slice(0, 18);
    };

    const handleSave = async () => {
        if (!formData.name) {
            addToast('O nome da escola é obrigatório.', 'warning');
            return;
        }

        setLoading(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('schools')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('schools')
                    .insert([formData]);
                if (error) throw error;
            }

            setShowForm(false);
            resetForm();
            fetchSchools();
        } catch (error: any) {
            addToast(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (school: School) => {
        setEditingId(school.id);
        setFormData({
            name: school.name,
            inep: school.inep || '',
            seec: school.seec || '',
            conselho_escolar: school.conselho_escolar || '',
            cnpj: school.cnpj || '',
            phone: school.phone || '',
            director: school.director || '',
            secretary: school.secretary || '',
            address: school.address || '',
            city: school.city || '',
            uf: school.uf || '',
            image_url: school.image_url || '',
            gee: school.gee || '',
            gee_id: school.gee_id || '',
            plan_id: school.plan_id || '',
            custom_price: school.custom_price || '',
            custom_title: school.custom_title || '',
            discount_value: school.discount_value || 0,
            director_cpf: school.director_cpf || '',
            director_rg: school.director_rg || '',
            director_address: school.director_address || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta escola?')) return;

        setLoading(true);
        const { error } = await supabase
            .from('schools')
            .delete()
            .eq('id', id);

        if (error) {
            addToast(`Erro ao excluir: ${error.message}`, 'error');
        } else {
            addToast('Escola excluída com sucesso', 'success');
            fetchSchools();
        }
        setLoading(false);
    };

    const handleViewContract = async (school: School) => {
        setIsFetchingContract(true);
        try {
            // 1. Buscar o usuário diretor da escola
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('school_id', school.id)
                .eq('role', UserRole.DIRETOR)
                .limit(1)
                .maybeSingle();

            if (userError || !userData) {
                addToast('Não foi possível localizar o cadastro do diretor vinculado a esta escola.', 'warning');
                return;
            }

            // 2. Buscar a assinatura do contrato deste diretor
            const { data: sigData, error: sigError } = await supabase
                .from('contract_signatures')
                .select('*')
                .eq('user_id', userData.id)
                .order('signed_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sigError || !sigData) {
                addToast('Este diretor ainda não assinou o contrato digital.', 'info');
                return;
            }

            setViewingContract({
                school,
                directorUser: userData,
                signature: sigData
            });
        } catch (error: any) {
            addToast('Erro ao carregar contrato: ' + error.message, 'error');
        } finally {
            setIsFetchingContract(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
            const fileExt = file.name.split('.').pop();
            const fileName = `logos/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, processedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error: any) {
            addToast(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            inep: '',
            seec: '',
            conselho_escolar: '',
            cnpj: '',
            phone: '',
            director: '',
            secretary: '',
            address: '',
            city: '',
            uf: '',
            image_url: '',
            gee: '',
            gee_id: '',
            plan_id: '',
            custom_price: '',
            custom_title: '',
            discount_value: 0,
            director_cpf: '',
            director_rg: '',
            director_address: ''
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">
                    Escolas
                    <span className="text-sm font-normal text-slate-400 block">Gestão de Unidades Escolares</span>
                </h1>

                {schoolPerm.canCreate && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span> Nova Escola
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && schools.length === 0 ? (
                    <div className="col-span-full animate-pulse text-center py-20 text-slate-400">Carregando escolas...</div>
                ) : filteredSchools.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-500">Nenhuma escola disponível ou permissão insuficiente.</div>
                ) : filteredSchools.map(school => (
                    <div key={school.id} className="bg-surface-dark border border-surface-border rounded-2xl overflow-hidden shadow-xl hover:border-primary/50 transition-all group">
                        <div className="h-32 bg-gradient-to-r from-primary/20 to-blue-600/20 relative">
                            {school.image_url ? (
                                <img src={school.image_url} alt={school.name} className="w-24 h-24 rounded-2xl object-cover absolute -bottom-6 left-6 border-4 border-[#0f172a] shadow-2xl" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-[#0f172a] flex items-center justify-center absolute -bottom-6 left-6 border-4 border-[#0f172a] shadow-2xl">
                                    <span className="material-symbols-outlined text-4xl text-primary">school</span>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {schoolPerm.canEdit && (
                                    <button onClick={() => handleEdit(school)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-lg text-white"><span className="material-symbols-outlined text-sm">edit</span></button>
                                )}
                                {schoolPerm.canDelete && (
                                    <button onClick={() => handleDelete(school.id)} className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md p-2 rounded-lg text-red-400"><span className="material-symbols-outlined text-sm">delete</span></button>
                                )}
                            </div>
                        </div>
                        <div className="p-8 pt-10">
                            <h3 className="text-xl font-bold text-white mb-1">{school.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wider mb-2">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Codes: {school.inep || 'N/A'} / {school.seec || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase mb-4">
                                <span className="material-symbols-outlined text-xs">map</span>
                                {school.gee || 'SEM REGIONAL'}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="material-symbols-outlined text-sm shrink-0">person</span>
                                    <span className="truncate">Dir: {school.director || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="material-symbols-outlined text-sm shrink-0">edit_note</span>
                                    <span className="truncate">Sec: {school.secretary || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="material-symbols-outlined text-sm shrink-0">location_on</span>
                                    <span className="truncate">{school.city}/{school.uf || '??'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="material-symbols-outlined text-sm shrink-0">call</span>
                                    <span>{school.phone || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100/5 flex items-center justify-between">
                                <button
                                    onClick={() => handleViewContract(school)}
                                    disabled={isFetchingContract}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">description</span>
                                    Ver Contrato
                                </button>

                                <span className="text-[9px] text-slate-600 font-bold uppercase">BRN Suite v1.0</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
                    <div className="w-full md:max-w-2xl h-full bg-[#0f172a] border-l border-surface-border flex flex-col shadow-2xl animate-in slide-in-from-right">
                        <div className="p-6 border-b border-surface-border flex justify-between items-center bg-[#1e293b]">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Editar Escola' : 'Nova Escola'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {/* Logo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Logo da Escola" className="w-32 h-32 rounded-3xl object-cover border-4 border-slate-700 shadow-xl" />
                                    ) : (
                                        <div className="w-32 h-32 rounded-3xl bg-slate-800 flex items-center justify-center border-4 border-slate-700 border-dashed">
                                            <span className="material-symbols-outlined text-4xl text-slate-600">add_a_photo</span>
                                        </div>
                                    )}
                                    <input type="file" onChange={handleImageUpload} className="hidden" id="logo-input" accept="image/*" />
                                    <label htmlFor="logo-input" className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl text-white font-bold text-xs uppercase">Alterar Logo</label>
                                    {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl"><span className="material-symbols-outlined animate-spin text-white">sync</span></div>}
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Logotipo da Instituição</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome da Instituição (Escola)</label>
                                    <input type="text" aria-label="Nome da Instituição (Escola)" placeholder="Ex: ESCOLA ESTADUAL..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">CNPJ</label>
                                    <input type="text" aria-label="CNPJ" value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" placeholder="00.000.000/0001-00" maxLength={18} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Telefone</label>
                                    <input type="text" aria-label="Telefone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" placeholder="(00) 0 0000-0000" maxLength={16} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Código INEP</label>
                                    <input type="text" aria-label="Código INEP" placeholder="00000000" value={formData.inep} onChange={e => setFormData({ ...formData, inep: e.target.value })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Código SEEC</label>
                                    <input type="text" aria-label="Código SEEC" placeholder="000" value={formData.seec} onChange={e => setFormData({ ...formData, seec: e.target.value })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="school_gee_id" className="text-xs font-bold text-slate-400 uppercase mb-1 block">Regional (GEE)</label>
                                    <select
                                        title="Regional (GEE)"
                                        aria-label="Regional (GEE)"
                                        id="school_gee_id"
                                        value={formData.gee_id}
                                        onChange={e => {
                                            const selected = gees.find(g => g.id === e.target.value);
                                            setFormData({ ...formData, gee_id: e.target.value, gee: selected ? selected.name : '' });
                                        }}
                                        className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none"
                                    >
                                        <option value="">Selecione uma regional...</option>
                                        {gees.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Vincule esta escola a uma Gerência Executiva para gestão de técnicos.</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="school_plan_id" className="text-xs font-bold text-slate-400 uppercase mb-1 block">Plano Contratado</label>
                                    <select
                                        title="Plano Contratado"
                                        aria-label="Plano Contratado"
                                        id="school_plan_id"
                                        value={formData.plan_id}
                                        onChange={e => setFormData({ ...formData, plan_id: e.target.value })}
                                        className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none border-emerald-500/30"
                                    >
                                        <option value="">Selecione o plano...</option>
                                        {availablePlans.map(plan => (
                                            <option key={plan.id} value={plan.id}>{plan.title} ({plan.price_value}{plan.price_period})</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-emerald-500/60 mt-1 font-medium">Os itens deste plano serão descritos automaticamente no contrato digital.</p>
                                </div>

                                {formData.plan_id && (
                                    <div className="md:col-span-2 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase">
                                            <span className="material-symbols-outlined text-sm">settings_suggest</span>
                                            Personalizar para esta Escola
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="custom-title" className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Título Customizado (Opcional)</label>
                                                <input id="custom-title" type="text" placeholder="Ex: Pacote Especial Escolas" value={formData.custom_title} onChange={e => setFormData({ ...formData, custom_title: e.target.value })} className="w-full bg-[#0f172a] border-slate-800 rounded-lg text-white p-2 text-sm outline-none focus:border-emerald-500/50" />
                                            </div>
                                            <div>
                                                <label htmlFor="custom-price" className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Preço Customizado (Opcional)</label>
                                                <input id="custom-price" type="text" placeholder="Ex: R$ 450" value={formData.custom_price} onChange={e => setFormData({ ...formData, custom_price: e.target.value })} className="w-full bg-[#0f172a] border-slate-800 rounded-lg text-white p-2 text-sm outline-none focus:border-emerald-500/50" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="discount-value" className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor do Desconto Mensal (R$)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xs">R$</span>
                                                    <input id="discount-value" type="number" placeholder="0" value={formData.discount_value} onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })} className="w-full bg-[#0f172a] border-slate-800 rounded-lg text-white p-2 pl-9 text-sm outline-none focus:border-emerald-500/50" />
                                                </div>
                                                <p className="text-[9px] text-slate-500 mt-1 italic">Este valor será subtraído do preço final exibido no contrato.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label htmlFor="conselho-escolar" className="text-xs font-bold text-slate-400 uppercase mb-1 block">Conselho Escolar</label>
                                    <input id="conselho-escolar" type="text" aria-label="Conselho Escolar" value={formData.conselho_escolar} onChange={e => setFormData({ ...formData, conselho_escolar: e.target.value.toUpperCase() })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" placeholder="Nome do conselho..." />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="school-director" className="text-xs font-bold text-slate-400 uppercase mb-1 block">Diretor(a) / Presidente</label>
                                    <input id="school-director" type="text" aria-label="Diretor(a)" placeholder="Nome completo do diretor" value={formData.director} onChange={e => setFormData({ ...formData, director: e.target.value.toUpperCase() })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" title="Nome do Diretor" />
                                </div>

                                {/* Director Details Section */}
                                <div className="md:col-span-2 p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase">
                                        <span className="material-symbols-outlined text-sm">badge</span>
                                        Dados do Representante Legal (Presidente)
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="dir-cpf" className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">CPF do Diretor</label>
                                            <input id="dir-cpf" type="text" placeholder="000.000.000-00" value={formData.director_cpf} onChange={e => setFormData({ ...formData, director_cpf: formatCPFCNPJ_Local(e.target.value) })} className="w-full bg-[#0f172a] border-slate-800 rounded-lg text-white p-2 text-sm outline-none focus:border-primary/50" maxLength={14} />
                                        </div>
                                        <div>
                                            <label htmlFor="dir-rg" className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">RG do Diretor</label>
                                            <input id="dir-rg" type="text" placeholder="0.000.000" value={formData.director_rg} onChange={e => setFormData({ ...formData, director_rg: e.target.value })} className="w-full bg-[#0f172a] border-slate-800 rounded-lg text-white p-2 text-sm outline-none focus:border-primary/50" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="dir-addr" className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Endereço Residencial</label>
                                            <input id="dir-addr" type="text" placeholder="Rua, nº, Bairro, Cidade..." value={formData.director_address} onChange={e => setFormData({ ...formData, director_address: e.target.value.toUpperCase() })} className="w-full bg-[#0f172a] border-slate-800 rounded-lg text-white p-2 text-sm outline-none focus:border-primary/50" />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="school-secretary" className="text-xs font-bold text-slate-400 uppercase mb-1 block">Secretário(a) do Conselho</label>
                                    <input id="school-secretary" type="text" aria-label="Secretário(a) do Conselho" placeholder="Nome do secretário" value={formData.secretary} onChange={e => setFormData({ ...formData, secretary: e.target.value.toUpperCase() })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" title="Nome do Secretário" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Logradouro / Endereço</label>
                                    <input type="text" aria-label="Logradouro / Endereço" placeholder="Endereço, Nº, Bairro" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label htmlFor="school_uf" className="text-xs font-bold text-slate-400 uppercase mb-1 block">UF</label>
                                    <select title="UF" aria-label="UF" id="school_uf" value={formData.uf} onChange={e => setFormData({ ...formData, uf: e.target.value, city: '' })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none">
                                        <option value="">Selecione...</option>
                                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="school_city" className="text-xs font-bold text-slate-400 uppercase mb-1 block">Cidade</label>
                                    <select title="Cidade" aria-label="Cidade" id="school_city" disabled={!formData.uf || isLoadingCities} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full bg-[#1e293b] border-slate-700 rounded-lg text-white p-3 focus:border-primary outline-none disabled:opacity-50">
                                        <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                                        {cities.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 border-t border-surface-border flex gap-4 bg-[#1e293b]/50">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                            <button onClick={handleSave} disabled={loading} className="flex-[2] bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95">{loading ? 'Salvando...' : 'Salvar Instituição'}</button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Contract Viewer Modal */}
            {
                viewingContract && (
                    <div className="fixed inset-0 z-[60] bg-[#0f172a] overflow-y-auto pt-16 md:pt-0">
                        <div className="sticky top-0 z-[70] bg-[#1e293b] p-4 flex justify-between items-center sm:hidden border-b border-white/10">
                            <h3 className="font-bold text-white uppercase text-xs">Visualizando Contrato</h3>
                            <button onClick={() => setViewingContract(null)} className="text-white bg-white/10 p-2 rounded-lg"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setViewingContract(null)}
                                className="fixed top-6 right-10 z-[70] hidden sm:flex items-center gap-2 text-white bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 transition-all font-bold uppercase text-xs print:hidden"
                            >
                                <span className="material-symbols-outlined">close</span> Fechar
                            </button>

                            <div className="max-w-5xl mx-auto py-8 px-4">
                                <Contract user={viewingContract.directorUser} />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Schools;
