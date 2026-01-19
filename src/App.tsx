
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Sidebar from './components/Sidebar';
import { supabase } from './lib/supabaseClient';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import FinancialEntries from './pages/FinancialEntries';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Help from './pages/Help';
import Schools from './pages/Schools';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import DocumentSafe from './pages/DocumentSafe';
import BankReconciliation from './pages/BankReconciliation';
import WaitingPage from './pages/WaitingPage';
import GEEPage from './pages/GEE';
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activePage, setActivePage] = useState<string>('dashboard');
    const [loading, setLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {

                    setLoading(false);
                    return;
                }
                if (data.session?.user) {
                    fetchProfile(data.session.user.id, data.session.user.email!);
                } else {
                    setLoading(false);
                }
            } catch (err) {

                setLoading(false);
            }
        };
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        const handlePageChangeEvent = (e: any) => {
            if (e.detail) {
                setActivePage(e.detail);
                setIsMobileMenuOpen(false); // Close mobile menu on navigation
            }
        };
        window.addEventListener('changePage', handlePageChangeEvent);

        return () => {
            subscription?.unsubscribe();
            window.removeEventListener('changePage', handlePageChangeEvent);
        };
    }, []);

    const fetchProfile = async (userId: string, email: string) => {
        setLoading(true);
        try {


            let { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!data && !error) {

                const { data: claimed } = await supabase.rpc('claim_profile_by_email');

                if (claimed) {
                    // Perfil vinculado via RPC. Recarregando...
                    const { data: refreshed } = await supabase.from('users').select('*').eq('id', userId).single();
                    data = refreshed;
                } else {
                    // Criando novo perfil básico...
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
                    } else {
                        // Falha ao criar perfil no self-healing

                    }
                }
            }

            if (data) {
                setCurrentUser({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role as UserRole,
                    schoolId: data.school_id,
                    assignedSchools: data.assigned_schools,
                    active: data.active,
                    gee: data.gee,
                    avatar_url: data.avatar_url
                });
            } else {
                setCurrentUser(null);
            }
        } catch (err) {

        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };


    const [showLogin, setShowLogin] = useState(false);

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] text-white">
            <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
                <span className="text-sm font-medium text-slate-400">Carregando sistema...</span>
            </div>
        </div>;
    }

    if (!currentUser) {
        if (showLogin) {
            return <Login onLogin={setCurrentUser} onBack={() => setShowLogin(false)} />;
        }
        return <LandingPage onLoginClick={() => setShowLogin(true)} />;
    }

    const renderContent = () => {
        const isStaff = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERADOR;
        const hasAssignedSchools = currentUser.assignedSchools && currentUser.assignedSchools.length > 0;
        const isAuthorized = isStaff || currentUser.schoolId || hasAssignedSchools;
        const isWaiting = currentUser.active === false || !isAuthorized;

        if (isWaiting) {
            return <WaitingPage user={currentUser} />;
        }

        switch (activePage) {
            case 'dashboard': return <Dashboard user={currentUser} />;
            case 'entries': return <FinancialEntries user={currentUser} />;
            case 'schools': return <Schools user={currentUser} />;
            case 'users': return <Users user={currentUser} />;
            case 'reports': return <Reports user={currentUser} />;
            case 'vault': return <DocumentSafe user={currentUser} />;
            case 'reconciliation': return <BankReconciliation user={currentUser} />;
            case 'notifications': return <Notifications user={currentUser} />;
            case 'settings': return <Settings user={currentUser} />;
            case 'gee': return <GEEPage user={currentUser} />;
            case 'help': return <Help user={currentUser} />;
            default: return <Dashboard user={currentUser} />;
        }
    };

    const isStaff = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERADOR;
    const hasAssignedSchools = currentUser.assignedSchools && currentUser.assignedSchools.length > 0;
    const isAuthorized = isStaff || currentUser.schoolId || hasAssignedSchools;
    const isWaiting = currentUser.active === false || !isAuthorized;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display relative">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <Sidebar
                user={currentUser}
                activePage={activePage}
                onPageChange={(page) => {
                    setActivePage(page);
                    setIsMobileMenuOpen(false);
                }}
                onLogout={handleLogout}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />

            <div className={`flex flex-col flex-1 min-w-0 transition-all duration-500`}>
                <Topbar
                    user={currentUser}
                    activePageName={isWaiting ? 'waiting' : activePage}
                    onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;
