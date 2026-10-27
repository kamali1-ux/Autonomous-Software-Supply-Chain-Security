import React, { useEffect, useState } from 'react';
import { BrainCircuit, Sparkles, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw, Info, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Project, RiskAssessment } from '../types';

interface RiskIntelligenceViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string, projectId?: string) => void;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({
  selectedProject,
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeProjectId) {
      loadAssessment(activeProjectId);
    }
  }, [activeProjectId]);

  const loadAssessment = async (projId: string) => {
    try {
      setLoading(true);
      const res = await api.getProjectRisk(projId);
      setAssessment(res.riskAssessment);
    } catch (err) {
      console.error(err);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesizeAi = async () => {
    try {
      setAnalyzingAi(true);
      const res = await api.analyzeRisk(activeProjectId);
      setAssessment(res.riskAssessment);
    } catch (err: any) {
      alert(`AI risk analysis failed: ${err.message}`);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const currentProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Explainable Risk Intelligence & AI Synthesis</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              Heuristic + Gemini 3.8
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transparent composite scoring formula combining CVSS base severity, weaponized CISA KEV exploitability, exposure context, and transitive blast radius.
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
            onClick={handleSynthesizeAi}
            disabled={analyzingAi}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{analyzingAi ? 'Synthesizing with Gemini...' : 'Synthesize AI Threat Briefing'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-slate-400">Computing risk assessment...</div>
      ) : !assessment ? (
        <div className="py-20 text-center text-xs font-mono text-slate-500">
          No risk assessment found. Trigger a scan first.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Score & Category Strip */}
          <div className="p-6 bg-[#111827] border border-slate-800 rounded grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="flex items-center gap-4 border-r border-slate-800 pr-6">
              <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-mono border-2 ${
                assessment.riskCategory === 'CRITICAL' ? 'border-rose-500 bg-rose-950/30 text-rose-400' :
                assessment.riskCategory === 'HIGH' ? 'border-amber-500 bg-amber-950/30 text-amber-400' :
                assessment.riskCategory === 'MEDIUM' ? 'border-yellow-500 bg-yellow-950/30 text-yellow-300' :
                'border-emerald-500 bg-emerald-950/30 text-emerald-400'
              }`}>
                <span className="text-2xl font-bold tabular-nums">{assessment.overallScore}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Composite Risk Index</span>
                <span className={`text-base font-bold font-mono mt-0.5 block ${
                  assessment.riskCategory === 'CRITICAL' ? 'text-rose-400' :
                  assessment.riskCategory === 'HIGH' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {assessment.riskCategory} SEVERITY
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Formula: $CVSS + KEV + Exp - Fix$</span>
              </div>
            </div>

            <div className="md:col-span-3 space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Prioritized Action Directive
              </span>
              <p className="text-sm font-medium text-white">
                {assessment.recommendedAction}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onNavigate('self-healing', activeProjectId)}
                  className="px-3 py-1 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 rounded flex items-center gap-1"
                >
                  <span>Review Remediation Proposal</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Mathematical Factor Contributions */}
          <div className="p-6 bg-[#111827] border border-slate-800 rounded space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Mathematical Factor Breakdown</h2>
              <p className="text-xs text-slate-500">Documented weights establishing why this dependency profile is dangerous</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-500 block text-[11px]">1. CVSS Base Weight (45%)</span>
                <span className="text-lg font-bold text-white block mt-1 tabular-nums">+{assessment.baseCvssWeighted} pts</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Peak & average severity</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-500 block text-[11px]">2. Exploitability & KEV (25%)</span>
                <span className="text-lg font-bold text-rose-400 block mt-1 tabular-nums">+{assessment.exploitabilityScore} pts</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Active weaponized exploits</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-500 block text-[11px]">3. Surface Exposure (15%)</span>
                <span className="text-lg font-bold text-amber-400 block mt-1 tabular-nums">+{assessment.exposureContextScore} pts</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Direct vs isolated manifest</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-500 block text-[11px]">4. Transitive Depth (10%)</span>
                <span className="text-lg font-bold text-yellow-300 block mt-1 tabular-nums">+{assessment.transitiveRiskScore} pts</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Nested dependency tree</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-500 block text-[11px]">5. Fix Discount (Mitigation)</span>
                <span className="text-lg font-bold text-emerald-400 block mt-1 tabular-nums">-{assessment.remediationAvailabilityScore} pts</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Verified patch published</span>
              </div>
            </div>

            {/* Factor Details List */}
            <div className="space-y-2 pt-2">
              {assessment.contributingFactors.map((factor, fIdx) => (
                <div
                  key={fIdx}
                  className="p-3 bg-slate-900/60 border border-slate-800/80 rounded flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">{factor.factor}</div>
                    <div className="text-slate-400 font-sans">{factor.description}</div>
                  </div>
                  <span className={`font-mono font-bold shrink-0 text-xs ${
                    factor.impact === 'CRITICAL' ? 'text-rose-400' :
                    factor.impact === 'HIGH' ? 'text-amber-400' :
                    factor.impact === 'POSITIVE' ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {factor.scoreContribution > 0 ? `+${factor.scoreContribution}` : factor.scoreContribution} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Natural Language Threat Briefing (AI/Gemini Output) */}
          <div className="p-6 bg-[#111827] border border-cyan-800/40 rounded space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Executive Threat Intelligence Briefing</h2>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
              {assessment.aiExplanation || (
                <p>
                  Click "Synthesize AI Threat Briefing" above to generate a plain-language analysis of attack blast radius, exploitation vectors, and remediation roadmap.
                </p>
              )}
            </div>

            {/* Model & Limitations Footnote */}
            <div className="text-[11px] font-mono text-slate-500 space-y-1 pt-1">
              <div className="font-semibold text-slate-400">Formal Audit Limitations:</div>
              {assessment.limitations.map((lim, lIdx) => (
                <div key={lIdx}>· {lim}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
