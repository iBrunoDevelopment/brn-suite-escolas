import React from 'react';

interface ImportZoneProps {
    dragActive: boolean;
    setDragActive: (active: boolean) => void;
    uploadType: 'corrente' | 'investimento';
    setUploadType: (type: 'corrente' | 'investimento') => void;
    onFileUpload: (file: File) => void;
    filterMonth: string;
}

const ImportZone: React.FC<ImportZoneProps> = ({
    dragActive, setDragActive, uploadType, setUploadType, onFileUpload, filterMonth
}) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onFileUpload(file);
    };

    return (
        <div
            className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-4 transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-white/10 bg-card-dark/30'}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) onFileUpload(e.dataTransfer.files[0]); }}
        >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined text-4xl">upload_file</span>
            </div>
            <div className="text-center">
                <h3 className="text-white font-bold text-lg">Importar Extrato Bancário</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Selecione o tipo e importe o extrato de <strong>{new Date(filterMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>.</p>
            </div>

            <div className="flex bg-black/20 p-1 rounded-2xl border border-white/5">
                <button
                    onClick={() => setUploadType('corrente')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadType === 'corrente' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    Conta Corrente
                </button>
                <button
                    onClick={() => setUploadType('investimento')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadType === 'investimento' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    Investimento
                </button>
            </div>

            <label className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer transition-all active:scale-95 shadow-lg shadow-primary/20">
                Selecionar Arquivo
                <input type="file" className="hidden" accept=".ofx,.csv" onChange={handleFileChange} />
            </label>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Arquivos .OFX ou .CSV são suportados</p>
        </div>
    );
};

export default ImportZone;
