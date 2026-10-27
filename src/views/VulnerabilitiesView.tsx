import React, { useEffect, useState } from 'react';
import { ShieldAlert, Search, ExternalLink, SlidersHorizontal, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Project, Vulnerability } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface VulnerabilitiesViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string, projectId?: string) => void;
}

export const VulnerabilitiesView: React.FC<VulnerabilitiesViewProps> = ({
  selectedProject,
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(selectedProject?.id || 'ALL');
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVulns();
  }, [selectedProjectId]);

  const loadVulns = async () => {
    try {
      setLoading(true);
      if (selectedProjectId === 'ALL') {
        const res = await api.getAllVulnerabilities();
        setVulnerabilities(res.vulnerabilities);
      } else {
        const res = await api.getProjectVulnerabilities(selectedProjectId);
        setVulnerabilities(res.vulnerabilities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = vulnerabilities.filter(v => {
    const matchesSearch = v.cveId.toLowerCase().includes(search.toLowerCase()) ||
      v.componentName.toLowerCase().includes(search.toLowerCase()) ||
      v.summary.toLowerCase().includes(search.toLowerCase());
    const matchesSev = filterSeverity === 'ALL' || v.severity === filterSeverity;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Vulnerability Center & Advisory Intelligence</h1>
          <p className="text-xs text-slate-400 mt-1">
            Official NVD and OSV security findings enriched with CVSS v3.1 vectors, CISA KEV exploitation telemetry, and verified fix availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Projects ({projects.length})</option>
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
            placeholder="Search CVE ID, package, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                filterSeverity === sev
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Vulnerabilities Catalog Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-slate-400">Loading vulnerability catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[#111827] border border-slate-800 rounded space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-medium text-slate-200">No vulnerabilities matching current criteria</div>
          <p className="text-xs text-slate-500">Your dependency manifests satisfy baseline security constraints.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((vuln) => (
            <div
              key={vuln.id}
              className="p-5 bg-[#111827] border border-slate-800 rounded space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-mono text-white tracking-wide">
                      {vuln.cveId}
                    </span>
                    <SeverityBadge severity={vuln.severity} score={vuln.cvssScore} showScore />
                    {vuln.hasKnownExploit && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-700">
                        CISA KEV: Weaponized In-The-Wild
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-cyan-400">
                    {vuln.summary}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const p = projects.find(item => item.manifestFiles.some(m => m.content.includes(vuln.componentName)));
                      if (p) onSelectProject(p);
                      onNavigate('fix-simulator', selectedProjectId !== 'ALL' ? selectedProjectId : undefined);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5"
                  >
                    <span>Simulate Upgrade</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {vuln.description}
              </p>

              {/* Technical Telemetry Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-900/80 border border-slate-800/80 rounded font-mono text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Affected Package</span>
                  <span className="text-slate-200 font-bold block mt-0.5">
                    {vuln.componentName} <span className="text-slate-400 font-normal">v{vuln.componentVersion}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Affected Versions</span>
                  <span className="text-rose-400 block mt-0.5">{vuln.affectedRange}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Verified Fixed Version</span>
                  <span className="text-emerald-400 font-bold block mt-0.5">
                    {vuln.fixedVersion || 'No fixed release available'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">EPSS Exploit Likelihood</span>
                  <span className="text-slate-200 block mt-0.5">
                    {vuln.epssScore ? `${(vuln.epssScore * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Reference Links & CWEs */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-800/60 font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Weakness:</span>
                  {vuln.cwe.map(c => (
                    <span key={c} className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {vuln.referenceUrls.slice(0, 2).map((url, uIdx) => (
                    <a
                      key={uIdx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                    >
                      <span>Advisory #{uIdx + 1}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
