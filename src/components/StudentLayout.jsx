import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, BarChart3, XCircle, BookOpen, Sun, Moon, Settings, LogOut } from 'lucide-react';

export default function StudentLayout() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('prepnexus_theme');
        if (savedMode !== null) {
            return savedMode === 'dark';
        }
        return true; // Default to dark mode
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('prepnexus_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('prepnexus_theme', 'light');
        }
    }, [darkMode]);

    const handleLogout = () => {
        logout();
        window.location.href = "http://localhost:8080/final/new%20-3.html";
    };
    
    // Quick title mapper
    const getPageTitle = () => {
        if(location.pathname.includes('/tests')) return { title: 'All Tests', sub: 'Manage and review your test papers' };
        if(location.pathname.includes('/analysis')) return { title: 'Analysis', sub: 'Deep dive into your performance' };
        return { title: 'Dashboard', sub: 'Overview of your preparation' };
    };
    const { title, sub } = getPageTitle();

    return (
        <div className="flex h-screen overflow-hidden antialiased" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 flex flex-col border-r" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">P</div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>PrepNexus</h1>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>JEE Adv 2026</p>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    <NavLink to="/dashboard" className={({ isActive }) => `nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-r-lg text-sm ${isActive || window.location.pathname === '/' ? 'active text-blue-700 dark:text-white' : ''}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </NavLink>
                    <NavLink to="/tests" className={({ isActive }) => `nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-r-lg text-sm ${isActive ? 'active text-blue-700 dark:text-white' : ''}`}>
                        <FileText className="w-5 h-5" />
                        All Tests
                    </NavLink>
                    <NavLink to="/analysis" className={({ isActive }) => `nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-r-lg text-sm ${isActive ? 'active text-blue-700 dark:text-white' : ''}`}>
                        <BarChart3 className="w-5 h-5" />
                        Analysis
                    </NavLink>
                    <button className="nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-r-lg text-sm opacity-50 cursor-not-allowed">
                        <XCircle className="w-5 h-5" />
                        Mistakes
                    </button>
                    <button className="nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-r-lg text-sm opacity-50 cursor-not-allowed">
                        <BookOpen className="w-5 h-5" />
                        Notebook
                    </button>
                </nav>

                {currentUser && (
                    <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="card rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                {currentUser.picture ? (
                                    <img src={currentUser.picture} className="w-10 h-10 rounded-full border border-blue-500/30" alt="User" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                )}
                                <div className="overflow-hidden">
                                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{currentUser.name}</div>
                                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{currentUser.class !== 'N/A' ? `Class ${currentUser.class}` : 'Student'}</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span style={{ color: 'var(--text-secondary)' }}>Syllabus</span>
                                <span className="font-mono font-medium text-blue-500">0%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: '0%' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--text-secondary)' }}>
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--text-secondary)' }}>
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleLogout} className="px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium border transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6" id="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
