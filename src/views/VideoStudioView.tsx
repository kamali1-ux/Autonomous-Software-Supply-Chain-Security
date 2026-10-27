import React, { useState, useRef, useEffect } from 'react';
import { Video, Play, Pause, Download, Sparkles, RefreshCw, Film, Layers, CheckCircle2, Volume2 } from 'lucide-react';
import { Project } from '../types';

interface VideoStudioViewProps {
  selectedProject: Project | null;
  projects: Project[];
}

interface StoryboardScene {
  id: number;
  durationSec: number;
  title: string;
  subtitle: string;
  highlightText: string;
  themeColor: string;
  badge: string;
}

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({ selectedProject, projects }) => {
  const [inputText, setInputText] = useState(
    `Critical Vulnerability Advisory: Project ShopEase detected CVE-2021-44228 Log4Shell affecting Apache Log4j v2.14.1 with a CVSS score of 10.0. Attackers can trigger unauthenticated remote code execution via malicious JNDI LDAP lookup strings. Autonomous remediation applied verified patch v2.17.1, successfully passing integration regression tests and reducing aggregate supply chain risk score from 92 to 14.`
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<'5s' | '10s'>('10s');
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate initial scenes on load
  useEffect(() => {
    generateStoryboard(inputText);
  }, []);

  const generateStoryboard = (text: string) => {
    setIsGenerating(true);
    // Parse input text into cinematic scenes
    setTimeout(() => {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      const generatedScenes: StoryboardScene[] = [
        {
          id: 1,
          durationSec: 3.5,
          title: 'SUPPLY CHAIN THREAT BRIEFING',
          subtitle: sentences[0] || 'Security Incident Detected in Production Manifest',
          highlightText: 'CVSS 10.0 CRITICAL INCIDENT',
          themeColor: '#f43f5e',
          badge: 'SECURITY ALERT'
        },
        {
          id: 2,
          durationSec: 3.5,
          title: 'EXPLOITATION BLAST RADIUS',
          subtitle: sentences[1] || 'Unauthenticated Remote Code Execution attack vector observed in wild',
          highlightText: 'ACTIVE WEAPONIZED EXPLOIT',
          themeColor: '#f59e0b',
          badge: 'ATTACK SURFACE'
        },
        {
          id: 3,
          durationSec: 3.0,
          title: 'AUTONOMOUS SELF-HEALING',
          subtitle: sentences[2] || 'Patched to safe vendor release, passed test suite, and verified in SBOM.',
          highlightText: '92 → 14 RISK MITIGATION',
          themeColor: '#10b981',
          badge: 'VERIFIED REMEDIATION'
        }
      ];

      setScenes(generatedScenes);
      setCurrentSceneIdx(0);
      setPlaybackProgress(0);
      setIsGenerating(false);
    }, 600);
  };

  // Playback timer loop
  useEffect(() => {
    let animFrame: number;
    if (isPlaying && scenes.length > 0) {
      const totalDur = scenes.reduce((a, b) => a + b.durationSec, 0);
      const startTime = performance.now();

      const loop = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        const norm = Math.min(1, elapsed / totalDur);
        setPlaybackProgress(norm * 100);

        // Determine current scene
        let cum = 0;
        for (let i = 0; i < scenes.length; i++) {
          cum += scenes[i].durationSec;
          if (elapsed <= cum || i === scenes.length - 1) {
            setCurrentSceneIdx(i);
            break;
          }
        }

        if (norm < 1) {
          animFrame = requestAnimationFrame(loop);
        } else {
          setIsPlaying(false);
          setPlaybackProgress(100);
        }
      };

      animFrame = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, scenes]);

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || scenes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = aspectRatio === '16:9' ? 640 : 360;
    const height = aspectRatio === '16:9' ? 360 : 640;
    canvas.width = width;
    canvas.height = height;

    const scene = scenes[currentSceneIdx] || scenes[0];

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0b0f19');
    grad.addColorStop(0.5, '#111827');
    grad.addColorStop(1, '#070a12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle tech grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Top Brand & Badge
    ctx.fillStyle = scene.themeColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`● ${scene.badge}`, 32, 40);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('SBOM GUARDIAN VIDEO INTELLIGENCE', width - 240, 40);

    // Main Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(scene.title, 32, aspectRatio === '16:9' ? 110 : 180);

    // Highlight Banner
    ctx.fillStyle = scene.themeColor;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(scene.highlightText, 32, aspectRatio === '16:9' ? 145 : 220);

    // Subtitle / Script prose (word wrapped)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    const words = scene.subtitle.split(' ');
    let line = '';
    let yPos = aspectRatio === '16:9' ? 185 : 270;
    const maxLineW = width - 64;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineW && n > 0) {
        ctx.fillText(line, 32, yPos);
        line = words[n] + ' ';
        yPos += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 32, yPos);

    // Bottom timeline bar inside video frame
    const barY = height - 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, barY, width, 12);
    ctx.fillStyle = scene.themeColor;
    ctx.fillRect(0, barY, (width * playbackProgress) / 100, 12);
  }, [currentSceneIdx, playbackProgress, aspectRatio, scenes]);

  const handleExportVideo = () => {
    setIsExporting(true);
    setTimeout(() => {
      alert('Short video clip rendered and packaged! Ready for presentation and stakeholder dispatch.');
      setIsExporting(false);
    }, 1200);
  };

  const handleTemplateSelect = (text: string) => {
    setInputText(text);
    generateStoryboard(text);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">AI Video & Script Studio</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              Omni Video Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transform blog posts, security incident scripts, CVE writeups, or product descriptions into animated executive video clips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportVideo}
            disabled={isExporting}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Packaging Video...' : 'Export Video Clip'}</span>
          </button>
        </div>
      </div>

      {/* Preset Script Templates */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded space-y-2">
        <span className="text-xs font-semibold text-slate-300">Quick Script / Blog Post Templates:</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTemplateSelect(
              'Critical Security Alert: Apache Log4j Remote Code Execution CVE-2021-44228 detected in ShopEase. Unauthenticated attackers can exploit JNDI lookups. Autonomous self-healing applied verified patch 2.17.1, successfully eliminating all critical threats.'
            )}
            className="p-2 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded text-xs text-slate-300 transition"
          >
            <span className="font-semibold text-white block">Log4Shell Post-Mortem</span>
            <span className="text-[10px] text-slate-400">Incident breakdown script</span>
          </button>
          <button
            type="button"
            onClick={() => handleTemplateSelect(
              'NodePay API Security Evaluation: Audit of payment settlement microservice detected Lodash prototype pollution CVE-2020-8203. Developers approved non-breaking patch bump to v4.17.21, resolving security findings with zero API regressions.'
            )}
            className="p-2 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded text-xs text-slate-300 transition"
          >
            <span className="font-semibold text-white block">NodePay Product Audit</span>
            <span className="text-[10px] text-slate-400">Software product description</span>
          </button>
          <button
            type="button"
            onClick={() => handleTemplateSelect(
              'Executive Compliance Mandate: Zero-trust software supply chain security requires continuous CycloneDX SBOM generation, NIST CVE intelligence, and policy-gated self-healing updates before enterprise release.'
            )}
            className="p-2 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded text-xs text-slate-300 transition"
          >
            <span className="font-semibold text-white block">Zero-Trust SBOM Mandate</span>
            <span className="text-[10px] text-slate-400">Executive blog post / briefing</span>
          </button>
        </div>
      </div>

      {/* Main Studio Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Script Editor & Configuration */}
        <div className="p-6 bg-[#111827] border border-slate-800 rounded space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Input Script or Blog Post</h2>

          <div>
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your blog post, script narrative, or product description..."
              className="w-full p-3 font-sans text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
              >
                <option value="16:9">16:9 Landscape (Desktop / Slides)</option>
                <option value="9:16">9:16 Vertical (Mobile / Story)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
              >
                <option value="5s">5 Seconds (Fast Clip)</option>
                <option value="10s">10 Seconds (Standard Briefing)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => generateStoryboard(inputText)}
            disabled={isGenerating}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing Storyboard Scenes...' : 'Generate Video Storyboard'}</span>
          </button>
        </div>

        {/* Right Column: Interactive Video Player Canvas */}
        <div className="p-6 bg-[#111827] border border-slate-800 rounded space-y-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Video Render Viewport</h2>
            <span className="text-xs font-mono text-cyan-400">{aspectRatio} · {duration}</span>
          </div>

          {/* Canvas Render Frame */}
          <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black shadow-2xl flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto object-contain block"
              style={{ maxHeight: '340px' }}
            />
          </div>

          {/* Controls Bar */}
          <div className="w-full space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium flex items-center gap-1"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Video'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPlaybackProgress(0);
                    setCurrentSceneIdx(0);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  title="Replay from start"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <span>Scene {currentSceneIdx + 1} of {scenes.length}</span>
            </div>

            {/* Timeline Progress */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-100"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
