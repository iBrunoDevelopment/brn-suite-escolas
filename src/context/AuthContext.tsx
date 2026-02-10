import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    needsSignature: boolean;
    setNeedsSignature: (needs: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsSignature, setNeedsSignature] = useState(false);

    const checkContractSignature = async (userId: string, role: UserRole) => {
        if (role !== UserRole.DIRETOR) {
            setNeedsSignature(false);
            return;
        }

        const { data } = await supabase
            .from('contract_signatures')
            .select('id')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

        setNeedsSignature(!data);
    };

    const fetchProfile = async (userId: string, email: string) => {
        try {
            let { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!data && !error) {
                const { data: claimed } = await supabase.rpc('claim_profile_by_email');

                if (claimed) {
                    const { data: refreshed } = await supabase.from('users').select('*').eq('id', userId).single();
                    data = refreshed;
                } else {
                    const newProfile = {
                        id: userId,
                        email: email,
                        name: email.split('@')[0],
                        role: UserRole.CLIENTE,
                        school_id: null,
                        active: true
                    };

                    const { error: insertError } = await supabase.from('users').insert(newProfile);
                    if (!insertError) {
                        data = newProfile as any;
                    }
                }
            }

            if (data) {
                const userObj: User = {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role as UserRole,
                    schoolId: data.school_id,
                    assignedSchools: data.assigned_schools,
                    active: data.active,
                    gee: data.gee,
                    avatar_url: data.avatar_url
                };
                setCurrentUser(userObj);
                checkContractSignature(userObj.id, userObj.role);
            } else {
                setCurrentUser(null);
            }
        } catch (err) {
            console.error('Error in fetchProfile:', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
            await fetchProfile(data.session.user.id, data.session.user.email!);
        }
    };

    useEffect(() => {
        const initSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data.session?.user) {
                await fetchProfile(data.session.user.id, data.session.user.email!);
            } else {
                setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            } else {
                setCurrentUser(null);
                setNeedsSignature(false);
                setLoading(false);
            }
        });

        initSession();

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setNeedsSignature(false);
    };

    return (
        <AuthContext.Provider value={{ currentUser, loading, logout, refreshProfile, needsSignature, setNeedsSignature }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
