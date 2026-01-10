
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TransactionStatus, TransactionNature, User, UserRole } from '../types';

export interface FinancialEntryExtended {
    id: string;
    date: string;
    description: string;
    value: number;
    type: 'Entrada' | 'Saída';
    status: TransactionStatus;
    category?: string;
    school: string;
    school_id: string;
    program: string;
    program_id: string;
    rubric: string;
    rubric_id?: string;
    nature: TransactionNature;
    supplier: string;
    supplier_id?: string;
    bank_account: string;
    bank_account_id?: string;
    payment_method: string;
    payment_method_id?: string;
    batch_id?: string;
    invoice_date?: string;
    document_number?: string;
    auth_number?: string;
    attachments?: any[];
}

export function useFinancialEntries(user: User, initialFilters: any = {}) {
    const [entries, setEntries] = useState<FinancialEntryExtended[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0, pending: 0 });

    // Aux Data
    const [schools, setSchools] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [rubrics, setRubrics] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

    const fetchAuxData = useCallback(async () => {
        const [s, p, r, sup, b, pm] = await Promise.all([
            supabase.from('schools').select('id, name').order('name'),
            supabase.from('programs').select('id, name').order('name'),
            supabase.from('rubrics').select('id, name, program_id, default_nature, school_id').order('name'),
            supabase.from('suppliers').select('id, name').order('name'),
            supabase.from('bank_accounts').select('id, name, program_id, school_id, account_number, bank_name, agency').order('name'),
            supabase.from('payment_methods').select('id, name').order('name'),
        ]);

        if (s.data) setSchools(s.data);
        if (p.data) setPrograms(p.data);
        if (r.data) setRubrics(r.data);
        if (sup.data) setSuppliers(sup.data);
        if (b.data) setBankAccounts(b.data);
        if (pm.data) setPaymentMethods(pm.data);
    }, []);

    const fetchEntries = useCallback(async (filters: any) => {
        setLoading(true);
        try {
            let q = supabase.from('financial_entries').select(`
                *, 
                schools(name), 
                programs(name), 
                rubrics(name), 
                suppliers(name),
                bank_accounts(agency, account_number),
                payment_methods(name)
            `).order('date', { ascending: false });

            // Apply filter logic
            if (filters.school) q = q.eq('school_id', filters.school);
            if (filters.program) q = q.eq('program_id', filters.program);
            if (filters.supplier) q = q.eq('supplier_id', filters.supplier);
            if (filters.startDate) q = q.gte('date', filters.startDate);
            if (filters.endDate) q = q.lte('date', filters.endDate);
            if (filters.nature) q = q.eq('nature', filters.nature);
            if (filters.search) q = q.ilike('description', `%${filters.search}%`);

            // Quick Filters
            const now = new Date();
            if (filters.quick === 'pending_today') {
                q = q.eq('status', TransactionStatus.PENDENTE).gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
            } else if (filters.quick === 'high_value') {
                q = q.or('value.gte.1000,value.lte.-1000');
            } else if (filters.quick === 'this_month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                q = q.gte('date', startOfMonth);
            }

            const { data, error } = await q;
            if (error) throw error;

            if (data) {
                const fmt: FinancialEntryExtended[] = data.map((i: any) => {
                    const ba = Array.isArray(i.bank_accounts) ? i.bank_accounts[0] : i.bank_accounts;
                    return {
                        ...i,
                        school: i.schools?.name || 'N/A',
                        program: i.programs?.name || 'N/A',
                        rubric: i.rubrics?.name || 'Geral',
                        supplier: i.suppliers?.name || 'Não Informado',
                        bank_account: ba ? `Ag: ${ba.agency || 'N/A'} / Cc: ${ba.account_number || 'N/A'}` : '-',
                        payment_method: i.payment_methods?.name || '-',
                        value: Number(i.value)
                    };
                });

                setEntries(fmt);

                // Calculate Stats
                let inc = 0, exp = 0, pen = 0;
                fmt.forEach((e) => {
                    if (e.type === 'Entrada') inc += e.value; else exp += Math.abs(e.value);
                    if (e.status === TransactionStatus.PENDENTE) pen++;
                });
                setStats({ income: inc, expense: exp, balance: inc - exp, pending: pen });
            }
        } catch (e) {
            console.error('Error fetching entries:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAuxData();
    }, [fetchAuxData]);

    return {
        entries,
        loading,
        stats,
        auxData: {
            schools,
            programs,
            rubrics,
            suppliers,
            bankAccounts,
            paymentMethods
        },
        refresh: fetchEntries
    };
}
