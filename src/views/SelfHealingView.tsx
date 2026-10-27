import React, { useEffect, useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Terminal,
  Activity,
  FileCode2,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { Project, RemediationProposal } from '../types';

interface SelfHealingViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string, projectId?: string) => void;
}

export const SelfHealingView: React.FC<SelfHealingViewProps> = ({
  selectedProject,
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [selectedProposalLogs, setSelectedProposalLogs] = useState<{ id: string; logs: string[] } | null>(null);

  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeProjectId) {
      loadProposals(activeProjectId);
    }
  }, [activeProjectId]);

  const loadProposals = async (projId: string) => {
    try {
      setLoading(true);
      const res = await api.getProposals(projId);
      setProposals(res.proposals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (proposalId: string) => {
    try {
      setExecutingId(proposalId);
      const res = await api.executeRemediation(proposalId);
      setSelectedProposalLogs({ id: proposalId, logs: res.executionLog });
      await loadProposals(activeProjectId);
      // update project state in parent if needed
      onSelectProject(res.project);
    } catch (err: any) {
      alert(`Remediation execution failed: ${err.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleRollback = async (proposalId: string) => {
    if (!window.confirm('Confirm rollback? This will restore the dependency manifest to its previous snapshot and re-run verification.')) {
      return;
    }
    try {
      await api.rollbackRemediation(proposalId);
      await loadProposals(activeProjectId);
      alert('Rollback completed. Project restored to pre-patch state.');
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  const currentProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Autonomous Self-Healing Center</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              Verified Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controlled dependency upgrades with automated regression test execution, post-fix SBOM regeneration, and objective vulnerability re-scanning.
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

          <button
            onClick={() => onNavigate('fix-simulator', activeProjectId)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition"
          >
            + Create New Proposal
          </button>
        </div>
      </div>

      {/* Safety Policy Directive Banner */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
          <div>
            <span className="text-white font-semibold block">Low-Risk Upgrades</span>
            <span className="text-slate-400 text-[11px]">Eligible for automated unattended remediation when tests pass.</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
          <div>
            <span className="text-white font-semibold block">Medium-Risk Upgrades</span>
            <span className="text-slate-400 text-[11px]">Requires Developer signoff before manifest update.</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
          <div>
            <span className="text-white font-semibold block">Critical & High Vulnerabilities</span>
            <span className="text-slate-400 text-[11px]">Explicit Security Analyst / Admin authorization mandatory.</span>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-slate-400">Loading self-healing proposals...</div>
      ) : proposals.length === 0 ? (
        <div className="py-20 text-center bg-[#111827] border border-slate-800 rounded space-y-3">
          <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-white">No remediation proposals queued for this project</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Use the Fix Simulator or Vulnerability Center to simulate and generate verified remediation proposals.
          </p>
          <button
            onClick={() => onNavigate('fix-simulator', activeProjectId)}
            className="px-4 py-2 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded hover:bg-cyan-900/40"
          >
            Open Fix Simulator
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.map((proposal) => {
            const isExecuting = executingId === proposal.id;
            return (
              <div
                key={proposal.id}
                className="p-6 bg-[#111827] border border-slate-800 rounded space-y-5 hover:border-slate-700 transition"
              >
                {/* Proposal Top Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-slate-500">{proposal.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        proposal.status === 'VERIFIED' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40' :
                        proposal.status === 'APPROVED' ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/40' :
                        proposal.status === 'PENDING_APPROVAL' ? 'text-amber-400 bg-amber-950/60 border border-amber-800/40' :
                        proposal.status === 'ROLLED_BACK' ? 'text-slate-400 bg-slate-800' :
                        'text-rose-400 bg-rose-950/60 border border-rose-800/40'
                      }`}>
                        STATUS: {proposal.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Requires: {proposal.requiredApprovalRole}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-1">
                      Upgrade {proposal.componentName}:{' '}
                      <span className="text-rose-400 font-mono">v{proposal.currentVersion}</span> →{' '}
                      <span className="text-emerald-400 font-mono">v{proposal.targetVersion}</span>
                    </h3>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2">
                    {proposal.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => onNavigate('approval-center')}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-700 rounded transition"
                      >
                        Review in Approval Center
                      </button>
                    )}

                    {proposal.status === 'APPROVED' && (
                      <button
                        onClick={() => handleExecute(proposal.id)}
                        disabled={isExecuting}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isExecuting ? 'Running Verification Pipeline...' : 'Execute Controlled Patch & Verify'}</span>
                      </button>
                    )}

                    {proposal.status === 'VERIFIED' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verified & Deployed</span>
                        </span>
                        <button
                          onClick={() => handleRollback(proposal.id)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Rollback</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-slate-500 block text-[11px]">Vulnerabilities Targeted</span>
                    <span className="text-rose-400 font-bold block mt-0.5">
                      {proposal.vulnerabilitiesAddressed.join(', ')}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-slate-500 block text-[11px]">Project Risk Impact</span>
                    <span className="text-white block mt-0.5">
                      <span className="text-rose-400">{proposal.riskBefore}</span> →{' '}
                      <span className="text-emerald-400 font-bold">{proposal.riskAfter} / 100</span>
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-slate-500 block text-[11px]">Breaking Change Risk</span>
                    <span className={`font-bold block mt-0.5 ${
                      proposal.breakingChangeRisk === 'HIGH' ? 'text-rose-400' :
                      proposal.breakingChangeRisk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {proposal.breakingChangeRisk}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-slate-500 block text-[11px]">Ecosystem Manifest</span>
                    <span className="text-cyan-400 block mt-0.5">{proposal.ecosystem}</span>
                  </div>
                </div>

                {/* Execution Log Terminal if verified or currently executing */}
                {(proposal.verificationResult || (selectedProposalLogs && selectedProposalLogs.id === proposal.id)) && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Autonomous Verification Terminal Output</span>
                      </div>
                      <span className="text-[11px] text-emerald-400">Sandbox: /tmp/workspace/shopease-patch</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                      {(proposal.verificationResult?.executionLog || selectedProposalLogs?.logs || []).map((line, lIdx) => (
                        <div key={lIdx} className="leading-relaxed">{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
