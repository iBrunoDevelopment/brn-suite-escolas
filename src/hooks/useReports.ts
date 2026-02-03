import { useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole, AccountabilityProcess, FinancialEntry, Supplier } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ReportsFilters {
    schoolId: string;
    programId: string;
    status: string;
    search: string;
}

export const useReports = (user: User, filters: ReportsFilters) => {
    const queryClient = useQueryClient();
    // Queries
    const { data: auxData = { schools: [], programs: [], templateUrl: null } } = useQuery({
        queryKey: ['reports_aux'],
        queryFn: async () => {
            const [s, p, t] = await Promise.all([
                supabase.from('schools').select('id, name').order('name'),
                supabase.from('programs').select('id, name').order('name'),
                supabase.from('system_settings').select('value').eq('key', 'import_template_url').maybeSingle()
            ]);
            return {
                schools: s.data || [],
                programs: p.data || [],
                templateUrl: (t.data as any)?.value || null
            };
        },
        staleTime: 1000 * 60 * 30
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers_list'],
        queryFn: async () => (await supabase.from('suppliers').select('*').order('name')).data || [],
        staleTime: 1000 * 60 * 10
    });

    const { data: availableEntries = [], isLoading: loadingEntries } = useQuery({
        queryKey: ['available_entries', user.id, user.schoolId, user.assignedSchools],
        queryFn: async () => {
            let entriesQuery = supabase
                .from('financial_entries')
                .select('*, schools(*), programs(name), suppliers(id, name, cnpj)')
                .eq('type', 'Saída');

            if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
                if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
                    entriesQuery = entriesQuery.eq('school_id', user.schoolId || '');
                } else if (user.role === UserRole.TECNICO_GEE) {
                    if (user.assignedSchools && user.assignedSchools.length > 0) {
                        entriesQuery = entriesQuery.in('school_id', user.assignedSchools);
                    } else return [];
                }
            }

            const [entriesRes, existingRes] = await Promise.all([
                entriesQuery,
                supabase.from('accountability_processes').select('financial_entry_id')
            ]);

            const usedIds = new Set((existingRes.data || []).map(p => p.financial_entry_id));
            return (entriesRes.data || []).filter(e => !usedIds.has(e.id)) as FinancialEntry[];
        },
        enabled: !!user.id
    });

    const { data: processes = [], isLoading: loadingProcesses, refetch: refreshProcesses } = useQuery({
        queryKey: ['accountability_processes', user.id, filters],
        queryFn: async () => {
            let query = supabase
                .from('accountability_processes')
                .select(`
                    *, 
                    financial_entries!inner(*, schools(*), programs(name), suppliers(*), payment_methods(name)),
                    accountability_items(*),
                    accountability_quotes(*, suppliers(*), accountability_quote_items(*))
                `)
                .order('created_at', { ascending: false });

            if (filters.schoolId) query = query.eq('school_id', filters.schoolId);
            if (filters.programId) query = query.eq('financial_entries.program_id', filters.programId);
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.search) query = query.ilike('financial_entries.description', `%${filters.search}%`);

            if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
                if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
                    query = query.eq('school_id', user.schoolId);
                } else if (user.role === UserRole.TECNICO_GEE) {
                    if (user.assignedSchools && user.assignedSchools.length > 0) {
                        query = query.in('school_id', user.assignedSchools);
                    } else return [];
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as AccountabilityProcess[];
        },
        enabled: !!user.id
    });

    const deleteProcessMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('accountability_processes').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountability_processes'] });
            queryClient.invalidateQueries({ queryKey: ['available_entries'] });
        }
    });

    const { schools, programs, templateUrl } = auxData;

    return {
        loading: loadingProcesses || loadingEntries,
        processes,
        availableEntries,
        suppliers,
        schools,
        programs,
        templateUrl,
        refresh: refreshProcesses,
        deleteProcess: deleteProcessMut.mutate
    };
};
