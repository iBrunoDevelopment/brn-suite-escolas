
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Line, ComposedChart
} from 'recharts';
import { User, UserRole } from '../types';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';
import { useDashboard } from '../hooks/useDashboard';

const COLORS = ['#137fec', '#0bda5b', '#fb923c', '#94a3b8'];

const ChartEmptyState: React.FC<{ message: string, icon: string }> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center h-full w-full py-12 text-center animate-in fade-in zoom-in duration-700">
    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-2xl relative group">
      <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <span className="material-symbols-outlined text-5xl text-text-secondary opacity-40 relative z-10">{icon}</span>
    </div>
    <h4 className="text-white/80 font-bold text-sm mb-2">Sem dados no período</h4>
    <p className="text-text-secondary text-xs max-w-[240px] leading-relaxed px-4">{message}</p>
  </div>
);

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  // Use custom hook
  const {
    // Data
    isLoading: loading,
    auxData: availableOptions,
    stats,
    flowData,
    pieData,
    alerts,

    // State & Setters
    filters, setFilters,
    showBroadcast, setShowBroadcast,
    selectedAlert, setSelectedAlert,
    broadcastForm, setBroadcastForm,

    // Actions
    refresh,
    sendBroadcast,
    isSendingBroadcast
  } = useDashboard(user);

  // Permissions & Access
  const dashPerm = usePermissions(user, 'entries');
  const accessibleSchools = useAccessibleSchools(user, availableOptions.schools);

  // Define handleSendBroadcast correctly for the button click
  const handleSendBroadcast = () => {
    sendBroadcast();
  };

  const [showFilters, setShowFilters] = React.useState(false);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Filters Summary & Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 bg-card-dark/50 p-3 rounded-xl border border-border-dark overflow-x-auto">
          {/* Left side: Active Filters Summary or just toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
            >
              <span className="material-symbols-outlined text-[18px]">{showFilters ? 'close' : 'filter_list'}</span>
              {showFilters ? 'Fechar Filtros' : 'Filtros Avançados'}
            </button>

            {/* Show active filter badges if collapsed */}
            {!showFilters && (
              <div className="hidden sm:flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {filters.schoolId && filters.schoolId !== (user.schoolId || '') && (
                  <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold whitespace-nowrap">
                    {availableOptions.schools.find(s => s.id === filters.schoolId)?.name?.substring(0, 15)}...
                  </span>
                )}
                {filters.program && (
                  <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold whitespace-nowrap">
                    {availableOptions.programs.find(p => p.id === filters.program)?.name}
                  </span>
                )}
                {filters.nature && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold whitespace-nowrap">
                    {filters.nature}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-2">
            {user.role === UserRole.ADMIN && (
              <button
                onClick={() => setShowBroadcast(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-sm">campaign</span>
                <span className="hidden md:inline">Comunicado</span>
              </button>
            )}
            {stats.pendencias > 0 && (
              <div className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg animate-pulse shrink-0">
                <span className="material-symbols-outlined text-orange-500 text-sm">priority_high</span>
                <span className="text-[10px] font-black text-orange-500 uppercase">{stats.pendencias} <span className="hidden sm:inline">Pendentes</span></span>
              </div>
            )}
            <button onClick={() => refresh()} className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white w-10 h-10 md:w-auto md:h-auto md:px-5 md:py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              <span className="hidden md:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filters Area */}
        {showFilters && (
          <div className="bg-[#111a22] border border-surface-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end animate-in fade-in slide-in-from-top-4">

            {/* School Filter */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Escola</label>
              {user.schoolId ? (
                <div className="text-white font-bold capitalize px-3 py-2 bg-background-dark rounded border border-border-dark truncate text-xs">
                  {availableOptions.schools.find(s => s.id === user.schoolId)?.name || 'Minha Escola'}
                </div>
              ) : (
                <select
                  title="Filtrar por Escola"
                  value={filters.schoolId}
                  onChange={(e) => setFilters(prev => ({ ...prev, schoolId: e.target.value }))}
                  className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
                >
                  <option value="">Todas as Escolas</option>
                  {accessibleSchools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Account/Program Filter */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Conta / Programa</label>
              <select
                title="Filtrar por Conta/Programa"
                value={filters.program}
                onChange={(e) => setFilters(prev => ({ ...prev, program: e.target.value, rubric: '' }))}
                className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
              >
                <option value="">Todas</option>
                {availableOptions.programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Rubric Filter */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Rubrica</label>
              <select
                title="Filtrar por Rubrica"
                value={filters.rubric}
                onChange={(e) => setFilters(prev => ({ ...prev, rubric: e.target.value }))}
                className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
              >
                <option value="">Todas</option>
                {availableOptions.rubrics
                  .filter(r => !filters.program || r.program_id === filters.program)
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>
            </div>

            {/* Natureza Filter */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Natureza</label>
              <select
                title="Filtrar por Natureza"
                value={filters.nature}
                onChange={(e) => setFilters(prev => ({ ...prev, nature: e.target.value }))}
                className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
              >
                <option value="">Todas</option>
                <option value="Custeio">Custeio</option>
                <option value="Capital">Capital</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Fornecedor</label>
              <select
                title="Filtrar por Fornecedor"
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
              >
                <option value="">Todos</option>
                {availableOptions.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters({ schoolId: user.schoolId || '', program: '', rubric: '', nature: '', supplier: '' })}
                className="w-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-tighter h-9 rounded-lg hover:bg-white/10 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card-dark border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 h-28 md:h-32 animate-pulse flex flex-col gap-4">
              <div className="h-2 w-24 bg-white/5 rounded"></div>
              <div className="h-6 w-32 bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[
            {
              label: 'Saldo Total',
              value: formatCurrency(stats.totalDisponivel),
              subtitle: `Sendo ${formatCurrency(stats.reprogramado)} reprogramado`,
              icon: 'account_balance',
              color: 'text-blue-400',
              bg: 'bg-blue-500/5',
              border: 'border-blue-500/20'
            },
            {
              label: 'Novos Repasses',
              value: formatCurrency(stats.repasses),
              subtitle: 'Recebimentos no período',
              icon: 'trending_up',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/5',
              border: 'border-emerald-500/20'
            },
            {
              label: 'Reserva & Rend.',
              value: formatCurrency(stats.reprogramado + stats.rendimentos),
              subtitle: 'Saldo anterior + Juros',
              icon: 'savings',
              color: 'text-orange-400',
              bg: 'bg-orange-500/5',
              border: 'border-orange-500/20'
            },
            {
              label: 'Execução (Saídas)',
              value: formatCurrency(stats.despesa),
              subtitle: `Tarifas: ${formatCurrency(stats.tarifas)}${stats.impostosDevolucoes > 0 ? ` + Imp/Dev: ${formatCurrency(stats.impostosDevolucoes)}` : ''}`,
              icon: 'trending_down',
              color: 'text-red-400',
              bg: 'bg-red-500/5',
              border: 'border-red-500/20'
            }
          ].map((stat, i) => (
            <div key={i} className={`bg-card-dark border ${stat.border} ${stat.bg} rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-1 relative overflow-hidden group transition-all hover:scale-[1.02] shadow-xl`}>
              <div className={`absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <span className={`material-symbols-outlined text-6xl md:text-8xl ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate">{stat.label}</p>
              <div className="flex flex-col mt-1">
                <h3 className="text-white text-base sm:text-lg md:text-3xl font-black tracking-tight">{stat.value}</h3>
                <span className="text-[8px] md:text-[10px] text-slate-400 font-bold mt-1 uppercase line-clamp-1">
                  {stat.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col min-h-[400px]">
          <div className="mb-6">
            <h3 className="text-white font-bold text-lg">Fluxo de Caixa</h3>
            <p className="text-text-secondary text-sm">Comparativo Receita vs Despesa (Mensal)</p>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3f52" vertical={false} />
                  <XAxis dataKey="name" stroke="#92adc9" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#92adc9" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c2936', borderColor: '#2d3f52', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} name="Receita" />
                  <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesa" />
                  <Line type="monotone" dataKey="saldoAcumulado" stroke="#3b82f6" strokeWidth={3} name="Saldo em Conta" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                message="Não encontramos lançamentos financeiros com os filtros aplicados para gerar o comparativo mensal."
                icon="bar_chart_4_bars"
              />
            )}
          </div>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col min-h-[400px]">
          <div className="mb-6">
            <h3 className="text-white font-bold text-lg">Resumo</h3>
            <p className="text-text-secondary text-sm">Distribuição Estimada</p>
          </div>
          <div className="flex-1 w-full flex items-center justify-center min-h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c2936', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                message="A distribuição por natureza de despesa será exibida assim que houverem pagamentos registrados."
                icon="pie_chart"
              />
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Logs Area */}
      <section className="bg-card-dark border border-border-dark rounded-xl flex flex-col overflow-hidden min-h-[300px]">
        <div className="flex border-b border-border-dark bg-[#111a22]">
          <button className="px-6 py-4 text-sm font-bold text-primary border-b-2 border-primary bg-primary/5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">notification_important</span>
            Alertas do Sistema
            {alerts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{alerts.length}</span>}
          </button>
        </div>
        <div className="p-6">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 opacity-60">
              <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
              <p>Tudo certo! Nenhum alerta por enquanto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {alerts.map(alert => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`bg-card-dark border rounded-2xl p-5 flex flex-col gap-4 hover:bg-background-dark/30 transition-all shadow-lg text-left group animate-in fade-in zoom-in duration-300 ${alert.severity === 'Crítico' ? 'border-red-500/20 hover:border-red-500/50' : 'border-orange-500/20 hover:border-orange-500/50'
                    }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'Crítico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                      <span className="material-symbols-outlined">{alert.severity === 'Crítico' ? 'error' : 'warning'}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${alert.severity === 'Crítico' ? 'text-red-400 bg-red-400/5 border-red-400/20' : 'text-orange-400 bg-orange-400/5 border-orange-400/20'
                      }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{alert.title}</h4>
                    <p className="text-text-secondary text-xs mt-2 leading-relaxed line-clamp-2">{alert.description}</p>
                  </div>
                  <div className="pt-2 border-t border-border-dark/50 flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-primary font-black uppercase tracking-tighter flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Detalhes
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Alert Detail Modal */}
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
                  <button
                    onClick={() => {
                      setSelectedAlert(null);
                      window.dispatchEvent(new CustomEvent('changePage', { detail: 'notifications' }));
                    }}
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                  >
                    <span className="material-symbols-outlined">notifications</span>
                    Ir para Central de Notificações
                  </button>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 bg-primary/5 flex justify-between items-center text-primary">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined font-black">campaign</span>
                <h3 className="font-bold">Comunicado aos Usuários</h3>
              </div>
              <button onClick={() => setShowBroadcast(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-8 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Público Alvo</label>
                <select
                  title="Selecionar público alvo do comunicado"
                  value={broadcastForm.targetRole}
                  onChange={e => setBroadcastForm({ ...broadcastForm, targetRole: e.target.value })}
                  className="bg-background-dark text-white border border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                >
                  <option value="Todos">Todos os Usuários</option>
                  {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Título do Comunicado</label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value.toUpperCase() })}
                  className="bg-background-dark text-white border border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                  placeholder="ASSUNTO DA MENSAGEM"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conteúdo da Mensagem</label>
                <textarea
                  rows={4}
                  value={broadcastForm.message}
                  onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="bg-background-dark text-white border border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary outline-none resize-none"
                  placeholder="Escreva aqui as orientações ou avisos importantes..."
                />
              </div>

              <button
                onClick={handleSendBroadcast}
                disabled={isSendingBroadcast}
                className="w-full bg-primary hover:bg-primary-hover text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingBroadcast ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined text-sm">send</span>}
                Disparar Mensagem Agora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
