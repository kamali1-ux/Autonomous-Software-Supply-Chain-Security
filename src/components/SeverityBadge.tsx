import React from 'react';

interface SeverityBadgeProps {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | string;
  score?: number;
  showScore?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, score, showScore = false }) => {
  const sev = severity.toUpperCase();

  let colorClass = 'text-slate-400 border-slate-700 bg-slate-800/40';
  let indicator = 'bg-slate-400';

  if (sev === 'CRITICAL') {
    colorClass = 'text-rose-400 border-rose-500/30 bg-rose-950/20';
    indicator = 'bg-rose-500';
  } else if (sev === 'HIGH') {
    colorClass = 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    indicator = 'bg-amber-500';
  } else if (sev === 'MEDIUM') {
    colorClass = 'text-yellow-300 border-yellow-500/30 bg-yellow-950/20';
    indicator = 'bg-yellow-400';
  } else if (sev === 'LOW' || sev === 'CLEAN' || sev === 'VERIFIED') {
    colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    indicator = 'bg-emerald-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium rounded border ${colorClass} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${indicator}`} aria-hidden="true" />
      <span>{sev}</span>
      {showScore && score !== undefined && (
        <span className="text-slate-400 ml-0.5">({score.toFixed(1)})</span>
      )}
    </span>
  );
};
