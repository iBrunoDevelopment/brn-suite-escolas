import { useQuery } from '@tanstack/react-query';
import { User, Permission } from '../types';
import { supabase } from '../lib/supabaseClient';

export function usePermissions(user: User | null, resource: 'entries' | 'schools' | 'reports' | 'settings' | 'users'): Permission {
    const { data: permission } = useQuery({
        queryKey: ['permissions', user?.role, resource],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*')
                .eq('role', user.role)
                .eq('resource', resource)
                .single();

            if (error || !data) return null;

            return {
                canView: data.can_view,
                canCreate: data.can_create,
                canEdit: data.can_edit,
                canDelete: data.can_delete
            } as Permission;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
        enabled: !!user
    });

    return permission || {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    };
}

export function useSchoolAccess(user: User | null, schoolId: string): boolean {
    if (!user) return false;
    if (user.role === 'Administrador' || user.role === 'Operador') return true;
    if (user.role === 'Diretor' || user.role === 'Cliente') return user.schoolId === schoolId;
    if (user.role === 'Técnico GEE') return user.assignedSchools?.includes(schoolId) || false;
    return false;
}

export function useAccessibleSchools(user: User | null, allSchools: any[]): any[] {
    if (!user) return [];
    if (user.role === 'Administrador' || user.role === 'Operador') return allSchools;
    if (user.role === 'Diretor' || user.role === 'Cliente') return allSchools.filter(school => school.id === user.schoolId);
    if (user.role === 'Técnico GEE') {
        if (!user.assignedSchools || user.assignedSchools.length === 0) return [];
        return allSchools.filter(school => user.assignedSchools?.includes(school.id));
    }
    return [];
}
