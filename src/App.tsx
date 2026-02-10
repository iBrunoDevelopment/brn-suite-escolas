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
import ProgramsGuide from './pages/ProgramsGuide';
import LandingPage from './pages/LandingPage';
import Contract from './pages/Contract';
import ValidateReport from './pages/ValidateReport';

import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
    const { currentUser, loading, logout, needsSignature, setNeedsSignature } = useAuth();
    const [activePage, setActivePage] = useState<string>('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        const handlePageChangeEvent = (e: any) => {
            if (e.detail) {
                setActivePage(e.detail);
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('changePage', handlePageChangeEvent);

        return () => {
            window.removeEventListener('changePage', handlePageChangeEvent);
        };
    }, []);

    if (window.location.pathname === '/validate') {
        return <ValidateReport />;
    }

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] text-white">
            <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
                <span className="text-sm font-medium text-slate-400">Carregando sistema...</span>
            </div>
        </div>;
    }

    if (!currentUser) {
        if (showGuide) {
            return <ProgramsGuide onBack={() => setShowGuide(false)} />;
        }
        if (showLogin) {
            return <Login onLogin={() => { }} onBack={() => setShowLogin(false)} />;
        }
        return <LandingPage onLoginClick={() => setShowLogin(true)} onGuideClick={() => setShowGuide(true)} />;
    }

    const renderContent = () => {
        if (!currentUser) return null;

        const isStaff = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERADOR;
        const hasAssignedSchools = currentUser.assignedSchools && currentUser.assignedSchools.length > 0;
        const isAuthorized = isStaff || currentUser.schoolId || hasAssignedSchools;
        const isWaiting = currentUser.active === false || !isAuthorized;

        if (isWaiting) {
            return <WaitingPage user={currentUser} />;
        }

        if (needsSignature) {
            return <Contract user={currentUser} onSigned={() => setNeedsSignature(false)} />;
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
                onLogout={logout}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />

            <div className={`flex flex-col flex-1 min-w-0 transition-all duration-500`}>
                <Topbar
                    user={currentUser}
                    activePageName={needsSignature ? 'Contrato' : activePage}
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
