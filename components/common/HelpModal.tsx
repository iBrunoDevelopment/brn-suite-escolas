
import React from 'react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    sections: {
        title: string;
        items: { label: string; desc: string }[];
        icon?: string;
    }[];
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, description, sections }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-primary">
                        <span className="material-symbols-outlined text-2xl font-black">live_help</span>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{description}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-8">
                        {sections.map((section, idx) => (
                            <div key={idx} className="flex flex-col gap-4">
                                <h4 className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                                    {section.icon && <span className="material-symbols-outlined text-sm">{section.icon}</span>}
                                    {section.title}
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {section.items.map((item, i) => (
                                        <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:border-primary/20 transition-all group">
                                            <span className="text-white font-bold text-sm block mb-1 group-hover:text-primary transition-colors">{item.label}</span>
                                            <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        Entendi, obrigado!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
