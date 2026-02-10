import React, { useEffect } from 'react';
import { BRAZIL_STATES } from '../../hooks/useSettings';

interface SuppliersSectionProps {
    suppliers: any[];
    newSupplier: any;
    setNewSupplier: (data: any) => void;
    editingSupplierId: string | null;
    setEditingSupplierId: (id: string | null) => void;
    onSave: () => void;
    onEdit: (s: any) => void;
    onDelete: (id: string) => void;
    onStampUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingStamp: boolean;
    cities: string[];
    loadingCities: boolean;
    fetchCities: (uf: string) => void;
}

const SuppliersSection: React.FC<SuppliersSectionProps> = ({
    suppliers, newSupplier, setNewSupplier, editingSupplierId, setEditingSupplierId,
    onSave, onEdit, onDelete, onStampUpload, isUploadingStamp,
    cities, loadingCities, fetchCities
}) => {
    useEffect(() => {
        if (newSupplier.uf) {
            fetchCities(newSupplier.uf);
        }
    }, [newSupplier.uf]);

    const formatCPFCNPJ = (value: string) => {
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
            .slice(0, 9);
    };

    return (
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
                            <label htmlFor="sup_name" className="text-xs text-slate-400">Nome / Razão Social</label>
                            <input
                                id="sup_name"
                                type="text"
                                value={newSupplier.name}
                                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                placeholder="Nome da empresa"
                                className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sup_doc" className="text-xs text-slate-400">CPF / CNPJ</label>
                            <input
                                id="sup_doc"
                                type="text"
                                value={newSupplier.cnpj}
                                onChange={e => setNewSupplier({ ...newSupplier, cnpj: formatCPFCNPJ(e.target.value) })}
                                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                maxLength={18}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sup_email" className="text-xs text-slate-400">E-mail</label>
                            <input
                                id="sup_email"
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
                                    <img src={newSupplier.stamp_url} alt="Previsualização do carimbo" className="w-full h-full object-contain bg-white rounded border border-slate-700 p-1" />
                                ) : (
                                    <div className="w-full h-full rounded bg-slate-800 flex items-center justify-center border border-slate-700 border-dashed">
                                        <span className="material-symbols-outlined text-2xl text-slate-600">stamp</span>
                                    </div>
                                )}
                                <input type="file" onChange={onStampUpload} className="hidden" id="stamp-input" accept="image/*" />
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
                            <label htmlFor="sup_cep" className="text-xs text-slate-400">CEP</label>
                            <input
                                id="sup_cep"
                                type="text"
                                value={newSupplier.cep}
                                onChange={e => setNewSupplier({ ...newSupplier, cep: formatCEP(e.target.value) })}
                                placeholder="00000-000"
                                className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                maxLength={9}
                            />
                        </div>
                        <div className="flex flex-col gap-1 lg:col-span-2">
                            <label htmlFor="sup_addr" className="text-xs text-slate-400">Endereço</label>
                            <input
                                id="sup_addr"
                                type="text"
                                value={newSupplier.address}
                                onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                placeholder="Rua, número, bairro..."
                                className="bg-surface-dark border border-surface-border rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sup_tel" className="text-xs text-slate-400">Telefone</label>
                            <input
                                id="sup_tel"
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
                            <label htmlFor="sup_uf" className="text-xs text-slate-400">UF</label>
                            <select
                                title="Selecione o Estado"
                                aria-label="Selecione o Estado"
                                id="sup_uf"
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
                            <label htmlFor="sup_city" className="text-xs text-slate-400">Cidade {loadingCities && <span className="text-[10px] text-primary animate-pulse font-bold">(Carregando...)</span>}</label>
                            <select
                                title="Selecione a Cidade"
                                aria-label="Selecione a Cidade"
                                id="sup_city"
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
                        <button onClick={onSave} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded font-bold text-sm shadow-lg transition-all">
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
                                <span className="text-[10px] text-slate-500 font-mono tracking-wider">{s.cnpj || 'Documento não informado'}</span>
                            </div>
                            <div className="flex items-center gap-6 mt-3 md:mt-0">
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Localização</span>
                                    <span className="text-xs text-white">{s.city ? `${s.city} - ${s.uf}` : '-'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onEdit(s)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors" title="Editar">
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button onClick={() => onDelete(s.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors" title="Excluir">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {suppliers.length === 0 && (
                        <div className="text-center py-10 text-slate-600 bg-[#111a22]/50 border border-dashed border-slate-800 rounded-xl">
                            Nenhum fornecedor cadastrado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuppliersSection;
