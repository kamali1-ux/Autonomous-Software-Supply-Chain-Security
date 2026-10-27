import React, { useEffect, useState } from 'react';
import {
  FileCode2,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { Project, SBOMComponent } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface SbomViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string, projectId?: string) => void;
}

export const SbomView: React.FC<SbomViewProps> = ({
  selectedProject,
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [components, setComponents] = useState<SBOMComponent[]>([]);
  const [sbomData, setSbomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DIRECT' | 'TRANSITIVE' | 'VULNERABLE'>('ALL');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeProjectId) {
      loadSBOM(activeProjectId);
    }
  }, [activeProjectId]);

  const loadSBOM = async (projId: string) => {
    try {
      setLoading(true);
      const res = await api.getSBOM(projId);
      setComponents(res.components);
      setSbomData(res.sbom);
    } catch (err) {
      console.error(err);
      setComponents([]);
      setSbomData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!sbomData) return;
    navigator.clipboard.writeText(JSON.stringify(sbomData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!sbomData) return;
    const blob = new Blob([JSON.stringify(sbomData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyclonedx-sbom-${activeProjectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const res = await api.importSBOM(importJsonText, 'Imported CycloneDX Document');
      setImportModal(false);
      setImportJsonText('');
      onSelectProject(res.project);
      setActiveProjectId(res.project.id);
      await loadSBOM(res.project.id);
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  const currentProject = projects.find(p => p.id === activeProjectId);

  const filtered = components.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.purl.toLowerCase().includes(search.toLowerCase()) ||
      (c.group && c.group.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'DIRECT') return c.isDirect;
    if (filterType === 'TRANSITIVE') return !c.isDirect;
    if (filterType === 'VULNERABLE') return c.vulnerabilitiesCount > 0;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">CycloneDX SBOM Explorer</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              Spec 1.5 JSON
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Software Bill of Materials with normalized package URLs (purl), cryptographic integrity hashes, and vulnerability mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Switcher */}
          <select
            value={activeProjectId}
            onChange={(e) => {
              setActiveProjectId(e.target.value);
              const p = projects.find(item => item.id === e.target.value);
              if (p) onSelectProject(p);
            }}
            className="text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.ecosystem})</option>
            ))}
          </select>

          <button
            onClick={() => setShowJsonModal(true)}
            disabled={!sbomData}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>JSON Preview</span>
          </button>

          <button
            onClick={handleDownloadJson}
            disabled={!sbomData}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CycloneDX</span>
          </button>

          <button
            onClick={() => setImportModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import SBOM</span>
          </button>
        </div>
      </div>

      {/* Metadata Overview Banner */}
      {sbomData && (
        <div className="p-4 bg-[#111827] border border-slate-800 rounded grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[11px]">CycloneDX Serial Number</span>
            <span className="text-slate-300 truncate block mt-0.5" title={sbomData.serialNumber}>{sbomData.serialNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Timestamp</span>
            <span className="text-slate-300 block mt-0.5">{new Date(sbomData.metadata?.timestamp || Date.now()).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Total Components Cataloged</span>
            <span className="text-cyan-400 font-bold block mt-0.5 tabular-nums">{components.length} components</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Direct vs. Transitive</span>
            <span className="text-slate-300 block mt-0.5 tabular-nums">
              {components.filter(c => c.isDirect).length} direct · {components.filter(c => !c.isDirect).length} transitive
            </span>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by package name, group, or purl..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded">
          {(['ALL', 'DIRECT', 'TRANSITIVE', 'VULNERABLE'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                filterType === type
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Components Table */}
      <div className="p-5 bg-[#111827] border border-slate-800 rounded">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-400">Loading SBOM components...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-slate-500">
            No components match the selected search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono text-[11px]">
                  <th className="pb-2.5">Component / Package</th>
                  <th className="pb-2.5">Version</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">License</th>
                  <th className="pb-2.5">Package URL (purl)</th>
                  <th className="pb-2.5 text-right">CVE Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filtered.map((c) => (
                  <tr key={c.purl} className="hover:bg-slate-800/30">
                    <td className="py-3 font-sans font-medium text-slate-200">
                      <div>
                        <span>{c.name}</span>
                        {c.group && <span className="text-[11px] text-slate-500 font-mono block">{c.group}</span>}
                      </div>
                    </td>
                    <td className="py-3 text-cyan-400 tabular-nums">{c.version}</td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        c.isDirect ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.isDirect ? 'Direct' : 'Transitive'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{c.license || 'Unknown'}</td>
                    <td className="py-3 text-slate-500 truncate max-w-[280px]" title={c.purl}>
                      {c.purl}
                    </td>
                    <td className="py-3 text-right">
                      {c.vulnerabilitiesCount > 0 ? (
                        <button
                          onClick={() => onNavigate('vulnerabilities', activeProjectId)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 hover:bg-rose-900/60"
                        >
                          {c.vulnerabilitiesCount} CVE{c.vulnerabilitiesCount > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-emerald-400 text-[11px]">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Preview Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">CycloneDX 1.5 JSON Artifact</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-slate-300">
              <pre>{JSON.stringify(sbomData, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-lg max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Import CycloneDX SBOM</h3>
              <button onClick={() => setImportModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            {importError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded">
                {importError}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Paste CycloneDX 1.4/1.5 JSON</label>
                <textarea
                  rows={10}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{ "bomFormat": "CycloneDX", "specVersion": "1.5", ... }'
                  className="w-full p-3 font-mono text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded"
                >
                  Validate & Ingest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
