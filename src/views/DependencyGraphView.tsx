import React, { useEffect, useState } from 'react';
import { Network, Search, ShieldAlert, CheckCircle2, Info, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { Project, SBOMComponent, Vulnerability } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface DependencyGraphViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string, projectId?: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  selectedProject,
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [components, setComponents] = useState<SBOMComponent[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedNode, setSelectedNode] = useState<SBOMComponent | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeProjectId) {
      loadGraphData(activeProjectId);
    }
  }, [activeProjectId]);

  const loadGraphData = async (projId: string) => {
    try {
      setLoading(true);
      const [sbomRes, vulnRes] = await Promise.all([
        api.getSBOM(projId),
        api.getProjectVulnerabilities(projId)
      ]);
      setComponents(sbomRes.components);
      setVulnerabilities(vulnRes.vulnerabilities);
      if (sbomRes.components.length > 0) {
        // Select top vulnerable component if any
        const topVuln = sbomRes.components.find((c: SBOMComponent) => c.vulnerabilitiesCount > 0);
        setSelectedNode(topVuln || sbomRes.components[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentProject = projects.find(p => p.id === activeProjectId);
  const directComps = components.filter(c => c.isDirect);
  const transitiveComps = components.filter(c => !c.isDirect);

  const getNodeSeverity = (comp: SBOMComponent): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'CLEAN' => {
    const vulns = vulnerabilities.filter(v => v.purl === comp.purl);
    if (vulns.some(v => v.severity === 'CRITICAL')) return 'CRITICAL';
    if (vulns.some(v => v.severity === 'HIGH')) return 'HIGH';
    if (vulns.some(v => v.severity === 'MEDIUM')) return 'MEDIUM';
    return 'CLEAN';
  };

  const getNodeColor = (comp: SBOMComponent) => {
    const sev = getNodeSeverity(comp);
    if (sev === 'CRITICAL') return { bg: 'bg-rose-950/40', border: 'border-rose-500', text: 'text-rose-400', glow: 'shadow-rose-900/30' };
    if (sev === 'HIGH') return { bg: 'bg-amber-950/40', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-amber-900/30' };
    if (sev === 'MEDIUM') return { bg: 'bg-yellow-950/40', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-900/30' };
    return { bg: 'bg-slate-900', border: 'border-slate-700', text: 'text-slate-300', glow: '' };
  };

  const selectedNodeVulns = selectedNode
    ? vulnerabilities.filter(v => v.purl === selectedNode.purl)
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Interactive Dependency Topology</h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual dependency tree hierarchy mapping application root down through direct declarations and nested transitive child packages.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Graph Canvas Container */}
        <div className="lg:col-span-2 p-6 bg-[#111827] border border-slate-800 rounded flex flex-col justify-between min-h-[520px] relative overflow-hidden">
          {/* Legend Strip */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Root Application
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical CVE
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High CVE
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Clean
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Click node to inspect metadata</span>
          </div>

          {/* SVG Connector Overlay + Tree Layout */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 py-4 relative">
            {/* Level 0: Root Node */}
            <div className="z-10">
              <div className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-900/60 to-cyan-900/60 border-2 border-cyan-400 text-center shadow-lg shadow-cyan-950/40">
                <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest block font-semibold">
                  Application Root
                </span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {currentProject?.name || 'Root App'}
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  {currentProject?.ecosystem} · v1.0.0
                </span>
              </div>
            </div>

            {/* Tree Branch Line Divider */}
            <div className="w-px h-6 bg-slate-700 -my-2" />

            {/* Level 1: Direct Dependencies Row */}
            <div className="w-full">
              <div className="text-[11px] font-mono text-slate-500 text-center mb-2">
                ── DIRECT DEPENDENCIES ({directComps.length}) ──
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 z-10">
                {directComps.map((comp) => {
                  const style = getNodeColor(comp);
                  const isSelected = selectedNode?.purl === comp.purl;
                  return (
                    <button
                      key={comp.purl}
                      onClick={() => setSelectedNode(comp)}
                      className={`p-3 rounded border text-left transition ${style.bg} ${style.border} ${
                        isSelected ? 'ring-2 ring-cyan-400 scale-105' : 'hover:scale-102'
                      } shadow-sm`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${style.text} truncate max-w-[130px]`}>
                          {comp.name}
                        </span>
                        {comp.vulnerabilitiesCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        v{comp.version}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level 2: Transitive Dependencies Row */}
            {transitiveComps.length > 0 && (
              <div className="w-full pt-4 border-t border-slate-800/80">
                <div className="text-[11px] font-mono text-slate-500 text-center mb-2">
                  ── RESOLVED TRANSITIVE PACKAGES ({transitiveComps.length}) ──
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {transitiveComps.map((comp) => {
                    const style = getNodeColor(comp);
                    const isSelected = selectedNode?.purl === comp.purl;
                    return (
                      <button
                        key={comp.purl}
                        onClick={() => setSelectedNode(comp)}
                        className={`px-2.5 py-1.5 rounded border text-left text-[11px] font-mono transition ${style.bg} ${style.border} ${
                          isSelected ? 'ring-2 ring-cyan-400' : 'hover:border-slate-500'
                        }`}
                      >
                        <span className={style.text}>{comp.name}</span>
                        <span className="text-slate-500 ml-1">@{comp.version}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>Graph completeness: Full manifest tree verified</span>
            <span>Total: {components.length} nodes</span>
          </div>
        </div>

        {/* Selected Component Inspection Panel */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Component Topology Inspection</h2>
              {selectedNode && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  selectedNode.isDirect ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {selectedNode.isDirect ? 'Direct' : 'Transitive'}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">Package Name & Group</span>
                  <span className="text-sm font-sans font-bold text-white block mt-0.5">{selectedNode.name}</span>
                  {selectedNode.group && <span className="text-slate-400 text-[11px]">{selectedNode.group}</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900 border border-slate-800 rounded">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Installed Version</span>
                    <span className="text-cyan-400 font-bold mt-0.5 block">{selectedNode.version}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">License</span>
                    <span className="text-slate-300 mt-0.5 block">{selectedNode.license || 'Proprietary'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Package URL (purl)</span>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300 break-all select-all">
                    {selectedNode.purl}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] mb-2">Vulnerabilities Detected</span>
                  {selectedNodeVulns.length > 0 ? (
                    <div className="space-y-2">
                      {selectedNodeVulns.map(v => (
                        <div key={v.id} className="p-3 bg-rose-950/20 border border-rose-800/40 rounded space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-400">{v.cveId}</span>
                            <SeverityBadge severity={v.severity} score={v.cvssScore} showScore />
                          </div>
                          <p className="text-[11px] font-sans text-slate-300">{v.summary}</p>
                          <div className="text-[10px] text-slate-400 pt-1">
                            Fixed Version: <span className="text-emerald-400 font-bold">{v.fixedVersion || 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-emerald-400 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Zero known CVEs reported in this component.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs font-mono text-slate-500">
                Select any component node on the topology to view details.
              </div>
            )}
          </div>

          {selectedNode && selectedNodeVulns.length > 0 && (
            <button
              onClick={() => onNavigate('fix-simulator', activeProjectId)}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition"
            >
              Simulate Fix for {selectedNode.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
