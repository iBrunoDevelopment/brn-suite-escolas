
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Line, ComposedChart
} from 'recharts';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { usePermissions, useAccessibleSchools } from '../hooks/usePermissions';

const COLORS = ['#137fec', '#0bda5b', '#fb923c', '#94a3b8'];

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [stats, setStats] = useState({
    receita: 0,
    despesa: 0,
    saldo: 0,
    pendencias: 0,
    reprogramado: 0,
    totalDisponivel: 0
  });

  const [flowData, setFlowData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Filters State
  const [filters, setFilters] = useState({
    schoolId: user.schoolId || '',
    program: '', // Conta
    rubric: '',
    supplier: '',
    nature: ''
  });

  const [availableOptions, setAvailableOptions] = useState<{
    schools: { id: string, name: string }[],
    programs: { id: string, name: string }[],
    rubrics: { id: string, name: string, program_id: string }[],
    suppliers: { id: string, name: string }[]
  }>({
    schools: [],
    programs: [],
    rubrics: [],
    suppliers: []
  });

  const [pieData, setPieData] = useState<any[]>([]);

  const [rawData, setRawData] = useState<any[]>([]);
  const [rawProcesses, setRawProcesses] = useState<any[]>([]);
  const [rawReprogrammed, setRawReprogrammed] = useState<any[]>([]);

  // Permissions
  const dashPerm = usePermissions(user, 'entries');
  const accessibleSchools = useAccessibleSchools(user, availableOptions.schools);

  useEffect(() => {
    fetchDashboardData();
  }, []); // Initial load

  useEffect(() => {
    processData();
    generateAlerts();
  }, [filters, rawData, rawProcesses]); // Re-process when filters or data change

  const fetchDashboardData = async () => {
    // 1. Fetch Basic Data (Schools, Programs, Rubrics)
    const [schoolsRes, programsRes, rubricsRes, suppliersRes] = await Promise.all([
      supabase.from('schools').select('*'),
      supabase.from('programs').select('*'),
      supabase.from('rubrics').select('*'),
      supabase.from('suppliers').select('*')
    ]);

    const schoolsData = schoolsRes.data || [];
    const programsData = programsRes.data || [];
    const rubricsData = rubricsRes.data || [];
    const suppliersData = suppliersRes.data || [];

    setAvailableOptions({
      schools: schoolsData,
      programs: programsData,
      rubrics: rubricsData,
      suppliers: suppliersData
    });

    // 2. Fetch Entries with visibility restrictions
    let entriesQuery = supabase.from('financial_entries').select('*');
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
      if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
        entriesQuery = entriesQuery.eq('school_id', user.schoolId);
      } else if (user.role === UserRole.TECNICO_GEE) {
        if (user.assignedSchools && user.assignedSchools.length > 0) {
          entriesQuery = entriesQuery.in('school_id', user.assignedSchools);
        } else {
          setRawData([]);
          setStats({ receita: 0, despesa: 0, saldo: 0, pendencias: 0 });
          return;
        }
      }
    }
    const { data: entries } = await entriesQuery;

    // 3. Fetch Processes with restrictions
    let procQuery = supabase.from('accountability_processes').select('financial_entry_id');
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
      if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
        procQuery = procQuery.eq('school_id', user.schoolId);
      } else if (user.role === UserRole.TECNICO_GEE) {
        if (user.assignedSchools && user.assignedSchools.length > 0) {
          procQuery = procQuery.in('school_id', user.assignedSchools);
        } else {
          setRawProcesses([]);
          return;
        }
      }
    }
    const { data: processes } = await procQuery;

    if (processes) setRawProcesses(processes);

    if (entries) {
      setRawData(entries);
    }

    // 4. Fetch Reprogrammed Balances
    let reprogQuery = supabase.from('reprogrammed_balances').select('*');
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
      if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
        reprogQuery = reprogQuery.eq('school_id', user.schoolId);
      } else if (user.role === UserRole.TECNICO_GEE) {
        if (user.assignedSchools && user.assignedSchools.length > 0) {
          reprogQuery = reprogQuery.in('school_id', user.assignedSchools);
        }
      }
    }
    const { data: reprog } = await reprogQuery;
    if (reprog) setRawReprogrammed(reprog);
  };

  const processData = () => {
    if (!rawData) return;

    let filtered = rawData;

    // Apply Filters
    if (filters.schoolId) {
      filtered = filtered.filter(e => e.school_id === filters.schoolId);
    }
    if (filters.program) {
      filtered = filtered.filter(e => e.program_id === filters.program);
    }
    if (filters.rubric) {
      filtered = filtered.filter(e => e.rubric_id === filters.rubric);
    }
    if (filters.nature) {
      filtered = filtered.filter(e => e.nature === filters.nature);
    }
    if (filters.supplier) {
      filtered = filtered.filter(e => e.supplier_id === filters.supplier);
    }

    let filteredReprog = rawReprogrammed;
    if (filters.schoolId) filteredReprog = filteredReprog.filter(r => r.school_id === filters.schoolId);
    if (filters.program) filteredReprog = filteredReprog.filter(r => r.program_id === filters.program);
    if (filters.nature) filteredReprog = filteredReprog.filter(r => r.nature === filters.nature);
    if (filters.rubric) filteredReprog = filteredReprog.filter(r => r.rubric_id === filters.rubric);

    const reprogramado = filteredReprog.reduce((acc, curr) => acc + Number(curr.value || 0), 0);

    // Calculate Stats
    let receita = 0;
    let despesa = 0;
    let pendencias = 0;

    // Group for charts
    const monthsMap: Record<string, { name: string, receita: number, despesa: number }> = {};

    filtered.forEach(e => {
      const val = Number(e.value);
      if (e.status === 'Pendente') pendencias++;

      if (e.type === 'Entrada') receita += val;
      else despesa += Math.abs(val);

      // Chart Data Builder
      const dateObj = new Date(e.date);
      // Adjusting for UTC to ensure correct month display
      const monthKey = `${dateObj.getUTCFullYear()}-${dateObj.getUTCMonth()}`;
      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { name: monthName, receita: 0, despesa: 0 };
      }
      if (e.type === 'Entrada') monthsMap[monthKey].receita += val;
      else monthsMap[monthKey].despesa += Math.abs(val);
    });

    setStats({
      receita,
      despesa,
      saldo: receita - despesa,
      pendencias,
      reprogramado,
      totalDisponivel: (receita - despesa) + reprogramado
    });

    const sortedMonths = Object.keys(monthsMap)
      .sort((a, b) => {
        const [y1, m1] = a.split('-').map(Number);
        const [y2, m2] = b.split('-').map(Number);
        return y1 !== y2 ? y1 - y2 : m1 - m2;
      })
      .map(key => monthsMap[key]);

    // Add accumulated balance to flowData
    let accBal = reprogramado;
    const flowWithAcc = sortedMonths.map(m => {
      accBal += (m.receita - m.despesa);
      return { ...m, saldoAcumulado: accBal };
    });

    // Pie Data (Natureza)
    const natureMap: Record<string, number> = {};
    filtered.forEach(e => {
      natureMap[e.nature] = (natureMap[e.nature] || 0) + Math.abs(Number(e.value));
    });
    setPieData(Object.entries(natureMap).map(([name, value]) => ({ name, value })));

    setFlowData(flowWithAcc);
  };

  const generateAlerts = () => {
    if (!rawData) return;
    const newAlerts: any[] = [];
    const today = new Date();

    // 1. Pendências Antigas (> 15 dias)
    const longPending = rawData.filter(e => {
      if (e.status !== 'Pendente') return false;
      const entryDate = new Date(e.date);
      const diffTime = Math.abs(today.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 15;
    });

    if (longPending.length > 0) {
      newAlerts.push({
        id: 'pending-alert',
        title: 'Pendências Antigas',
        description: `Existem ${longPending.length} lançamentos pendentes há mais de 15 dias. Verifique se foram pagos ou cancelados.`,
        severity: 'Médio',
        timestamp: today.toISOString()
      });
    }

    // 2. Pagamentos Sem Prestação de Contas
    const paidExpenses = rawData.filter(e => e.type === 'Saída' && e.status === 'Pago');
    const processedIds = new Set(rawProcesses.map(p => p.financial_entry_id));

    const unaccounted = paidExpenses.filter(e => !processedIds.has(e.id));
    if (unaccounted.length > 0) {
      newAlerts.push({
        id: 'unaccounted-alert',
        title: 'Falta Prestação de Contas',
        description: `${unaccounted.length} pagamentos confirmados ainda não possuem documentação de prestação de contas vinculada.`,
        severity: 'Crítico',
        timestamp: today.toISOString()
      });
    }

    // 3. Alertas de Saldo Real por Natureza (Considerando Reprogramado)
    const balances: Record<string, { balance: number, programId: string, schoolId: string, nature: string }> = {};

    rawReprogrammed.forEach(r => {
      const key = `${r.school_id}_${r.program_id}_${r.nature}`;
      if (!balances[key]) balances[key] = { balance: 0, programId: r.program_id, schoolId: r.school_id, nature: r.nature };
      balances[key].balance += Number(r.value || 0);
    });

    rawData.forEach(e => {
      const key = `${e.school_id}_${e.program_id}_${e.nature}`;
      if (!balances[key]) balances[key] = { balance: 0, programId: e.program_id, schoolId: e.school_id, nature: e.nature };
      const val = Number(e.value);
      balances[key].balance += (e.type === 'Entrada' ? val : -Math.abs(val));
    });

    Object.entries(balances).forEach(([key, data]) => {
      const progName = availableOptions.programs.find(p => p.id === data.programId)?.name || 'Programa';
      const schName = availableOptions.schools.find(s => s.id === data.schoolId)?.name || '';

      if (data.balance < 0) {
        newAlerts.push({
          id: `bal-neg-${key}`,
          title: 'Saldo Negativo Crítico',
          description: `O programa ${progName} (${data.nature}) em ${schName} está com saldo de ${formatCurrency(data.balance)}.`,
          severity: 'Crítico',
          timestamp: today.toISOString()
        });
      } else if (data.balance > 0 && data.balance < 500) {
        newAlerts.push({
          id: `bal-low-${key}`,
          title: 'Saldo Baixo',
          description: `Atenção: O programa ${progName} (${data.nature}) em ${schName} possui apenas ${formatCurrency(data.balance)} restantes.`,
          severity: 'Atenção',
          timestamp: today.toISOString()
        });
      }
    });

    setAlerts(newAlerts);
    syncAlertsToNotifications(newAlerts);
  };

  const syncAlertsToNotifications = async (alertsList: any[]) => {
    // For each alert, check if it's already in the DB for today to avoid spamming
    const today = new Date().toISOString().split('T')[0];

    for (const alert of alertsList) {
      // We only sync 'Crítico' and 'Médio' to persistent notifications
      if (alert.severity !== 'Crítico' && alert.severity !== 'Médio') continue;

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', alert.title)
        .filter('created_at', 'gte', `${today}T00:00:00Z`);

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: alert.title,
          message: alert.description,
          type: alert.severity === 'Crítico' ? 'error' : 'warning',
          is_read: false
        });
      }
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Filters Summary */}
      <div className="flex flex-col xl:flex-row gap-4 items-end justify-between bg-card-dark/50 p-4 rounded-xl border border-border-dark">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-wrap">

          {/* School Filter */}
          <div className="flex flex-col gap-1.5 w-full md:w-56">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Escola</label>
            {user.schoolId ? (
              <div className="text-white font-bold capitalize px-3 py-2 bg-background-dark rounded border border-border-dark truncate">
                {/* Try to find name if possible, else ID */}
                {availableOptions.schools.find(s => s.id === user.schoolId)?.name || 'Minha Escola'}
              </div>
            ) : (
              <select
                value={filters.schoolId}
                onChange={(e) => setFilters(prev => ({ ...prev, schoolId: e.target.value }))}
                className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
              >
                <option value="">Todas as Escolas</option>
                {accessibleSchools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Account/Program Filter */}
          <div className="flex flex-col gap-1.5 w-full md:w-48">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Conta / Programa</label>
            <select
              value={filters.program}
              onChange={(e) => setFilters(prev => ({ ...prev, program: e.target.value, rubric: '' }))}
              className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="">Todas</option>
              {availableOptions.programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Rubric Filter */}
          <div className="flex flex-col gap-1.5 w-full md:w-48">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Rubrica</label>
            <select
              value={filters.rubric}
              onChange={(e) => setFilters(prev => ({ ...prev, rubric: e.target.value }))}
              className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
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
          <div className="flex flex-col gap-1.5 w-full md:w-48">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Natureza</label>
            <select
              value={filters.nature}
              onChange={(e) => setFilters(prev => ({ ...prev, nature: e.target.value }))}
              className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="">Todas</option>
              <option value="Custeio">Custeio</option>
              <option value="Capital">Capital</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="flex flex-col gap-1.5 w-full md:w-48">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Fornecedor</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
              className="bg-background-dark text-white border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="">Todos</option>
              {availableOptions.suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="flex items-center gap-2">
          {(filters.schoolId !== (user.schoolId || '') || filters.program || filters.rubric || filters.nature || filters.supplier) && (
            <button
              onClick={() => setFilters({ schoolId: user.schoolId || '', program: '', rubric: '', nature: '', supplier: '' })}
              className="text-text-secondary hover:text-white text-sm px-3 py-2 transition-colors"
            >
              Limpar Filtros
            </button>
          )}
          <button onClick={fetchDashboardData} className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Saldo Total em Conta',
            value: formatCurrency(stats.totalDisponivel),
            subtitle: `Sendo ${formatCurrency(stats.reprogramado)} reprogramado`,
            icon: 'account_balance',
            color: 'text-blue-400',
            bg: 'bg-blue-500/5',
            border: 'border-blue-500/20'
          },
          {
            label: 'Receitas (Repasses)',
            value: formatCurrency(stats.receita),
            subtitle: 'Recebimentos no período',
            icon: 'trending_up',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/5',
            border: 'border-emerald-500/20'
          },
          {
            label: 'Despesas Executadas',
            value: formatCurrency(stats.despesa),
            subtitle: 'Pagamentos realizados',
            icon: 'trending_down',
            color: 'text-orange-400',
            bg: 'bg-orange-500/5',
            border: 'border-orange-500/20'
          },
          {
            label: 'Itens Pendentes',
            value: `${stats.pendencias}`,
            subtitle: 'Ações requeridas',
            icon: 'pending_actions',
            color: 'text-blue-300',
            bg: 'bg-slate-500/5',
            border: 'border-slate-500/20'
          }
        ].map((stat, i) => (
          <div key={i} className={`bg-card-dark border ${stat.border} ${stat.bg} rounded-3xl p-6 flex flex-col gap-1 relative overflow-hidden group transition-all hover:scale-[1.02] shadow-xl`}>
            <div className={`absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
              <span className={`material-symbols-outlined text-8xl ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <div className="flex flex-col mt-1">
              <h3 className="text-white text-3xl font-black tracking-tight">{stat.value}</h3>
              <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                {stat.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col min-h-[400px]">
          <div className="mb-6">
            <h3 className="text-white font-bold text-lg">Fluxo de Caixa</h3>
            <p className="text-text-secondary text-sm">Comparativo Receita vs Despesa (Mensal)</p>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {flowData.length > 0 ? (
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
                  <Bar dataKey="despesa" fill="#f97316" radius={[4, 4, 0, 0]} name="Despesa" />
                  <Line type="monotone" dataKey="saldoAcumulado" stroke="#3b82f6" strokeWidth={3} name="Saldo em Conta" dot={{ r: 4 }} />
                </ComposedChart>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary">Sem dados para exibir</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col min-h-[400px]">
          <div className="mb-6">
            <h3 className="text-white font-bold text-lg">Resumo</h3>
            <p className="text-text-secondary text-sm">Distribuição Estimada</p>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
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
              <div className="text-center text-text-secondary flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">donut_small</span>
                <p>Nenhum dado por natureza.</p>
              </div>
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
                <div key={alert.id} className={`bg-card-dark border rounded-lg p-5 flex flex-col gap-3 hover:bg-background-dark/30 transition-colors shadow-lg relative group ${alert.severity === 'Crítico' ? 'border-red-500/30 hover:border-red-500/60' : 'border-orange-500/30 hover:border-orange-500/60'
                  }`}>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${alert.severity === 'Crítico' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                      }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${alert.severity === 'Crítico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                      <span className="material-symbols-outlined">{alert.severity === 'Crítico' ? 'error' : 'warning'}</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{alert.title}</h4>
                      <p className="text-text-secondary text-xs mt-1 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section >
    </div >
  );
};

export default Dashboard;
