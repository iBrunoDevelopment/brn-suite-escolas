
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
    totalDisponivel: 0,
    repasses: 0,
    rendimentos: 0,
    tarifas: 0,
    impostosDevolucoes: 0
  });

  const [flowData, setFlowData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
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
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  // Broadcast State
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', targetRole: 'Todos' });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Permissions
  const dashPerm = usePermissions(user, 'entries');
  // ... (omitted lines for brevity, will use full block in tool call)
  const accessibleSchools = useAccessibleSchools(user, availableOptions.schools);

  const handleSendBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.message) return alert('Preencha o título e a mensagem.');
    setIsSendingBroadcast(true);
    try {
      // Buscar usuários destino
      let query = supabase.from('users').select('id');
      if (broadcastForm.targetRole !== 'Todos') {
        query = query.eq('role', broadcastForm.targetRole);
      }
      const { data: targetUsers } = await query;

      if (targetUsers && targetUsers.length > 0) {
        const notifications = targetUsers.map(u => ({
          user_id: u.id,
          title: `📢 COMUNICADO: ${broadcastForm.title}`,
          message: broadcastForm.message,
          type: 'info',
          is_read: false
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
        alert('Comunicado enviado com sucesso!');
        setShowBroadcast(false);
        setBroadcastForm({ title: '', message: '', targetRole: 'Todos' });
      }
    } catch (error: any) {
      alert('Erro ao enviar comunicado: ' + error.message);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // Initial load

  useEffect(() => {
    processData();
    generateAlerts();
  }, [filters, rawData, rawProcesses, pendingUsersCount]); // Re-process when filters or data change

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

    // Fetch Pending Users Count and Launch Reminders if Admin
    if (user.role === UserRole.ADMIN) {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .or('active.eq.false,and(role.eq.Cliente,school_id.is.null)');
      setPendingUsersCount(count || 0);

      // Trigger automatic monthly reminders
      await supabase.rpc('launch_monthly_reminders');
    }

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
    let repasses = 0;
    let rendimentos = 0;
    let tarifas = 0;
    let impDev = 0;

    // Group for charts
    const monthsMap: Record<string, { name: string, receita: number, despesa: number }> = {};

    filtered.forEach(e => {
      const val = Number(e.value);
      if (e.status === 'Pendente') pendencias++;

      if (e.type === 'Entrada') {
        receita += val;
        if (e.category === 'Repasse / Crédito') repasses += val;
        if (e.category === 'Rendimento de Aplicação') rendimentos += val;
      } else {
        despesa += Math.abs(val);
        if (e.category === 'Tarifa Bancária') tarifas += Math.abs(val);
        if (e.category === 'Impostos / Tributos' || e.category === 'Devolução de Recurso (FNDE/Estado)') impDev += Math.abs(val);
      }

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
      totalDisponivel: (receita - despesa) + reprogramado,
      repasses,
      rendimentos,
      tarifas,
      impostosDevolucoes: impDev
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

    // 0. Usuários Pendentes (Apenas para Admin)
    if (user.role === UserRole.ADMIN && pendingUsersCount > 0) {
      newAlerts.push({
        id: 'pending-users-alert',
        title: 'Usuários Aguardando Aprovação',
        description: `Existem ${pendingUsersCount} usuários que ainda não foram vinculados a uma escola ou estão desativados.`,
        severity: 'Médio',
        timestamp: today.toISOString()
      });
    }

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
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg animate-pulse">
                <span className="material-symbols-outlined text-orange-500 text-sm">priority_high</span>
                <span className="text-[10px] font-black text-orange-500 uppercase">{stats.pendencias} Pendentes</span>
              </div>
            )}
            <button onClick={fetchDashboardData} className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white w-10 h-10 md:w-auto md:h-auto md:px-5 md:py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Saldo Total Disponível',
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
            label: 'Reserva & Rendimentos',
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
                  <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesa" />
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
