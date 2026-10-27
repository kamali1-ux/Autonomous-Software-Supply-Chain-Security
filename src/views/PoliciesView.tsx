import React, { useEffect, useState } from 'react';
import { Sliders, ShieldCheck, Plus, Trash2, CheckCircle2, AlertTriangle, Info, Save } from 'lucide-react';
import { api } from '../services/api';

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  autoRemediateThreshold: 'NEVER' | 'LOW' | 'MEDIUM' | 'HIGH';
  cvssAlertThreshold: number;
  maxRiskScoreAllowed: number;
  ignoredComponents: { name: string; version?: string; reason: string }[];
  blockedLicenses: string[];
  requireApprovalForDirectDeps: boolean;
  updatedAt: string;
}

export const PoliciesView: React.FC = () => {
  const [policy, setPolicy] = useState<SecurityPolicy>({
    id: 'pol-default',
    name: 'Enterprise Supply Chain Baseline Policy',
    description: 'Enforces CVSS thresholds, automated patch gating, and open-source license compliance.',
    enabled: true,
    autoRemediateThreshold: 'LOW',
    cvssAlertThreshold: 7.0,
    maxRiskScoreAllowed: 50,
    ignoredComponents: [
      { name: 'commons-logging', reason: 'Legacy bridge encapsulated in internal test harness' }
    ],
    blockedLicenses: ['GPL-3.0-only', 'AGPL-3.0', 'GPL-2.0-only'],
    requireApprovalForDirectDeps: true,
    updatedAt: new Date().toISOString()
  });

  const [newIgnoreName, setNewIgnoreName] = useState('');
  const [newIgnoreReason, setNewIgnoreReason] = useState('');
  const [newBlockedLicense, setNewBlockedLicense] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Load from localStorage or API
    const stored = localStorage.getItem('sbom_guardian_policy');
    if (stored) {
      try {
        setPolicy(JSON.parse(stored));
      } catch (e) {
        // use default
      }
    }
  }, []);

  const handleSavePolicy = () => {
    const updated = { ...policy, updatedAt: new Date().toISOString() };
    setPolicy(updated);
    localStorage.setItem('sbom_guardian_policy', JSON.stringify(updated));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddIgnore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIgnoreName.trim()) return;
    setPolicy({
      ...policy,
      ignoredComponents: [
        ...policy.ignoredComponents,
        { name: newIgnoreName.trim(), reason: newIgnoreReason.trim() || 'Accepted risk documented by security team' }
      ]
    });
    setNewIgnoreName('');
    setNewIgnoreReason('');
  };

  const handleRemoveIgnore = (index: number) => {
    setPolicy({
      ...policy,
      ignoredComponents: policy.ignoredComponents.filter((_, i) => i !== index)
    });
  };

  const handleAddLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedLicense.trim()) return;
    if (policy.blockedLicenses.includes(newBlockedLicense.trim())) return;
    setPolicy({
      ...policy,
      blockedLicenses: [...policy.blockedLicenses, newBlockedLicense.trim()]
    });
    setNewBlockedLicense('');
  };

  const handleRemoveLicense = (license: string) => {
    setPolicy({
      ...policy,
      blockedLicenses: policy.blockedLicenses.filter(l => l !== license)
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Configurable Security Policies</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              Active Enforcement
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Define automated remediation thresholds, component whitelists, CVSS alert sensitivity, and license compliance rules.
          </p>
        </div>

        <button
          onClick={handleSavePolicy}
          className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5 shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Policy Configuration</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Security policy configuration persisted and applied to all future scan evaluations.</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="p-6 bg-[#111827] border border-slate-800 rounded space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Policy Core Controls</h2>
            <p className="text-xs text-slate-500">Configure automated behavior and severity cutoffs</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Policy Guardrail Enabled</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Automated Remediation Threshold */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Automatic Self-Healing Threshold
            </label>
            <select
              value={policy.autoRemediateThreshold}
              onChange={(e) => setPolicy({ ...policy, autoRemediateThreshold: e.target.value as any })}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="NEVER">NEVER (Manual approval mandatory for all patches)</option>
              <option value="LOW">LOW (Auto-remediate only patch versions with CVSS &lt; 4.0)</option>
              <option value="MEDIUM">MEDIUM (Auto-remediate up to minor versions with CVSS &lt; 7.0)</option>
              <option value="HIGH">HIGH (Aggressive auto-remediate all non-breaking updates)</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Proposals above this threshold require Developer or Security Analyst approval.
            </span>
          </div>

          {/* CVSS Alert Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                CVSS Severity Alert Threshold: <span className="font-mono text-cyan-400 font-bold">{policy.cvssAlertThreshold.toFixed(1)}</span>
              </label>
            </div>
            <input
              type="range"
              min="1.0"
              max="9.0"
              step="0.5"
              value={policy.cvssAlertThreshold}
              onChange={(e) => setPolicy({ ...policy, cvssAlertThreshold: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 mt-1 block font-mono">
              Findings at or above CVSS {policy.cvssAlertThreshold.toFixed(1)} trigger instant alert notifications and fail CI gates.
            </span>
          </div>

          {/* Max Project Risk Allowed */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Maximum Tolerated Project Risk Score: <span className="font-mono text-amber-400 font-bold">{policy.maxRiskScoreAllowed} / 100</span>
              </label>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={policy.maxRiskScoreAllowed}
              onChange={(e) => setPolicy({ ...policy, maxRiskScoreAllowed: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 mt-1 block font-mono">
              Projects exceeding {policy.maxRiskScoreAllowed} points are automatically flagged for emergency sprint remediation.
            </span>
          </div>

          {/* Direct Dependency Signoff */}
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={policy.requireApprovalForDirectDeps}
                onChange={(e) => setPolicy({ ...policy, requireApprovalForDirectDeps: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div>
                <span className="font-medium text-white block">Strict Direct Dependency Signoff</span>
                <span className="text-[11px] text-slate-500 block">
                  Always require developer review for first-party direct dependencies regardless of CVSS score.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Ignored Components / Whitelist */}
      <div className="p-6 bg-[#111827] border border-slate-800 rounded space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Whitelisted & Ignored Components</h2>
          <p className="text-xs text-slate-500">
            Exclude accepted risks or verified internal packages from triggering alerts
          </p>
        </div>

        {/* Add ignore rule */}
        <form onSubmit={handleAddIgnore} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              placeholder="Package name (e.g. commons-logging)"
              value={newIgnoreName}
              onChange={(e) => setNewIgnoreName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Exemption Justification / Ticket ID"
              value={newIgnoreReason}
              onChange={(e) => setNewIgnoreReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full py-2 px-3 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ignore Rule</span>
            </button>
          </div>
        </form>

        {/* Existing Ignored List */}
        <div className="space-y-2">
          {policy.ignoredComponents.map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-900/60 border border-slate-800 rounded flex items-center justify-between text-xs font-mono"
            >
              <div>
                <span className="font-bold text-white">{item.name}</span>
                <span className="text-slate-400 font-sans ml-2 text-[11px]">— {item.reason}</span>
              </div>
              <button
                onClick={() => handleRemoveIgnore(idx)}
                className="text-slate-500 hover:text-rose-400 p-1"
                title="Remove ignore rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {policy.ignoredComponents.length === 0 && (
            <div className="py-6 text-center text-xs font-mono text-slate-500">
              No component exemptions configured. All packages subject to standard scan rules.
            </div>
          )}
        </div>
      </div>

      {/* Blocked Open Source Licenses */}
      <div className="p-6 bg-[#111827] border border-slate-800 rounded space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Restricted / Blocked Software Licenses</h2>
          <p className="text-xs text-slate-500">
            Components with these licenses will trigger compliance alerts in SBOM Explorer and audit reports
          </p>
        </div>

        <form onSubmit={handleAddLicense} className="flex gap-2">
          <input
            type="text"
            placeholder="SPDX License ID (e.g. AGPL-3.0, GPL-3.0-only, Unknown)"
            value={newBlockedLicense}
            onChange={(e) => setNewBlockedLicense(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition"
          >
            Add License
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {policy.blockedLicenses.map((lic) => (
            <span
              key={lic}
              className="px-2.5 py-1 text-xs font-mono rounded bg-rose-950/40 text-rose-300 border border-rose-800/40 flex items-center gap-1.5"
            >
              <span>{lic}</span>
              <button
                onClick={() => handleRemoveLicense(lic)}
                className="hover:text-white"
                title="Remove license restriction"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
