
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

export const useReconciliationHistory = (user: User, filters: { schoolId: string, bankAccountId: string }) => {
    return useQuery({
        queryKey: ['reconciliation_history', filters.schoolId, filters.bankAccountId],
        queryFn: async () => {
            let query = supabase
                .from('bank_statement_uploads')
                .select(`
                    *,
                    schools(name),
                    bank_accounts(name, bank_name, account_number),
                    users:uploaded_by(name)
                `)
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (filters.schoolId) {
                query = query.eq('school_id', filters.schoolId);
            }
            if (filters.bankAccountId) {
                query = query.eq('bank_account_id', filters.bankAccountId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }
    });
};
