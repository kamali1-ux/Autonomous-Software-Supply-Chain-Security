import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, UserCheck, Clock, MessageSquare, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { RemediationProposal, User } from '../types';

interface ApprovalCenterViewProps {
  currentUser: User;
  onNavigate: (view: string, projectId?: string) => void;
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({ currentUser, onNavigate }) => {
  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const res = await api.getProposals();
      setProposals(res.proposals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proposalId: string) => {
    try {
      setProcessingId(proposalId);
      const comments = reviewComments[proposalId] || `Approved by ${currentUser.name} (${currentUser.role}) after impact verification.`;
      await api.approveProposal(proposalId, {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        comments
      });
      await loadProposals();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      setProcessingId(proposalId);
      const comments = reviewComments[proposalId] || `Rejected by ${currentUser.name} (${currentUser.role}).`;
      await api.rejectProposal(proposalId, {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        comments
      });
      await loadProposals();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingProposals = proposals.filter(p => p.status === 'PENDING_APPROVAL');
  const pastProposals = proposals.filter(p => p.status !== 'PENDING_APPROVAL');

  const canApproveRole = (requiredRole: string): boolean => {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'SECURITY_ANALYST' && requiredRole !== 'ADMIN') return true;
    if (currentUser.role === 'DEVELOPER' && requiredRole === 'DEVELOPER') return true;
    return false;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Remediation Approval Center</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
              Role: {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforces segregation of duties and security governance before automated patches touch production dependency trees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Pending Queue: <span className="text-amber-400 font-bold">{pendingProposals.length}</span>
          </span>
        </div>
      </div>

      {/* Pending Reviews Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Pending Review Requests</h2>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-400">Loading pending reviews...</div>
        ) : pendingProposals.length === 0 ? (
          <div className="p-8 text-center bg-[#111827] border border-slate-800 rounded space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-white">All remediation queues are clear</div>
            <p className="text-xs text-slate-400">No proposals currently awaiting review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingProposals.map((proposal) => {
              const isEligible = canApproveRole(proposal.requiredApprovalRole);
              const isProcessing = processingId === proposal.id;

              return (
                <div
                  key={proposal.id}
                  className="p-6 bg-[#111827] border border-amber-800/40 rounded space-y-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-amber-400 font-bold">NEEDS APPROVAL</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{proposal.projectName}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-cyan-400">Required Role: {proposal.requiredApprovalRole}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        Upgrade {proposal.componentName} from{' '}
                        <span className="text-rose-400 font-mono">v{proposal.currentVersion}</span> to{' '}
                        <span className="text-emerald-400 font-mono">v{proposal.targetVersion}</span>
                      </h3>
                    </div>

                    <div className="text-right text-xs font-mono">
                      <span className="text-slate-500 block">Risk Reduction</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {proposal.riskBefore} → {proposal.riskAfter} (-{proposal.riskBefore - proposal.riskAfter} pts)
                      </span>
                    </div>
                  </div>

                  {/* Impact Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-900 border border-slate-800 rounded text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Vulnerabilities Addressed</span>
                      <span className="text-rose-400 font-bold mt-0.5 block">{proposal.vulnerabilitiesAddressed.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Breaking Change Risk</span>
                      <span className="text-slate-200 font-bold mt-0.5 block">{proposal.breakingChangeRisk} RISK</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Requested At</span>
                      <span className="text-slate-300 mt-0.5 block">{new Date(proposal.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Review Comments Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Reviewer Decision Comments
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified compatibility with staging integration suite; approved for patch deployment."
                      value={reviewComments[proposal.id] || ''}
                      onChange={(e) => setReviewComments({ ...reviewComments, [proposal.id]: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] font-mono text-slate-500">
                      {!isEligible ? (
                        <span className="text-amber-400">
                          ⚠️ Insufficient role privileges: requires {proposal.requiredApprovalRole} (Current: {currentUser.role}). Use role switcher in top bar to test.
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          ✓ Authorized to sign off on this proposal as {currentUser.role}.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end">
                      <button
                        onClick={() => handleReject(proposal.id)}
                        disabled={isProcessing || !isEligible}
                        className="px-4 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800 rounded transition disabled:opacity-40"
                      >
                        Reject Proposal
                      </button>

                      <button
                        onClick={() => handleApprove(proposal.id)}
                        disabled={isProcessing || !isEligible}
                        className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Authorize Remediation</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Approvals */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200">Historical Approval Audit Trail</h2>

        <div className="p-5 bg-[#111827] border border-slate-800 rounded">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono text-[11px]">
                  <th className="pb-2.5">Proposal ID</th>
                  <th className="pb-2.5">Component Upgrade</th>
                  <th className="pb-2.5">Outcome</th>
                  <th className="pb-2.5">Reviewer</th>
                  <th className="pb-2.5">Comments</th>
                  <th className="pb-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {pastProposals.map((prop) => {
                  const lastAudit = prop.approvalHistory[prop.approvalHistory.length - 1];
                  return (
                    <tr key={prop.id} className="hover:bg-slate-800/30">
                      <td className="py-3 text-slate-500">{prop.id}</td>
                      <td className="py-3 font-sans font-medium text-slate-200">
                        {prop.componentName} <span className="text-slate-500 font-mono">v{prop.targetVersion}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          prop.status === 'VERIFIED' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40' :
                          prop.status === 'APPROVED' ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/40' :
                          prop.status === 'REJECTED' ? 'text-rose-400 bg-rose-950/60 border border-rose-800/40' :
                          'text-slate-400 bg-slate-800'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 font-sans">{lastAudit?.userName || 'System'}</td>
                      <td className="py-3 text-slate-400 font-sans max-w-[200px] truncate" title={lastAudit?.comments}>
                        {lastAudit?.comments || '-'}
                      </td>
                      <td className="py-3 text-right text-slate-500">
                        {new Date(prop.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}

                {pastProposals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                      No historical proposals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
