import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown,
  Activity,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { DashboardSummary, Project } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface DashboardViewProps {
  onNavigate: (view: string, projectId?: string) => void;
  onSelectProject: (p: Project) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectProject }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, trendRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTrends()
      ]);
      setSummary(sumRes);
      setTrends(trendRes.trends);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm font-mono text-slate-400">Loading supply chain telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8">
        <div className="p-4 bg-rose-950/30 border border-rose-800 rounded text-rose-300 text-sm">
          Failed to load dashboard data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title & Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Supply Chain Security & Autonomous Healing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time SBOM inventory, vulnerability scanning pipeline, and policy-gated remediation engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('upload-single')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
          >
            + Upload Project
          </button>
          <button
            onClick={() => onNavigate('upload-bulk')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          >
            Bulk Queue
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] font-medium text-slate-400">Total Projects</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {summary.totalProjects}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>{summary.projectsScanned} scanned</span>
            <span aria-hidden="true" className="mx-1">·</span>
            <span>{summary.pendingScans} pending</span>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] font-medium text-slate-400">Dependencies Discovered</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
            {summary.totalDependencies}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Direct & transitive</div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] font-medium text-rose-400">Critical CVEs</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {summary.criticalCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">CVSS $\ge$ 9.0</div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] font-medium text-amber-400">High CVEs</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {summary.highCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">CVSS 7.0 - 8.9</div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] font-medium text-yellow-300">Medium & Low CVEs</div>
          <div className="text-2xl font-bold font-mono text-yellow-300 mt-1 tabular-nums">
            {summary.mediumCount + summary.lowCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">CVSS &lt; 7.0</div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] font-medium text-slate-400">Average Risk Score</div>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${
            summary.averageRiskScore >= 70 ? 'text-rose-400' : summary.averageRiskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {summary.averageRiskScore}<span className="text-xs text-slate-500 font-normal">/100</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Weighted metric</div>
        </div>
      </div>

      {/* Main Charts & Analytics Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 bg-[#111827] border border-slate-800 rounded space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Vulnerability Remediation Trajectory</h2>
              <p className="text-xs text-slate-500">Historical vulnerability density vs. automated self-healing resolution</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Resolved
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                <Area type="monotone" dataKey="critical" stroke="#f43f5e" fillOpacity={1} fill="url(#colorCritical)" name="Critical CVEs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projects Requiring Attention Card */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Requires Attention</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-800/50">
                {summary.projectsNeedingAttentionCount} projects
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              High exposure projects with unmitigated Critical CVEs or high composite risk.
            </p>

            <div className="space-y-2.5">
              {summary.projectsNeedingAttention.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('projects')}
                  className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded transition cursor-pointer flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>{p.ecosystem}</span>
                      <span aria-hidden="true" className="mx-1">·</span>
                      <span className="text-rose-400 font-semibold">{p.criticalCount} Critical</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-rose-400">{p.riskScore}</span>
                    <span className="text-[10px] text-slate-500 block">Risk</span>
                  </div>
                </div>
              ))}

              {summary.projectsNeedingAttention.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  All active projects within acceptable risk thresholds.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('self-healing')}
            className="w-full mt-4 py-2 px-3 text-xs font-medium text-cyan-400 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-800/40 rounded transition flex items-center justify-center gap-1.5"
          >
            <span>Launch Self-Healing Workflow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scans Table */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Recent Scanner Executions</h2>
            <button
              onClick={() => onNavigate('upload-bulk')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              View Queue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono text-[11px]">
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Scanner</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {summary.recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-sans font-medium text-slate-300 truncate max-w-[140px]">
                      {scan.projectName}
                    </td>
                    <td className="py-2.5 text-slate-400 text-[11px]">{scan.scanner}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        scan.status === 'COMPLETED' ? 'bg-emerald-950/50 text-emerald-400' :
                        scan.status === 'RUNNING' ? 'bg-cyan-950/50 text-cyan-400 animate-pulse' :
                        scan.status === 'FAILED' ? 'bg-rose-950/50 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-300 tabular-nums">
                      {scan.stats ? (
                        <span>{scan.stats.criticalCount}C / {scan.stats.highCount}H</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Healing Actions */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Recent Self-Healing Events</h2>
            <button
              onClick={() => onNavigate('self-healing')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              All Actions
            </button>
          </div>

          <div className="space-y-2.5">
            {summary.recentHealing.map((heal) => (
              <div
                key={heal.id}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-slate-200">
                    {heal.componentName} <span className="font-mono text-slate-500">{heal.currentVersion} → {heal.targetVersion}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    <span>{heal.projectName}</span>
                    <span aria-hidden="true" className="mx-1">·</span>
                    <span className="text-cyan-400">{heal.vulnerabilitiesAddressed.join(', ')}</span>
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    heal.status === 'VERIFIED' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40' :
                    heal.status === 'APPROVED' ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40' :
                    heal.status === 'PENDING_APPROVAL' ? 'text-amber-400 bg-amber-950/40 border border-amber-800/40' :
                    'text-slate-400 bg-slate-800'
                  }`}>
                    {heal.status}
                  </span>
                </div>
              </div>
            ))}

            {summary.recentHealing.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No self-healing proposals currently active.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
