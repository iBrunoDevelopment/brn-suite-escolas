import { useState, useEffect } from 'react';
import { User, Permission, RolePermission } from '../types';
import { supabase } from '../lib/supabaseClient';

// Cache de permissões para evitar múltiplas consultas
const permissionsCache: Map<string, Permission> = new Map();

export function usePermissions(user: User | null, resource: 'entries' | 'schools' | 'reports' | 'settings' | 'users'): Permission {
    const [permission, setPermission] = useState<Permission>({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

    useEffect(() => {
        if (!user) {
            setPermission({
                canView: false,
                canCreate: false,
                canEdit: false,
                canDelete: false
            });
            return;
        }

        const cacheKey = `${user.role}-${resource}`;

        // Verificar cache primeiro
        if (permissionsCache.has(cacheKey)) {
            setPermission(permissionsCache.get(cacheKey)!);
            return;
        }

        // Buscar permissões do banco
        const fetchPermissions = async () => {
            try {
                const { data, error } = await supabase
                    .from('role_permissions')
                    .select('*')
                    .eq('role', user.role)
                    .eq('resource', resource)
                    .single();

                if (error) {
                    console.error('Erro ao buscar permissões:', error);
                    return;
                }

                if (data) {
                    const perm: Permission = {
                        canView: data.can_view,
                        canCreate: data.can_create,
                        canEdit: data.can_edit,
                        canDelete: data.can_delete
                    };

                    // Armazenar no cache
                    permissionsCache.set(cacheKey, perm);
                    setPermission(perm);
                }
            } catch (error) {
                console.error('Erro ao carregar permissões:', error);
            }
        };

        fetchPermissions();
    }, [user, resource]);

    return permission;
}

// Hook para verificar se o usuário tem acesso a uma escola específica
export function useSchoolAccess(user: User | null, schoolId: string): boolean {
    if (!user) return false;

    // Admin e Operador têm acesso a todas as escolas
    if (user.role === 'Administrador' || user.role === 'Operador') {
        return true;
    }

    // Diretor e Cliente têm acesso apenas à própria escola
    if (user.role === 'Diretor' || user.role === 'Cliente') {
        return user.schoolId === schoolId;
    }

    // Técnico GEE tem acesso às escolas atribuídas
    if (user.role === 'Técnico GEE') {
        return user.assignedSchools?.includes(schoolId) || false;
    }

    return false;
}

// Hook para obter lista de escolas acessíveis pelo usuário
export function useAccessibleSchools(user: User | null, allSchools: any[]): any[] {
    if (!user) return [];

    // Admin e Operador veem todas as escolas
    if (user.role === 'Administrador' || user.role === 'Operador') {
        return allSchools;
    }

    // Diretor e Cliente veem apenas a própria escola
    if (user.role === 'Diretor' || user.role === 'Cliente') {
        return allSchools.filter(school => school.id === user.schoolId);
    }

    // Técnico GEE vê apenas escolas atribuídas
    if (user.role === 'Técnico GEE') {
        if (!user.assignedSchools || user.assignedSchools.length === 0) {
            return [];
        }
        return allSchools.filter(school => user.assignedSchools?.includes(school.id));
    }

    return [];
}

// Limpar cache de permissões (útil após mudança de role)
export function clearPermissionsCache() {
    permissionsCache.clear();
}
