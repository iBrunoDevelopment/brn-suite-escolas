
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
    const [stats, setStats] = useState({
        income: 0,
        expense: 0,
        balance: 0,
        pending: 0,
        repasses: 0,
        rendimentos: 0,
        tarifas: 0,
        impostosDevolucoes: 0
    });

    // Aux Data
    const [schools, setSchools] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [rubrics, setRubrics] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [reprogrammedBalances, setReprogrammedBalances] = useState<any[]>([]);
    const [periods, setPeriods] = useState<any[]>([]);

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

        // Fetch Periods
        const { data: per } = await supabase.from('periods').select('name, is_active').order('name', { ascending: false });
        if (per) setPeriods(per);

        // Fetch initial reprogrammed
        await fetchReprogrammedBalances();
    }, []);

    const fetchReprogrammedBalances = useCallback(async () => {
        const { data } = await supabase.from('reprogrammed_balances').select(`
            *, schools(name), programs(name), rubrics(name)
        `).order('period', { ascending: false });
        if (data) setReprogrammedBalances(data);
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

            // Role-based security filters
            if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERADOR) {
                if (user.role === UserRole.DIRETOR || user.role === UserRole.CLIENTE) {
                    q = q.eq('school_id', user.schoolId);
                } else if (user.role === UserRole.TECNICO_GEE) {
                    if (user.assignedSchools && user.assignedSchools.length > 0) {
                        q = q.in('school_id', user.assignedSchools);
                    } else {
                        setEntries([]);
                        setStats({ income: 0, expense: 0, balance: 0, pending: 0, repasses: 0, rendimentos: 0, tarifas: 0, impostosDevolucoes: 0 });
                        return;
                    }
                }
            }

            // UI Filter logic
            if (filters.school) q = q.eq('school_id', filters.school);
            if (filters.program) q = q.eq('program_id', filters.program);
            if (filters.supplier) q = q.eq('supplier_id', filters.supplier);
            if (filters.startDate) q = q.gte('date', filters.startDate);
            if (filters.endDate) q = q.lte('date', filters.endDate);
            if (filters.nature) q = q.eq('nature', filters.nature);
            if (filters.search) q = q.ilike('description', `%${filters.search}%`);

            if (filters.quick === 'pending') q = q.eq('status', TransactionStatus.PENDENTE);
            if (filters.quick === 'paid') q = q.eq('status', TransactionStatus.PAGO);

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
                let inc = 0, exp = 0, pen = 0, rep = 0, rend = 0, tar = 0, impDev = 0;
                fmt.forEach((e) => {
                    const val = Math.abs(e.value);
                    if (e.type === 'Entrada') {
                        inc += val;
                        if (e.category === 'Repasse / Crédito') rep += val;
                        if (e.category === 'Rendimento de Aplicação') rend += val;
                    } else {
                        exp += val;
                        if (e.category === 'Tarifa Bancária') tar += val;
                        if (e.category === 'Impostos / Tributos' || e.category === 'Devolução de Recurso (FNDE/Estado)') impDev += val;
                    }
                    if (e.status === TransactionStatus.PENDENTE) pen++;
                });
                setStats({
                    income: inc,
                    expense: exp,
                    balance: inc - exp,
                    pending: pen,
                    repasses: rep,
                    rendimentos: rend,
                    tarifas: tar,
                    impostosDevolucoes: impDev
                });
            }
        } catch (e) {
            console.error('Error fetching entries:', e);
        } finally {
            setLoading(false);
        }
    }, [user.schoolId, user.assignedSchools, user.role]);

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
            paymentMethods,
            periods
        },
        reprogrammedBalances,
        fetchReprogrammedBalances,
        refresh: fetchEntries
    };
}
