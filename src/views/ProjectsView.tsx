import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Trash2,
  Play,
  FileCode2,
  BrainCircuit,
  ShieldAlert,
  Search,
  ExternalLink,
  Layers,
  Archive,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Project } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface ProjectsViewProps {
  onNavigate: (view: string, projectId?: string) => void;
  onSelectProject: (p: Project) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onNavigate, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEco, setFilterEco] = useState('ALL');
  const [scanningId, setScanningId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.getProjects();
      setProjects(res.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setScanningId(projectId);
      await api.triggerScan(projectId);
      await loadProjects();
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async (projectId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project '${name}'? All scan results will be permanently removed.`)) {
      return;
    }
    try {
      await api.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesEco = filterEco === 'ALL' || p.ecosystem === filterEco;
    return matchesSearch && matchesEco;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Project Registry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered software repositories, dependency manifests, and vulnerability scan status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('upload-single')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition"
          >
            + Ingest Project
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded">
          {['ALL', 'MAVEN', 'NPM', 'PYPI'].map(eco => (
            <button
              key={eco}
              onClick={() => setFilterEco(eco)}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                filterEco === eco
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {eco}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-slate-400">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[#111827] border border-slate-800 rounded space-y-3">
          <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-medium text-slate-300">No projects match the criteria</div>
          <button
            onClick={() => onNavigate('upload-single')}
            className="px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded hover:bg-cyan-900/40"
          >
            Upload a Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const isScanning = scanningId === p.id;
            return (
              <div
                key={p.id}
                className="p-5 bg-[#111827] border border-slate-800 hover:border-slate-700 rounded transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                          {p.ecosystem}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {p.sourceType === 'GITHUB_REPO' ? 'GitHub' : p.sourceType === 'ZIP_UPLOAD' ? 'ZIP Archive' : 'Manifest'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-2 hover:text-cyan-400 transition cursor-pointer"
                        onClick={() => {
                          onSelectProject(p);
                          onNavigate('sbom-explorer', p.id);
                        }}
                      >
                        {p.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-mono font-bold ${
                        p.riskScore >= 70 ? 'text-rose-400' : p.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {p.riskScore}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Risk</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {p.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">{p.totalDependencies} Components</span>
                    <div className="flex items-center gap-1.5">
                      {p.criticalCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-400 border border-rose-800/40 font-bold">
                          {p.criticalCount} Critical
                        </span>
                      )}
                      {p.highCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          {p.highCount} High
                        </span>
                      )}
                      {p.criticalCount === 0 && p.highCount === 0 && (
                        <span className="text-emerald-400 text-[11px]">Clean</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleScan(p.id, e)}
                      disabled={isScanning}
                      title="Trigger fresh vulnerability scan"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        onSelectProject(p);
                        onNavigate('sbom-explorer', p.id);
                      }}
                      title="View CycloneDX SBOM"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectProject(p);
                        onNavigate('risk-intelligence', p.id);
                      }}
                      title="Explainable Risk Analysis"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectProject(p);
                        onNavigate('self-healing', p.id);
                      }}
                      title="Self-Healing Patch Center"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleDelete(p.id, p.name, e)}
                    title="Delete project"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
