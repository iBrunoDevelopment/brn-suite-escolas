import React from 'react';

interface AssetsSectionProps {
    templateUrl: string;
    loadingAssets: boolean;
    isUploadingTemplate: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AssetsSection: React.FC<AssetsSectionProps> = ({ templateUrl, loadingAssets, isUploadingTemplate, onUpload }) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in pb-10">
            <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                    <span className="material-symbols-outlined text-3xl">folder_open</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-wider uppercase">Arquivos & Modelos do Sistema</h3>
                    <p className="text-slate-400 text-sm italic">Configure os arquivos oficiais que ficarão disponíveis para download pelos usuários.</p>
                </div>
            </div>

            <div className="bg-[#111a22] p-8 rounded-3xl border border-surface-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-white mb-2">Modelo de Importação de Itens (Excel/CSV)</h4>
                        <p className="text-slate-500 text-sm mb-4">Este arquivo será baixado pelos usuários na tela de Prestação de Contas para servir de base para importação em massa.</p>

                        {templateUrl && (
                            <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl w-fit mb-4">
                                <span className="material-symbols-outlined text-emerald-500">verified</span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Arquivo Atual:</span>
                                    <a href={templateUrl} target="_blank" rel="noreferrer" className="text-xs text-white font-mono hover:underline truncate max-w-[300px]">
                                        {templateUrl.split('/').pop()}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 flex flex-col items-center">
                        <label className={`
              w-64 h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer
              ${isUploadingTemplate ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-surface-dark border-surface-border hover:border-indigo-500/50 hover:bg-indigo-500/5'}
            `}>
                            {isUploadingTemplate ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-3xl text-indigo-500">sync</span>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Enviando modelo...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-3xl text-slate-500">add_circle</span>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center px-4">CLIQUE PARA SUBIR NOVO MODELO (XLSX/CSV)</span>
                                </>
                            )}
                            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" id="asset-upload" onChange={onUpload} disabled={isUploadingTemplate} />
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl flex gap-4">
                <span className="material-symbols-outlined text-amber-500 text-3xl">info</span>
                <div>
                    <p className="text-sm text-amber-200/80 font-bold mb-1">Informações Importantes:</p>
                    <ul className="text-xs text-slate-500 space-y-1 list-disc ml-4">
                        <li>O arquivo subido aqui substituirá o modelo padrão gerado pelo sistema.</li>
                        <li>Certifique-se de que as colunas estejam na mesma ordem para garantir que a importação funcione.</li>
                        <li>Recomendamos o uso de arquivos .csv ou .xlsx.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AssetsSection;
