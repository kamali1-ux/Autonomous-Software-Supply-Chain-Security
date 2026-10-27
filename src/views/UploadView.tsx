import React, { useState } from 'react';
import { Upload, FileCode2, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Project } from '../types';
import { SHOPEASE_POM_XML, NODEPAY_PACKAGE_JSON, PYDATA_REQUIREMENTS_TXT } from '../sampleProjects';

interface UploadViewProps {
  onNavigate: (view: string, projectId?: string) => void;
  onSelectProject: (p: Project) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onNavigate, onSelectProject }) => {
  const [mode, setMode] = useState<'FILE' | 'PASTE'>('FILE');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [ecosystem, setEcosystem] = useState<'MAVEN' | 'NPM' | 'PYPI'>('MAVEN');
  const [manifestContent, setManifestContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ project: Project; scanJob: any } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!projectName) {
        setProjectName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handlePresetSelect = (presetType: 'MAVEN' | 'NPM' | 'PYPI') => {
    setMode('PASTE');
    setEcosystem(presetType);
    if (presetType === 'MAVEN') {
      setProjectName('ShopEase E-Commerce Platform');
      setDescription('Retail shopping cart and order processing backend');
      setManifestContent(SHOPEASE_POM_XML);
    } else if (presetType === 'NPM') {
      setProjectName('NodePay Webhook Service');
      setDescription('Payment gateway settlement microservice');
      setManifestContent(NODEPAY_PACKAGE_JSON);
    } else {
      setProjectName('PyData Feature Pipeline');
      setDescription('ML feature store and preprocessing service');
      setManifestContent(PYDATA_REQUIREMENTS_TXT);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    try {
      if (mode === 'FILE') {
        if (!file) throw new Error('Please select a ZIP archive or manifest file to upload.');
        const formData = new FormData();
        formData.append('file', file);
        if (projectName) formData.append('projectName', projectName);
        const res = await api.uploadSingle(formData);
        setSuccessResult(res);
        onSelectProject(res.project);
      } else {
        if (!projectName || !manifestContent) {
          throw new Error('Project name and manifest content are required.');
        }
        const res = await api.createProject({
          name: projectName,
          description: description || 'Uploaded manifest file',
          ecosystem,
          manifestContent,
          manifestFilename: ecosystem === 'MAVEN' ? 'pom.xml' : ecosystem === 'NPM' ? 'package.json' : 'requirements.txt'
        });
        setSuccessResult(res);
        onSelectProject(res.project);
      }
    } catch (err: any) {
      setError(err.message || 'Project upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-white">Project Ingestion & Discovery</h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload a ZIP source archive or dependency manifest (pom.xml, package.json, requirements.txt) for automated SBOM generation and scanning.
        </p>
      </div>

      {successResult ? (
        <div className="p-6 bg-[#111827] border border-emerald-500/30 rounded space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Project Successfully Ingested</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                '{successResult.project.name}' has been cataloged. SBOM generation and vulnerability scan job queued.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-300 space-y-1">
            <div>Project ID: <span className="text-cyan-400">{successResult.project.id}</span></div>
            <div>Ecosystem: <span className="text-slate-100">{successResult.project.ecosystem}</span></div>
            <div>Job Status: <span className="text-amber-400 font-semibold">{successResult.scanJob?.status || 'QUEUED'}</span></div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('sbom-explorer', successResult.project.id)}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5"
            >
              <span>Explore CycloneDX SBOM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setSuccessResult(null);
                setFile(null);
                setManifestContent('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Benchmark Presets */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Quick Benchmark Manifest Templates (College Demo Ready)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">1-Click Ingest</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handlePresetSelect('MAVEN')}
                className="p-2.5 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded transition group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-cyan-400">ShopEase (Maven)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">pom.xml with Log4Shell & Spring4Shell</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('NPM')}
                className="p-2.5 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded transition group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-cyan-400">NodePay (npm)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">package.json with Lodash Prototype Pollution</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('PYPI')}
                className="p-2.5 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded transition group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-cyan-400">PyData (PyPI)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">requirements.txt with PyYAML & Urllib3 CVEs</div>
              </button>
            </div>
          </div>

          {/* Upload Method Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800">
            <button
              onClick={() => setMode('FILE')}
              className={`pb-2.5 text-xs font-medium border-b-2 transition ${
                mode === 'FILE'
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload Archive or Manifest File (.zip, pom.xml, package.json, requirements.txt)
            </button>
            <button
              onClick={() => setMode('PASTE')}
              className={`pb-2.5 text-xs font-medium border-b-2 transition ${
                mode === 'PASTE'
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Manifest Editor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 bg-[#111827] border border-slate-800 rounded space-y-5">
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. ShopEase E-Commerce"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ecosystem</label>
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

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Project Description (Optional)</label>
              <input
                type="text"
                placeholder="Brief summary of repository or microservice purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {mode === 'FILE' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Upload Project File</label>
                <div className="p-8 border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded bg-slate-900/40 text-center transition">
                  <input
                    type="file"
                    id="fileInput"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".zip,.xml,.json,.txt"
                  />
                  <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-cyan-400" />
                    <span className="text-xs font-medium text-slate-200">
                      {file ? file.name : 'Choose a ZIP archive or manifest file to inspect'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ZIP, pom.xml, package.json, or requirements.txt (Max 25MB)
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dependency Manifest Content ({ecosystem === 'MAVEN' ? 'pom.xml' : ecosystem === 'NPM' ? 'package.json' : 'requirements.txt'})
                </label>
                <textarea
                  rows={10}
                  value={manifestContent}
                  onChange={(e) => setManifestContent(e.target.value)}
                  placeholder="Paste contents of pom.xml, package.json, or requirements.txt here..."
                  className="w-full p-3 font-mono text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Ingesting & Queuing Scan...</span>
                  </>
                ) : (
                  <span>Submit & Scan Project</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
