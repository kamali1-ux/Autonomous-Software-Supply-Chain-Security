import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Upload,
  Layers,
  GitBranch,
  FileCode2,
  Network,
  ShieldAlert,
  BrainCircuit,
  SlidersHorizontal,
  Wrench,
  CheckCircle2,
  FileBarChart,
  History
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  pendingApprovalsCount: number;
  criticalVulnsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  pendingApprovalsCount,
  criticalVulnsCount
}) => {
  const navSections = [
    {
      title: 'Core Platform',
      items: [
        { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Project Management', icon: FolderGit2 },
      ]
    },
    {
      title: 'Ingestion & Discovery',
      items: [
        { id: 'upload-single', label: 'Single Project Upload', icon: Upload },
        { id: 'upload-bulk', label: 'Bulk Project Upload', icon: Layers },
        { id: 'github-repo', label: 'GitHub Ingestion', icon: GitBranch },
        { id: 'sbom-explorer', label: 'SBOM Explorer', icon: FileCode2 },
        { id: 'dependency-graph', label: 'Dependency Graph', icon: Network },
      ]
    },
    {
      title: 'Security Intelligence',
      items: [
        {
          id: 'vulnerabilities',
          label: 'Vulnerability Center',
          icon: ShieldAlert,
          badge: criticalVulnsCount > 0 ? `${criticalVulnsCount}` : undefined,
          badgeColor: 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
        },
        { id: 'risk-intelligence', label: 'AI Risk Intelligence', icon: BrainCircuit },
        { id: 'fix-simulator', label: 'What-If Fix Simulator', icon: SlidersHorizontal },
        { id: 'policies', label: 'Security Policies', icon: SlidersHorizontal },
      ]
    },
    {
      title: 'Autonomous Remediation & Media',
      items: [
        { id: 'self-healing', label: 'Self-Healing Center', icon: Wrench },
        {
          id: 'approval-center',
          label: 'Approval Center',
          icon: CheckCircle2,
          badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
          badgeColor: 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
        },
        { id: 'video-studio', label: 'AI Video & Script Studio', icon: Layers },
        { id: 'reports', label: 'Executive Reports', icon: FileBarChart },
        { id: 'audit-logs', label: 'History & Audit Logs', icon: History },
      ]
    }
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0c111e] border-r border-slate-800 flex flex-col min-h-[calc(100vh-57px)]">
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors text-left ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded font-semibold ${item.badgeColor || 'text-slate-300 bg-slate-800'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>CycloneDX v1.5 Engine</span>
        <span className="text-emerald-400 font-medium">Ready</span>
      </div>
    </aside>
  );
};
