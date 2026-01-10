
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

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activePage, setActivePage] = useState<string>('dashboard');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    // Using console.warn instead of error to not alarm users if it's just a session expiry
                    console.warn("Auth check:", error.message);
                    setLoading(false);
                    return;
                }
                if (data.session?.user) {
                    fetchProfile(data.session.user.id, data.session.user.email!);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Unexpected:", err);
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
            if (e.detail) setActivePage(e.detail);
        };
        window.addEventListener('changePage', handlePageChangeEvent);

        return () => {
            subscription?.unsubscribe();
            window.removeEventListener('changePage', handlePageChangeEvent);
        };
    }, []);

    const fetchProfile = async (userId: string, email: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

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
                // If auth exists but profile doesn't, Login component handles self-healing.
                // Here we just stop loading.
                console.warn('Profile not found for authenticated user.');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] text-white">
            <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
                <span className="text-sm font-medium text-slate-400">Carregando sistema...</span>
            </div>
        </div>;
    }

    if (!currentUser) {
        return <Login onLogin={() => { }} />;
    }

    const renderContent = () => {
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
            case 'help': return <Help />;
            default: return <Dashboard user={currentUser} />;
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar
                user={currentUser}
                activePage={activePage}
                onPageChange={setActivePage}
                onLogout={handleLogout}
            />
            <div className="flex flex-col flex-1 min-w-0">
                <Topbar user={currentUser} activePageName={activePage} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;
