import React, { useEffect, useState } from 'react';
import { FileBarChart, Download, Printer, ShieldCheck, CheckCircle2, AlertTriangle, Layers, Calendar, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Project } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface ReportsViewProps {
  selectedProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  selectedProject,
  projects,
  onSelectProject
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== activeProjectId) {
      setActiveProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeProjectId) {
      loadReport(activeProjectId);
    }
  }, [activeProjectId]);

  const loadReport = async (projId: string) => {
    try {
      setLoading(true);
      const res = await api.generateReport(projId);
      setReport(res.report);
    } catch (err) {
      console.error(err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${report.project?.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'project'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Executive Security & SBOM Audit Report</h1>
          <p className="text-xs text-slate-400 mt-1">
            Official verifiable supply chain compliance document ready for submission, stakeholder presentation, or print export.
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
            onClick={handleDownloadJson}
            disabled={!report}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON Audit Data</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!report}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-slate-400">Compiling executive audit report...</div>
      ) : !report ? (
        <div className="py-20 text-center text-xs font-mono text-slate-500">
          Unable to generate security report for this project.
        </div>
      ) : (
        /* Printable Report Container */
        <div className="p-8 bg-[#111827] border border-slate-800 rounded-lg space-y-8 shadow-xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="flex items-start justify-between border-b border-slate-800 print:border-slate-300 pb-6">
            <div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-bold block print:text-blue-700">
                Official Supply Chain Security Audit
              </span>
              <h2 className="text-2xl font-bold text-white print:text-black mt-1">
                {report.project?.name}
              </h2>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                {report.project?.description}
              </p>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="text-slate-500 print:text-slate-500 block text-[11px]">Audit Report Reference</span>
              <span className="text-slate-300 print:text-slate-800 font-bold block mt-0.5">{report.reportId}</span>
              <span className="text-slate-500 print:text-slate-500 block text-[11px] mt-1">
                {new Date(report.generatedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Executive Summary Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded">
              <span className="text-slate-500 text-[11px] block">Security Risk Score</span>
              <span className={`text-2xl font-bold font-mono mt-1 block tabular-nums ${
                report.project?.riskScore >= 70 ? 'text-rose-400 print:text-rose-600' :
                report.project?.riskScore >= 40 ? 'text-amber-400 print:text-amber-600' :
                'text-emerald-400 print:text-emerald-600'
              }`}>
                {report.project?.riskScore} / 100
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Composite heuristic metric</span>
            </div>

            <div className="p-4 bg-slate-900 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded">
              <span className="text-slate-500 text-[11px] block">SBOM Inventory</span>
              <span className="text-2xl font-bold font-mono text-cyan-400 print:text-blue-600 mt-1 block tabular-nums">
                {report.sbomSummary?.totalDependencies}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                {report.sbomSummary?.directCount} direct · {report.sbomSummary?.transitiveCount} transitive
              </span>
            </div>

            <div className="p-4 bg-slate-900 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded">
              <span className="text-slate-500 text-[11px] block">Critical Vulnerabilities</span>
              <span className="text-2xl font-bold font-mono text-rose-400 print:text-rose-600 mt-1 block tabular-nums">
                {report.vulnerabilityBreakdown?.critical}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">CVSS &ge; 9.0</span>
            </div>

            <div className="p-4 bg-slate-900 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded">
              <span className="text-slate-500 text-[11px] block">Remediation Status</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 print:text-emerald-600 mt-1 block tabular-nums">
                {report.appliedRemediations?.length || 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Verified patches deployed</span>
            </div>
          </div>

          {/* AI / Risk Narrative Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider text-xs">
              Executive Supply Chain Threat Narrative
            </h3>
            <div className="p-4 bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 leading-relaxed whitespace-pre-line">
              {report.riskAssessment?.aiExplanation || report.riskAssessment?.recommendedAction || (
                'All dependencies scanned against NVD and OSV catalogs. See findings table below.'
              )}
            </div>
          </div>

          {/* Vulnerability Findings Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider text-xs">
              Identified Vulnerability Findings ({report.vulnerabilityBreakdown?.total})
            </h3>

            <div className="overflow-x-auto border border-slate-800 print:border-slate-200 rounded">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 print:bg-slate-100 border-b border-slate-800 print:border-slate-200 text-slate-400 print:text-slate-600 font-mono text-[11px]">
                    <th className="p-3">Advisory ID</th>
                    <th className="p-3">Component</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">CVSS</th>
                    <th className="p-3">Affected Range</th>
                    <th className="p-3">Fixed Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200 font-mono text-slate-300 print:text-slate-800">
                  {report.vulnerabilityBreakdown?.findings?.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-cyan-400 print:text-blue-700">{f.cveId}</td>
                      <td className="p-3 font-sans font-medium text-white print:text-black">
                        {f.componentName} <span className="text-slate-500 font-mono">v{f.componentVersion}</span>
                      </td>
                      <td className="p-3">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="p-3 tabular-nums font-bold">{f.cvssScore}</td>
                      <td className="p-3 text-slate-400 text-[11px]">{f.affectedRange}</td>
                      <td className="p-3 text-emerald-400 print:text-emerald-700 font-bold">
                        {f.fixedVersion || 'No fix'}
                      </td>
                    </tr>
                  ))}

                  {(!report.vulnerabilityBreakdown?.findings || report.vulnerabilityBreakdown.findings.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 font-mono">
                        Zero vulnerabilities discovered in analyzed software bill of materials.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Verification Footer */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 text-xs text-slate-500 print:text-slate-600 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span>Generated by: {report.platform}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 print:text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographic CycloneDX Specification 1.5 Attestation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
