import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

interface TopbarProps {
  user: User;
  activePageName: string;
}

const HELP_CONTENT: Record<string, { title: string, text: React.ReactNode }> = {
  dashboard: {
    title: 'Visão Geral e Alertas',
    text: (
      <div className="flex flex-col gap-2">
        <p>Esta tela é o seu painel de controle principal. Aqui você pode:</p>
        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
          <li>Monitorar o <strong>Saldo em Caixa</strong> e totais de Receitas/Despesas.</li>
          <li>Visualizar gráficos de fluxo de caixa mensal.</li>
          <li>Acompanhar alertas críticos no painel de <strong>Alertas do Sistema</strong>.</li>
        </ul>
        <p className="mt-2 text-xs text-amber-500 font-bold">Dica: Fique atento ao indicador de "Pendências Antigas" para não perder prazos.</p>
      </div>
    )
  },
  entries: {
    title: 'Lançamentos Financeiros',
    text: (
      <div className="flex flex-col gap-2">
        <p>Aqui é onde a mágica acontece. Registre toda a movimentação financeira:</p>
        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
          <li><strong>Receitas:</strong> Repasses recebidos (ex: PDDE, Merenda).</li>
          <li><strong>Despesas:</strong> Pagamentos a fornecedores, tarifas, etc.</li>
          <li><strong>Filtros:</strong> Use a barra superior para filtrar por escola, programa ou data.</li>
        </ul>
        <p className="mt-2 text-xs text-amber-500 font-bold">Importante: Para pagamentos de prestadores de serviço (PJ), lembre-se de cadastrar o fornecedor primeiro em Configurações.</p>
      </div>
    )
  },
  reports: {
    title: 'Prestação de Contas (REX)',
    text: (
      <div className="flex flex-col gap-2">
        <p>Gere a documentação oficial para o FNDE/Tribunais:</p>
        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
          <li>Selecione um lançamento de despesa "Pago".</li>
          <li>Clique em <strong>Novo Processo</strong> para vincular orçamentos (3 cotações).</li>
          <li>O sistema gera automaticamente: <strong>Ata, Mapa Comparativo, Ordem de Compra e Recibo</strong>.</li>
        </ul>
      </div>
    )
  },
  settings: {
    title: 'Configurações',
    text: (
      <div className="flex flex-col gap-2">
        <p>Ajuste os parâmetros do sistema:</p>
        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
          <li>Cadastre <strong>Fornecedores</strong>, <strong>Contas Bancárias</strong> e <strong>Rubricas</strong>.</li>
          <li>Gerencie usuários e permissões (se for Admin).</li>
        </ul>
      </div>
    )
  },
  schools: {
    title: 'Gestão Escolar',
    text: (
      <div className="flex flex-col gap-2">
        <p>Cadastre e gerencie as unidades escolares.</p>
        <p>É fundamental manter os dados da escola (CNPJ, Endereço, Diretor) atualizados, pois eles saem no cabeçalho de todos os documentos oficiais.</p>
      </div>
    )
  }
};

const Topbar: React.FC<TopbarProps> = ({ user, activePageName }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const pageTitles: Record<string, string> = {
    dashboard: 'Visão Geral',
    entries: 'Lançamentos Financeiros',
    reports: 'Relatórios & Auditoria',
    settings: 'Configurações do Sistema',
    schools: 'Gestão de Escolas',
    help: 'Ajuda & Suporte'
  };

  useEffect(() => {
    fetchNotifications();
    const subscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setNotifications(data);
    setLoadingNotifications(false);
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-surface-border bg-background-dark/95 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-white text-xl font-bold leading-tight">
              {pageTitles[activePageName] || 'BRN Suite'}
            </h2>
            <p className="text-text-secondary text-sm hidden sm:block">
              {activePageName === 'dashboard' ? `Bem-vindo de volta, ${user.name.split(' ')[0]}.` : 'Controle financeiro inteligente.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3 relative">

            {/* Notifications Button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${showNotifications ? 'bg-primary text-white border-primary' : 'bg-card-dark border-border-dark text-white hover:bg-border-dark'}`}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {notifications.some(n => !n.is_read) && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-card-dark shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
              )}
            </button>

            {/* Notifications Popup */}
            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase tracking-widest">Alertas Recentes</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">{notifications.filter(n => !n.is_read).length} NOVOS</span>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {loadingNotifications ? (
                    <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-primary">sync</span></div>
                  ) : notifications.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-20">notifications_off</span>
                      <p className="text-xs italic">Nenhum alerta recente.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-white/5">
                      {notifications.map((n) => (
                        <div key={n.id} className={`p-4 transition-colors flex gap-3 ${!n.is_read ? 'bg-primary/5' : 'opacity-60'}`}>
                          <div className={`mt-0.5 rounded-lg w-8 h-8 flex items-center justify-center ${n.type === 'error' ? 'bg-red-500/20 text-red-500' :
                              n.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                                n.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                                  'bg-blue-500/20 text-blue-500'
                            }`}>
                            <span className="material-symbols-outlined text-sm">{
                              n.type === 'error' ? 'error' :
                                n.type === 'warning' ? 'warning' :
                                  n.type === 'success' ? 'check_circle' :
                                    'info'
                            }</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[9px] text-slate-600 mt-1 block font-mono">{new Date(n.created_at).toLocaleTimeString('pt-BR')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                  <button
                    onClick={() => { setShowNotifications(false); /* Assuming parent or current page changes */ window.dispatchEvent(new CustomEvent('changePage', { detail: 'notifications' })); }}
                    className="text-[10px] font-black text-primary uppercase hover:underline tracking-widest"
                  >
                    Ver todas as notificações
                  </button>
                </div>
              </div>
            )}

            {/* Help Button */}
            <button
              onClick={() => setShowHelp(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-card-dark border border-border-dark text-white hover:bg-border-dark transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">contact_support</span>
            </button>

          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-primary p-6 flex items-start gap-4">
              <div className="bg-white/20 p-2 rounded-lg text-white">
                <span className="material-symbols-outlined text-2xl">school</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Como funciona?</h3>
                <p className="text-blue-100 text-sm">{pageTitles[activePageName]}</p>
              </div>
              <button onClick={() => setShowHelp(false)} className="ml-auto text-white/70 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 text-slate-300 leading-relaxed text-sm">
              {HELP_CONTENT[activePageName] ? HELP_CONTENT[activePageName].text : (
                <p>Selecione uma página para ver as instruções específicas.</p>
              )}
            </div>
            <div className="p-4 bg-black/20 border-t border-slate-700 flex justify-end">
              <button onClick={() => setShowHelp(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-bold transition-colors">Entendi</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
