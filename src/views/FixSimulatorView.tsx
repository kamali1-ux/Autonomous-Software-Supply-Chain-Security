import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Project, Vulnerability } from '../types';

interface FixSimulatorViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string, projectId?: string) => void;
}

export const FixSimulatorView: React.FC<FixSimulatorViewProps> = ({
  selectedProject,
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedCve, setSelectedCve] = useState<string>('');
  const [candidateVersion, setCandidateVersion] = useState<string>('');
  const [simulation, setSimulation] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeProjectId) {
      loadVulns(activeProjectId);
    }
  }, [activeProjectId]);

  const loadVulns = async (projId: string) => {
    try {
      const res = await api.getProjectVulnerabilities(projId);
      setVulnerabilities(res.vulnerabilities);
      if (res.vulnerabilities.length > 0) {
        const first = res.vulnerabilities[0];
        setSelectedCve(first.cveId);
        setCandidateVersion(first.fixedVersion || 'latest');
        runSimulation(projId, first.cveId, first.fixedVersion || 'latest');
      } else {
        setSelectedCve('');
        setSimulation(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runSimulation = async (projId: string, cveId: string, candVer?: string) => {
    try {
      setSimulating(true);
      const res = await api.simulateFix(projId, cveId, candVer);
      setSimulation(res.simulation);
    } catch (err) {
      console.error(err);
      setSimulation(null);
    } finally {
      setSimulating(false);
    }
  };

  const handleCveChange = (cve: string) => {
    setSelectedCve(cve);
    const targetVuln = vulnerabilities.find(v => v.cveId === cve);
    const fixedVer = targetVuln?.fixedVersion || 'latest';
    setCandidateVersion(fixedVer);
    runSimulation(activeProjectId, cve, fixedVer);
  };

  const handleCreateProposal = async () => {
    try {
      setCreatingProposal(true);
      setProposalSuccess(null);
      const res = await api.createProposal(activeProjectId, selectedCve, candidateVersion);
      setProposalSuccess(`Remediation Proposal ${res.proposal.id} created successfully! Forwarded to Approval Center.`);
    } catch (err: any) {
      alert(`Failed to create proposal: ${err.message}`);
    } finally {
      setCreatingProposal(false);
    }
  };

  const targetVuln = vulnerabilities.find(v => v.cveId === selectedCve);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">What-If Dependency Fix Simulator</h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate candidate package upgrades, estimate SemVer breaking change compatibility risk, and project residual security impact.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {vulnerabilities.length === 0 ? (
        <div className="py-20 text-center bg-[#111827] border border-slate-800 rounded space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-semibold text-white">No active vulnerabilities in this project</div>
          <p className="text-xs text-slate-400">All components are at clean or fully patched versions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="p-5 bg-[#111827] border border-slate-800 rounded space-y-5">
            <h2 className="text-sm font-semibold text-slate-200">Select Vulnerability Target</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Vulnerability (CVE)</label>
                <select
                  value={selectedCve}
                  onChange={(e) => handleCveChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {vulnerabilities.map(v => (
                    <option key={v.id} value={v.cveId}>
                      {v.cveId} - {v.componentName} ({v.severity})
                    </option>
                  ))}
                </select>
              </div>

              {targetVuln && (
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded text-xs space-y-2 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Installed Component:</span>
                    <span className="text-white font-bold">{targetVuln.componentName}</span>
                    <span className="text-slate-400 ml-1">@{targetVuln.componentVersion}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Severity:</span>
                    <span className="text-rose-400 font-bold">{targetVuln.severity} (CVSS {targetVuln.cvssScore})</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Proposed Upgrade Version</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={candidateVersion}
                    onChange={(e) => {
                      setCandidateVersion(e.target.value);
                      runSimulation(activeProjectId, selectedCve, e.target.value);
                    }}
                    placeholder="e.g. 2.17.1"
                    className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => runSimulation(activeProjectId, selectedCve, candidateVersion)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700"
                  >
                    Simulate
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                  Default: Verified vendor fixed version
                </span>
              </div>
            </div>

            {proposalSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs rounded">
                {proposalSuccess}
              </div>
            )}

            <button
              onClick={handleCreateProposal}
              disabled={creatingProposal || !simulation}
              className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{creatingProposal ? 'Generating Proposal...' : 'Create Formal Remediation Proposal'}</span>
            </button>
          </div>

          {/* Simulation Results Display */}
          <div className="lg:col-span-2 p-6 bg-[#111827] border border-slate-800 rounded flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Predicted Impact & Compatibility Analysis</h2>
                  <p className="text-xs text-slate-500">Estimates before commit based on manifest delta and registry advisories</p>
                </div>
                {simulating && (
                  <span className="text-xs font-mono text-cyan-400 animate-pulse">Computing delta...</span>
                )}
              </div>

              {simulation ? (
                <div className="space-y-6">
                  {/* Before vs After Risk Indicator */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded">
                      <span className="text-[11px] text-slate-500 block">Risk Score Before</span>
                      <span className="text-2xl font-bold text-rose-400 block mt-1 tabular-nums">
                        {simulation.projectRiskScoreBefore}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded">
                      <span className="text-[11px] text-slate-500 block">Projected Risk After</span>
                      <span className="text-2xl font-bold text-emerald-400 block mt-1 tabular-nums">
                        {simulation.projectRiskScoreAfter}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-slate-500 block">Compatibility Confidence</span>
                      <span className="text-2xl font-bold text-cyan-400 block mt-1 tabular-nums">
                        {simulation.compatibilityConfidence}%
                      </span>
                    </div>
                  </div>

                  {/* Breaking Change Risk Assessment */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">SemVer Breaking Change Risk:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        simulation.breakingChangeRisk === 'HIGH' ? 'text-rose-400 bg-rose-950/60 border border-rose-800' :
                        simulation.breakingChangeRisk === 'MEDIUM' ? 'text-amber-400 bg-amber-950/60 border border-amber-800' :
                        'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                      }`}>
                        {simulation.breakingChangeRisk} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans">
                      {simulation.breakingRiskReason}
                    </p>
                  </div>

                  {/* Vulnerabilities Resolved */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Vulnerabilities Resolved by this Bump:</span>
                    <div className="space-y-1.5 font-mono text-xs">
                      {simulation.vulnerabilitiesResolved.map((cve: string) => (
                        <div key={cve} className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded text-emerald-400 flex items-center justify-between">
                          <span>{cve}</span>
                          <span className="text-[11px] font-bold">100% ELIMINATED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-xs font-mono text-slate-500">
                  Select a vulnerability to simulate resolution.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500">
              * Note: Predictions are preliminary estimates until verified by the test runner in an isolated workspace.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
