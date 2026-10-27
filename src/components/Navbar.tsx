import React from 'react';
import { ShieldCheck, Play, UserCheck, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User;
  onRoleSwitch: (role: 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER') => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onRoleSwitch,
  onResetDemo,
  isResetting
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0d1322]/90 backdrop-blur border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
          SBOM <span className="text-cyan-400">GUARDIAN</span>
        </span>
      </div>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${currentView === 'dashboard' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('projects')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${currentView === 'projects' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Projects
        </button>
        <button
          onClick={() => onNavigate('vulnerabilities')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${currentView === 'vulnerabilities' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Vulnerabilities
        </button>
        <button
          onClick={() => onNavigate('self-healing')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${currentView === 'self-healing' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Self-Healing
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${currentView === 'reports' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Reports
        </button>
      </nav>

      {/* Zone 3: 1 primary action cluster */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Demo Reset Button */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          title="Reset ShopEase Maven benchmark project for evaluation"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset ShopEase Demo</span>
        </button>

        {/* Role Switcher for Seamless College Evaluation */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-medium text-slate-200">{currentUser.name}</span>
            <span className="text-[11px] font-mono text-cyan-400">{currentUser.role}</span>
          </div>

          <select
            value={currentUser.role}
            onChange={(e) => onRoleSwitch(e.target.value as any)}
            className="text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            title="Switch user role to test permissions"
          >
            <option value="ADMIN">Role: Admin</option>
            <option value="SECURITY_ANALYST">Role: Security Analyst</option>
            <option value="DEVELOPER">Role: Developer</option>
          </select>
        </div>
      </div>
    </header>
  );
};
