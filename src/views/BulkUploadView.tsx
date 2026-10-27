import React, { useEffect, useState } from 'react';
import { Layers, Upload, RefreshCw, CheckCircle2, Clock, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { ScanJob } from '../types';
import { SHOPEASE_POM_XML, NODEPAY_PACKAGE_JSON, PYDATA_REQUIREMENTS_TXT } from '../sampleProjects';

interface BulkUploadViewProps {
  onNavigate: (view: string, projectId?: string) => void;
}

export const BulkUploadView: React.FC<BulkUploadViewProps> = ({ onNavigate }) => {
  const [queueData, setQueueData] = useState<{ stats: any; jobs: ScanJob[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 2500); // Poll status every 2.5s for live queue tracking
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const data = await api.getQueueStats();
      setQueueData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await api.retryScan(jobId);
      await loadQueue();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleSimulateBatch = async () => {
    try {
      setSubmittingBatch(true);
      // Simulate bulk ingestion of 5 distinct microservices into the bounded worker queue
      const sampleBatch = [
        { name: 'ShopEase Cart Service', content: SHOPEASE_POM_XML, eco: 'MAVEN', file: 'pom.xml' },
        { name: 'NodePay Auth Broker', content: NODEPAY_PACKAGE_JSON, eco: 'NPM', file: 'package.json' },
        { name: 'PyData Model Ingestion', content: PYDATA_REQUIREMENTS_TXT, eco: 'PYPI', file: 'requirements.txt' },
        { name: 'ShopEase Inventory Microservice', content: SHOPEASE_POM_XML, eco: 'MAVEN', file: 'pom.xml' },
        { name: 'NodePay Webhook Listener', content: NODEPAY_PACKAGE_JSON, eco: 'NPM', file: 'package.json' }
      ];

      for (const item of sampleBatch) {
        await api.createProject({
          name: item.name,
          description: 'Batch enterprise microservice repository',
          ecosystem: item.eco,
          manifestContent: item.content,
          manifestFilename: item.file
        });
      }
      await loadQueue();
    } catch (err: any) {
      alert(`Batch simulation error: ${err.message}`);
    } finally {
      setSubmittingBatch(false);
    }
  };

  const stats = queueData?.stats || { total: 0, queued: 0, running: 0, completed: 0, failed: 0, maxConcurrency: 2 };
  const jobs = queueData?.jobs || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Bulk Ingestion & Job Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Bounded asynchronous worker queue (max concurrency: <span className="text-cyan-400 font-mono">{stats.maxConcurrency} processes</span>) protecting system resources against unbounded spikes.
          </p>
        </div>

        <button
          onClick={handleSimulateBatch}
          disabled={submittingBatch}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{submittingBatch ? 'Dispatching Batch...' : 'Simulate 5 Microservice Batch'}</span>
        </button>
      </div>

      {/* Queue Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] text-slate-400">Total Ingested Jobs</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{stats.total}</div>
        </div>
        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] text-cyan-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Active Running</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">{stats.running}</div>
        </div>
        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] text-amber-400">Queued in Buffer</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">{stats.queued}</div>
        </div>
        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] text-emerald-400">Completed Scans</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{stats.completed}</div>
        </div>
        <div className="p-4 bg-[#111827] border border-slate-800 rounded">
          <div className="text-[11px] text-rose-400">Failed / Retriable</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">{stats.failed}</div>
        </div>
      </div>

      {/* Queue Job Table */}
      <div className="p-5 bg-[#111827] border border-slate-800 rounded space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Worker Pool Queue Dispatcher</h2>
          <span className="text-xs font-mono text-slate-500">Auto-refreshing every 2.5s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[11px]">
                <th className="pb-2.5">Job ID</th>
                <th className="pb-2.5">Project Name</th>
                <th className="pb-2.5">Scanner Engine</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Progress</th>
                <th className="pb-2.5 text-right">Result</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/30">
                  <td className="py-3 text-slate-500">{job.id}</td>
                  <td className="py-3 font-sans font-medium text-slate-200">{job.projectName}</td>
                  <td className="py-3 text-slate-400 text-[11px]">{job.scanner} v{job.scannerVersion}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      job.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' :
                      job.status === 'RUNNING' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 animate-pulse' :
                      job.status === 'FAILED' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40' :
                      'bg-slate-800 text-amber-300'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 w-32">
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          job.status === 'COMPLETED' ? 'bg-emerald-500' :
                          job.status === 'FAILED' ? 'bg-rose-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 text-right text-slate-300 tabular-nums">
                    {job.stats ? (
                      <span className="text-slate-200">
                        {job.stats.criticalCount}C / {job.stats.highCount}H / {job.stats.mediumCount}M
                      </span>
                    ) : job.errorMessage ? (
                      <span className="text-rose-400 text-[11px] truncate max-w-[150px] inline-block" title={job.errorMessage}>
                        {job.errorMessage}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {job.status === 'FAILED' ? (
                      <button
                        onClick={() => handleRetry(job.id)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900 border border-rose-800 rounded"
                      >
                        Retry
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate('sbom-explorer', job.projectId)}
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] underline"
                      >
                        View SBOM
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No active or queued jobs in worker pool.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
