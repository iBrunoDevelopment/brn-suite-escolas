import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

interface DashboardAlertsProps {
    alerts: any[];
    selectedAlert: any | null;
    setSelectedAlert: (alert: any | null) => void;
}

const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ alerts, selectedAlert, setSelectedAlert }) => {
    const [activeAlertTab, setActiveAlertTab] = useState<'Tudo' | 'Auditoria' | 'Gestão' | 'Financeiro' | 'Sistema'>('Tudo');
    const [alertSchoolSearch, setAlertSchoolSearch] = useState('');

    const filtered = (activeAlertTab === 'Tudo' ? alerts : alerts.filter((a: any) => a.category === activeAlertTab))
        .filter((a: any) => !alertSchoolSearch || (a.schoolName || '').toUpperCase().includes(alertSchoolSearch.toUpperCase()));

    // Group by School
    const groups: Record<string, any[]> = {};
    filtered.forEach((a: any) => {
        const key = a.schoolName || 'Geral';
        if (!groups[key]) groups[key] = [];
        groups[key].push(a);
    });

    return (
        <section className="bg-card-dark border border-border-dark rounded-xl flex flex-col overflow-hidden min-h-[300px]">
            <div className="flex flex-col sm:flex-row border-b border-border-dark bg-[#111a22]">
                <div className="px-6 py-4 flex items-center gap-2 border-r border-border-dark/50">
                    <span className="material-symbols-outlined text-primary text-[20px]">notification_important</span>
                    <span className="text-sm font-bold text-white uppercase tracking-widest whitespace-nowrap">Alertas do Sistema</span>
                </div>

                <div className="flex-1 flex overflow-x-auto scrollbar-hide border-r border-border-dark/50">
                    {(['Tudo', 'Auditoria', 'Gestão', 'Financeiro', 'Sistema'] as const).map(tab => {
                        const count = tab === 'Tudo' ? alerts.length : alerts.filter((a: any) => a.category === tab).length;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveAlertTab(tab)}
                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeAlertTab === tab
                                    ? 'text-primary border-primary bg-primary/5'
                                    : 'text-slate-500 border-transparent hover:text-slate-300'
                                    }`}
                            >
                                {tab}
                                {count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${tab === 'Auditoria' || tab === 'Gestão' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="px-4 py-2 flex items-center gap-2 bg-white/[0.02]">
                    <span className="material-symbols-outlined text-slate-500 text-sm">search</span>
                    <input
                        type="text"
                        placeholder="BUSCAR ESCOLA..."
                        value={alertSchoolSearch}
                        onChange={e => setAlertSchoolSearch(e.target.value.toUpperCase())}
                        className="bg-transparent border-none outline-none text-[10px] font-black text-white placeholder:text-slate-600 w-32 md:w-48 tracking-widest"
                    />
                </div>
            </div>

            <div className="p-6">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-60">
                        <span className="material-symbols-outlined text-5xl mb-4">check_circle</span>
                        <p className="font-bold uppercase tracking-widest text-[10px]">Tudo azul! Nenhum alerta pendente.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 animate-in fade-in">
                        <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum alerta nesta categoria/busca.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {Object.entries(groups).map(([schoolName, schoolAlerts]) => (
                            <div key={schoolName} className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{schoolName}</span>
                                    <span className="text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded-full">{schoolAlerts.length}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {schoolAlerts.map(alert => (
                                        <Card
                                            key={alert.id}
                                            onClick={() => setSelectedAlert(alert)}
                                            className={`p-5 flex flex-col gap-4 hover:bg-background-dark/30 shadow-lg text-left group h-full border ${alert.severity === 'Crítico' ? 'border-red-500/20 hover:border-red-500/50' : 'border-orange-500/20 hover:border-orange-500/50'
                                                }`}
                                            animate={false}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'Crítico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                                                    }`}>
                                                    <span className="material-symbols-outlined">{alert.severity === 'Crítico' ? 'error' : 'warning'}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${alert.severity === 'Crítico' ? 'text-red-400 bg-red-400/5 border-red-400/20' : 'text-orange-400 bg-orange-400/5 border-orange-400/20'
                                                        }`}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 font-mono mt-1">
                                                        {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{alert.title}</h4>
                                                <p className="text-slate-500 text-[11px] mt-2 leading-relaxed line-clamp-2">{alert.description}</p>
                                            </div>
                                            <div className="pt-2 border-t border-border-dark/30 flex items-center justify-end mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-primary font-black uppercase tracking-tighter flex items-center gap-1">
                                                    Resolver
                                                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                                                </span>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Alert Detail Modal (Rendered here for simplicity, but could be separate) */}
            {selectedAlert && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#1e293b] border border-[#334155] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className={`h-2 w-full ${selectedAlert.severity === 'Crítico' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${selectedAlert.severity === 'Crítico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                    <span className="material-symbols-outlined text-3xl">{selectedAlert.severity === 'Crítico' ? 'error' : 'warning'}</span>
                                </div>
                                <button onClick={() => setSelectedAlert(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${selectedAlert.severity === 'Crítico' ? 'text-red-400 border-red-400/30' : 'text-orange-400 border-orange-400/30'
                                        }`}>
                                        Alerta {selectedAlert.severity}
                                    </span>
                                    <span className="text-slate-500 text-xs font-mono">{new Date(selectedAlert.timestamp).toLocaleString('pt-BR')}</span>
                                </div>

                                <h3 className="text-2xl font-black text-white leading-tight">
                                    {selectedAlert.title}
                                </h3>

                                <p className="text-slate-400 text-sm leading-relaxed bg-[#0f172a]/50 p-6 rounded-3xl border border-[#334155]/50 italic">
                                    "{selectedAlert.description}"
                                </p>

                                <div className="pt-6 flex flex-col gap-3">
                                    <Button
                                        onClick={() => {
                                            setSelectedAlert(null);
                                            window.dispatchEvent(new CustomEvent('changePage', { detail: 'notifications' }));
                                        }}
                                        className="w-full"
                                        size="lg"
                                        icon="notifications"
                                    >
                                        Ir para Central de Notificações
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setSelectedAlert(null)}
                                        className="w-full"
                                        size="lg"
                                    >
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default DashboardAlerts;
