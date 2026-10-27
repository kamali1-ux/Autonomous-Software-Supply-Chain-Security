import React, { useEffect, useState } from 'react';
import { History, Search, Filter, ShieldCheck, Clock, UserCheck, Wrench, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, Project } from '../types';

interface AuditLogsViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  selectedProject,
  projects,
  onSelectProject
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(selectedProject?.id || 'ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [selectedProjectId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs(selectedProjectId === 'ALL' ? undefined : selectedProjectId);
      setLogs(res.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || log.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Security History & Immutable Audit Logs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Chronological audit trail recording all scanner runs, policy evaluations, remediation proposals, and administrative approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded font-mono">
          {['ALL', 'SCAN', 'REMEDIATION', 'APPROVAL', 'SECURITY', 'PROJECT'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-[11px] font-medium rounded transition ${
                filterCategory === cat
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="p-5 bg-[#111827] border border-slate-800 rounded">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-400">Loading audit trail...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-slate-500">
            No audit records match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5">Actor / Origin</th>
                  <th className="pb-2.5">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.category === 'SCAN' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' :
                        log.category === 'APPROVAL' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' :
                        log.category === 'REMEDIATION' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' :
                        log.category === 'SECURITY' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 text-slate-200 font-sans font-medium">{log.userName}</td>
                    <td className="py-3 text-slate-300 font-sans leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
