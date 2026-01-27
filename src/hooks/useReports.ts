
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole, AccountabilityProcess, FinancialEntry, Supplier } from '../types';

interface ReportsFilters {
    schoolId: string;
    programId: string;
    status: string;
    search: string;
}

export const useReports = (user: User, filters: ReportsFilters) => {
    const [loading, setLoading] = useState(false);
    const [processes, setProcesses] = useState<AccountabilityProcess[]>([]);
    const [availableEntries, setAvailableEntries] = useState<FinancialEntry[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [templateUrl, setTemplateUrl] = useState<string | null>(null);

    const fetchAuxData = async () => {
        const { data: s } = await supabase.from('schools').select('id, name').order('name');
        const { data: p } = await supabase.from('programs').select('id, name').order('name');
        if (s) setSchools(s);
        if (p) setPrograms(p);

        const { data: t } = await supabase.from('system_settings').select('value').eq('key', 'import_template_url').maybeSingle();
        if (t?.value) setTemplateUrl(t.value);
    };

    const fetchProcesses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('accountability_processes')
                .select(`
                    *, 
                    financial_entries!inner(*, schools(*), programs(name), suppliers(*), payment_methods(name)),
                    accountability_items(*),
                    accountability_quotes(*, accountability_quote_items(*))
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
                    } else {
                        setProcesses([]);
                        return;
                    }
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            setProcesses(data || []);
        } catch (error) {
            console.error('Error fetching processes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableEntries = async () => {
        try {
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
                    } else {
                        setAvailableEntries([]);
                        return;
                    }
                }
            }

            const { data: entries } = await entriesQuery;

            const { data: existingProcEntries } = await supabase
                .from('accountability_processes')
                .select('financial_entry_id');

            const usedIds = new Set((existingProcEntries || []).map(p => p.financial_entry_id));
            setAvailableEntries((entries || []).filter(e => !usedIds.has(e.id)));
        } catch (error) {
            console.error('Error fetching available entries:', error);
        }
    };

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('*').order('name');
        if (data) setSuppliers(data);
    };

    useEffect(() => {
        fetchAuxData();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        fetchAvailableEntries();
    }, [user.schoolId, user.assignedSchools]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProcesses();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters.schoolId, filters.programId, filters.status, filters.search]);

    return {
        loading,
        processes,
        availableEntries,
        suppliers,
        schools,
        programs,
        templateUrl,
        refresh: () => {
            fetchProcesses();
            fetchAvailableEntries();
        }
    };
};
