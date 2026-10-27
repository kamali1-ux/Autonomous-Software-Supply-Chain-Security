import React, { useState } from 'react';
import { GitBranch, ExternalLink, CheckCircle2, ShieldCheck, ArrowRight, Github } from 'lucide-react';
import { api } from '../services/api';
import { Project } from '../types';

interface GitHubViewProps {
  onNavigate: (view: string, projectId?: string) => void;
  onSelectProject: (p: Project) => void;
}

export const GitHubView: React.FC<GitHubViewProps> = ({ onNavigate, onSelectProject }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [ecosystem, setEcosystem] = useState<'MAVEN' | 'NPM' | 'PYPI'>('MAVEN');
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ project: Project; scanJob: any } | null>(null);

  const handlePreset = (url: string, eco: 'MAVEN' | 'NPM' | 'PYPI', br: string = 'main') => {
    setRepoUrl(url);
    setEcosystem(eco);
    setBranch(br);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIngesting(true);

    try {
      if (!repoUrl) throw new Error('Please enter a GitHub repository URL.');
      const res = await api.connectGitHub({ repoUrl, branch, ecosystem });
      setResult(res);
      onSelectProject(res.project);
    } catch (err: any) {
      setError(err.message || 'GitHub ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-white">GitHub Repository Pipeline</h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect public GitHub repositories for automated branch cloning, dependency manifest extraction, and SBOM generation.
        </p>
      </div>

      {result ? (
        <div className="p-6 bg-[#111827] border border-emerald-500/30 rounded space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Repository Ingested & Scheduled</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cloned workspace from {result.project.sourceUrl} ({result.project.branch}). CycloneDX scanner active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('sbom-explorer', result.project.id)}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5"
            >
              <span>Inspect SBOM & Vulnerabilities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setResult(null);
                setRepoUrl('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition"
            >
              Connect Another Repository
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded space-y-3">
            <div className="text-xs font-semibold text-slate-300">Popular Open-Source Test Targets</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handlePreset('https://github.com/shopease/order-service', 'MAVEN', 'master')}
                className="p-2.5 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded transition group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-cyan-400">ShopEase Order Microservice</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Maven · master branch</div>
              </button>
              <button
                type="button"
                onClick={() => handlePreset('https://github.com/nodepay/gateway-core', 'NPM', 'main')}
                className="p-2.5 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded transition group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-cyan-400">NodePay Core Gateway</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">npm · main branch</div>
              </button>
              <button
                type="button"
                onClick={() => handlePreset('https://github.com/pydata/feature-analytics', 'PYPI', 'main')}
                className="p-2.5 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded transition group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-cyan-400">PyData ML Ingestion</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">PyPI · main branch</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleIngest} className="p-6 bg-[#111827] border border-slate-800 rounded space-y-5">
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">GitHub Repository URL</label>
              <div className="relative">
                <Github className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="url"
                  placeholder="https://github.com/org/repo-name"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Public repositories require zero credentials. Private repos require an authorized GitHub App or PAT in production.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Branch or Tag</label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expected Dependency Ecosystem</label>
                <select
                  value={ecosystem}
                  onChange={(e) => setEcosystem(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="MAVEN">Java Maven (pom.xml)</option>
                  <option value="NPM">Node.js (package.json)</option>
                  <option value="PYPI">Python (requirements.txt)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={ingesting}
                className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {ingesting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Cloning & Analyzing Manifests...</span>
                  </>
                ) : (
                  <span>Clone & Scan Repository</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
