import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole, TransactionStatus } from '../types';
import { useToast } from '../context/ToastContext';

export interface DashboardFilters {
    schoolId: string;
    program: string;
    rubric: string;
    supplier: string;
    nature: string;
}

export const useDashboard = (user: User) => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    // -- STATE --
    const [filters, setFilters] = useState<DashboardFilters>({
        schoolId: user.schoolId || '',
        program: '',
        rubric: '',
        supplier: '',
        nature: ''
    });

    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        message: '',
        targetRole: 'Todos'
    });

    const [showBroadcast, setShowBroadcast] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

    // -- QUERIES --

    // 1. Auxiliary Data (Schools, Programs, Rubrics, Suppliers)
    const { data: auxData = { schools: [], programs: [], rubrics: [], suppliers: [] } } = useQuery({
        queryKey: ['dashboard_aux'],
        queryFn: async () => {
            const [schools, programs, rubrics, suppliers] = await Promise.all([
                supabase.from('schools').select('*').order('name'),
                supabase.from('programs').select('*').order('name'),
                supabase.from('rubrics').select('*').order('name'),
                supabase.from('suppliers').select('*').order('name')
            ]);
            return {
                schools: schools.data || [],
                programs: programs.data || [],
                rubrics: rubrics.data || [],
                suppliers: suppliers.data || []
            };
        },
        staleTime: 1000 * 60 * 30 // 30 minutes
    });

    // 2. Pending Users (Admin Only)
    const { data: pendingUsersCount = 0 } = useQuery({
        queryKey: ['pending_users_count'],
        queryFn: async () => {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .or('active.eq.false,and(role.eq.Cliente,school_id.is.null)');
            return count || 0;
        },
        enabled: user.role === UserRole.ADMIN,
        staleTime: 1000 * 60 * 5
    });

    // 3. Raw Data for Calculations (Entries, Processes, Reprogrammed)
    // We fetch broadly based on role, then filter in memory for quick dashboard interactions
    const { data: rawData = { entries: [], processes: [], reprogrammed: [] }, isLoading } = useQuery({
        queryKey: ['dashboard_data', user.id, user.role, user.schoolId, user.assignedSchools],
        queryFn: async () => {
            // Base queries
            let entriesQ = supabase.from('financial_entries').select('*');
            let processesQ = supabase.from('accountability_processes').select('financial_entry_id');
            let reprogQ = supabase.from('reprogrammed_balances').select('*');

            // Apply Role Restrictions
            if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
                if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
                    const sid = user.schoolId || '';
                    entriesQ = entriesQ.eq('school_id', sid);
                    processesQ = processesQ.eq('school_id', sid);
                    reprogQ = reprogQ.eq('school_id', sid);
                } else if (user.role === UserRole.TECNICO_GEE) {
                    const sids = user.assignedSchools || [];
                    if (sids.length > 0) {
                        entriesQ = entriesQ.in('school_id', sids);
                        processesQ = processesQ.in('school_id', sids);
                        reprogQ = reprogQ.in('school_id', sids);
                    } else {
                        // Assigned user with no schools
                        return { entries: [], processes: [], reprogrammed: [] };
                    }
                }
            }

            const [e, p, r] = await Promise.all([entriesQ, processesQ, reprogQ]);

            // Check for monthly reminders trigger (Admin side effect)
            if (user.role === UserRole.ADMIN) {
                // Fire and forget, don't await blocking
                supabase.rpc('launch_monthly_reminders').then(({ error }) => {
                    if (error) console.error('Error launching reminders:', error);
                });
            }

            return {
                entries: e.data || [],
                processes: p.data || [],
                reprogrammed: r.data || []
            };
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    // -- DATA PROCESSING (useMemo) --

    const dashboardStats = useMemo(() => {
        const { entries, processes, reprogrammed } = rawData;

        // 1. Filter Data
        let filteredEntries = entries;
        let filteredReprog = reprogrammed;

        if (filters.schoolId) {
            filteredEntries = filteredEntries.filter((e: any) => e.school_id === filters.schoolId);
            filteredReprog = filteredReprog.filter((r: any) => r.school_id === filters.schoolId);
        }
        if (filters.program) {
            filteredEntries = filteredEntries.filter((e: any) => e.program_id === filters.program);
            filteredReprog = filteredReprog.filter((r: any) => r.program_id === filters.program);
        }
        if (filters.rubric) {
            filteredEntries = filteredEntries.filter((e: any) => e.rubric_id === filters.rubric);
            filteredReprog = filteredReprog.filter((r: any) => r.rubric_id === filters.rubric);
        }
        if (filters.nature) {
            filteredEntries = filteredEntries.filter((e: any) => e.nature === filters.nature);
            filteredReprog = filteredReprog.filter((r: any) => r.nature === filters.nature);
        }
        if (filters.supplier) {
            filteredEntries = filteredEntries.filter((e: any) => e.supplier_id === filters.supplier);
            // Reprogrammed balances don't have supplier usually, so ignore supplier filter for them or filter out?
            // Assuming simplified logic: if supplier filter is on, maybe reprog shouldn't count? 
            // Current Dashboard logic doesn't filter reprog by supplier. 
            // "if (filters.supplier) filtered = filtered.filter..." -> only affects entries.
        }

        // 2. Calculate Stats
        const stats = {
            receita: 0,
            despesa: 0,
            pendencias: 0,
            repasses: 0,
            rendimentos: 0,
            tarifas: 0,
            impostosDevolucoes: 0,
            reprogramado: filteredReprog.reduce((acc: number, curr: any) => acc + Number(curr.value || 0), 0)
        };

        const monthsMap: Record<string, { name: string, receita: number, despesa: number }> = {};
        const natureMap: Record<string, number> = {};

        filteredEntries.forEach((e: any) => {
            const val = Number(e.value);
            const absVal = Math.abs(val);

            // Basic Stats
            if (e.status === TransactionStatus.PENDENTE) stats.pendencias++;

            if (e.type === 'Entrada') {
                stats.receita += val;
                if (e.category === 'Repasse / Crédito') stats.repasses += val;
                if (e.category === 'Rendimento de Aplicação') stats.rendimentos += val;
            } else {
                stats.despesa += absVal;
                if (e.category === 'Tarifa Bancária') stats.tarifas += absVal;
                if (e.category === 'Impostos / Tributos' || e.category === 'Devolução de Recurso (FNDE/Estado)') stats.impostosDevolucoes += absVal;
            }

            // Charts Data - Flow
            const dateObj = new Date(e.date);
            const monthKey = `${dateObj.getUTCFullYear()}-${dateObj.getUTCMonth()}`;
            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });

            if (!monthsMap[monthKey]) {
                monthsMap[monthKey] = { name: monthName, receita: 0, despesa: 0 };
            }
            if (e.type === 'Entrada') monthsMap[monthKey].receita += val;
            else monthsMap[monthKey].despesa += absVal;

            // Charts Data - Pie (Nature)
            if (e.nature) {
                natureMap[e.nature] = (natureMap[e.nature] || 0) + absVal;
            }
        });

        // 3. Final Formats
        const sortedMonths = Object.keys(monthsMap)
            .sort((a, b) => {
                const [y1, m1] = a.split('-').map(Number);
                const [y2, m2] = b.split('-').map(Number);
                return y1 !== y2 ? y1 - y2 : m1 - m2;
            })
            .map(key => monthsMap[key]);

        let accBal = stats.reprogramado;
        const flowData = sortedMonths.map(m => {
            accBal += (m.receita - m.despesa);
            return { ...m, saldoAcumulado: accBal };
        });

        const pieData = Object.entries(natureMap).map(([name, value]) => ({ name, value }));

        // 4. Alerts Generation
        const alerts: any[] = [];
        const today = new Date();

        // Alert: Pending Users
        if (user.role === UserRole.ADMIN && pendingUsersCount > 0) {
            alerts.push({
                id: 'pending-users-alert',
                title: 'Usuários Aguardando Aprovação',
                description: `Existem ${pendingUsersCount} usuários que ainda não foram vinculados a uma escola ou estão desativados.`,
                severity: 'Médio',
                timestamp: today.toISOString()
            });
        }

        // Alert: Old Pending
        const longPending = entries.filter((e: any) => {
            if (e.status !== TransactionStatus.PENDENTE) return false;
            const diffTime = Math.abs(today.getTime() - new Date(e.date).getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) > 15;
        });
        if (longPending.length > 0) {
            alerts.push({
                id: 'pending-alert',
                title: 'Pendências Antigas',
                description: `Existem ${longPending.length} lançamentos pendentes há mais de 15 dias.`,
                severity: 'Médio',
                timestamp: today.toISOString()
            });
        }

        // Alert: Missing Accountability
        const paidExpenses = entries.filter((e: any) => e.type === 'Saída' && (e.status === TransactionStatus.PAGO || e.status === TransactionStatus.CONCILIADO));
        const processedIds = new Set(processes.map((p: any) => p.financial_entry_id));
        const unaccounted = paidExpenses.filter((e: any) => !processedIds.has(e.id));

        if (unaccounted.length > 0) {
            alerts.push({
                id: 'unaccounted-alert',
                title: 'Falta Prestação de Contas',
                description: `${unaccounted.length} pagamentos confirmados ainda não possuem documentação de prestação de contas vinculada.`,
                severity: 'Crítico',
                timestamp: today.toISOString()
            });
        }

        // Alert: Low/Negative Balances
        const balances: Record<string, { balance: number, programId: string, schoolId: string, nature: string }> = {};
        reprogrammed.forEach((r: any) => {
            const key = `${r.school_id}_${r.program_id}_${r.nature}`;
            if (!balances[key]) balances[key] = { balance: 0, programId: r.program_id, schoolId: r.school_id, nature: r.nature };
            balances[key].balance += Number(r.value || 0);
        });
        entries.forEach((e: any) => {
            const key = `${e.school_id}_${e.program_id}_${e.nature}`;
            if (!balances[key]) balances[key] = { balance: 0, programId: e.program_id, schoolId: e.school_id, nature: e.nature };
            balances[key].balance += (e.type === 'Entrada' ? Number(e.value) : -Math.abs(Number(e.value)));
        });

        Object.entries(balances).forEach(([key, data]) => {
            const progName = auxData.programs.find((p: any) => p.id === data.programId)?.name || 'Programa';
            const schName = auxData.schools.find((s: any) => s.id === data.schoolId)?.name || '';
            const val = data.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            if (data.balance < 0) {
                alerts.push({
                    id: `bal-neg-${key}`,
                    title: 'Saldo Negativo Crítico',
                    description: `O programa ${progName} (${data.nature}) em ${schName} está com saldo de ${val}.`,
                    severity: 'Crítico',
                    timestamp: today.toISOString()
                });
            } else if (data.balance > 0 && data.balance < 500) {
                alerts.push({
                    id: `bal-low-${key}`,
                    title: 'Saldo Baixo',
                    description: `Atenção: O programa ${progName} (${data.nature}) em ${schName} possui apenas ${val} restantes.`,
                    severity: 'Atenção',
                    timestamp: today.toISOString()
                });
            }
        });

        return {
            stats: {
                ...stats,
                saldo: stats.receita - stats.despesa,
                totalDisponivel: (stats.receita - stats.despesa) + stats.reprogramado
            },
            flowData,
            pieData,
            alerts
        };
    }, [rawData, filters, auxData, user.role, pendingUsersCount]);

    // -- MUTATIONS --
    const broadcastMutation = useMutation({
        mutationFn: async () => {
            if (!broadcastForm.title || !broadcastForm.message) throw new Error('Preencha título e mensagem');

            let query = supabase.from('users').select('id');
            if (broadcastForm.targetRole !== 'Todos') {
                query = query.eq('role', broadcastForm.targetRole);
            }
            const { data: targetUsers, error: fetchError } = await query;
            if (fetchError) throw fetchError;

            if (!targetUsers || targetUsers.length === 0) return;

            const notifications = targetUsers.map(u => ({
                user_id: u.id,
                title: `📢 COMUNICADO: ${broadcastForm.title}`,
                message: broadcastForm.message,
                type: 'info',
                is_read: false
            }));

            const { error } = await supabase.from('notifications').insert(notifications);
            if (error) throw error;
        },
        onSuccess: () => {
            addToast('Comunicado enviado com sucesso!', 'success');
            setShowBroadcast(false);
            setBroadcastForm({ title: '', message: '', targetRole: 'Todos' });
        },
        onError: (e: any) => addToast(e.message, 'error')
    });

    return {
        // Data
        isLoading,
        auxData,
        ...dashboardStats,

        // State & Setters
        filters, setFilters,
        showBroadcast, setShowBroadcast,
        selectedAlert, setSelectedAlert,
        broadcastForm, setBroadcastForm,

        // Actions
        refresh: () => queryClient.invalidateQueries({ queryKey: ['dashboard_data'] }),
        sendBroadcast: broadcastMutation.mutate,
        isSendingBroadcast: broadcastMutation.isPending
    };
};
