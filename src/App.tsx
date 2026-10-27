/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { ProjectsView } from './views/ProjectsView';
import { UploadView } from './views/UploadView';
import { BulkUploadView } from './views/BulkUploadView';
import { GitHubView } from './views/GitHubView';
import { SbomView } from './views/SbomView';
import { DependencyGraphView } from './views/DependencyGraphView';
import { VulnerabilitiesView } from './views/VulnerabilitiesView';
import { RiskIntelligenceView } from './views/RiskIntelligenceView';
import { FixSimulatorView } from './views/FixSimulatorView';
import { SelfHealingView } from './views/SelfHealingView';
import { ApprovalCenterView } from './views/ApprovalCenterView';
import { PoliciesView } from './views/PoliciesView';
import { VideoStudioView } from './views/VideoStudioView';
import { ReportsView } from './views/ReportsView';
import { AuditLogsView } from './views/AuditLogsView';
import { AuthModal } from './views/AuthModal';
import { api } from './services/api';
import { Project, User, RemediationProposal, Vulnerability } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-admin-1',
    name: 'Sarah Connor',
    email: 'admin@sbomguardian.internal',
    role: 'ADMIN',
    createdAt: '2026-01-10T08:00:00Z'
  });
  const [isResetting, setIsResetting] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [criticalVulnsCount, setCriticalVulnsCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInitialData = async () => {
    try {
      const [projRes, propRes, vulnRes] = await Promise.all([
        api.getProjects(),
        api.getProposals(),
        api.getAllVulnerabilities()
      ]);

      setProjects(projRes.projects);
      if (projRes.projects.length > 0 && !selectedProject) {
        // Pick ShopEase if available
        const shopEase = projRes.projects.find(p => p.id === 'proj-shopease-01') || projRes.projects[0];
        setSelectedProject(shopEase);
      }

      setPendingApprovalsCount(propRes.proposals.filter(p => p.status === 'PENDING_APPROVAL').length);
      setCriticalVulnsCount(vulnRes.vulnerabilities.filter(v => v.severity === 'CRITICAL').length);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleRoleSwitch = (newRole: 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER') => {
    let newName = 'Sarah Connor';
    let newEmail = 'admin@sbomguardian.internal';

    if (newRole === 'SECURITY_ANALYST') {
      newName = 'Alex Rivera';
      newEmail = 'security@sbomguardian.internal';
    } else if (newRole === 'DEVELOPER') {
      newName = 'David Chen';
      newEmail = 'dev@sbomguardian.internal';
    }

    const updatedUser: User = {
      ...currentUser,
      role: newRole,
      name: newName,
      email: newEmail
    };

    setCurrentUser(updatedUser);
    showToast(`Switched active persona to ${newName} (${newRole})`);
  };

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      await api.resetShopEaseDemo();
      await loadInitialData();
      showToast('ShopEase Maven benchmark reset to initial vulnerable state for college evaluation.');
      setCurrentView('dashboard');
    } catch (err: any) {
      alert(`Demo reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNavigate = (view: string, projectId?: string) => {
    if (projectId) {
      const p = projects.find(item => item.id === projectId);
      if (p) setSelectedProject(p);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onRoleSwitch={handleRoleSwitch}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Body with Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          pendingApprovalsCount={pendingApprovalsCount}
          criticalVulnsCount={criticalVulnsCount}
        />

        {/* View Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f19]">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onSelectProject={setSelectedProject}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              onNavigate={handleNavigate}
              onSelectProject={setSelectedProject}
            />
          )}

          {currentView === 'upload-single' && (
            <UploadView
              onNavigate={handleNavigate}
              onSelectProject={setSelectedProject}
            />
          )}

          {currentView === 'upload-bulk' && (
            <BulkUploadView
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'github-repo' && (
            <GitHubView
              onNavigate={handleNavigate}
              onSelectProject={setSelectedProject}
            />
          )}

          {currentView === 'sbom-explorer' && (
            <SbomView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'dependency-graph' && (
            <DependencyGraphView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'vulnerabilities' && (
            <VulnerabilitiesView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'risk-intelligence' && (
            <RiskIntelligenceView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'fix-simulator' && (
            <FixSimulatorView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'self-healing' && (
            <SelfHealingView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'approval-center' && (
            <ApprovalCenterView
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'policies' && (
            <PoliciesView />
          )}

          {currentView === 'video-studio' && (
            <VideoStudioView
              selectedProject={selectedProject}
              projects={projects}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
            />
          )}

          {currentView === 'audit-logs' && (
            <AuditLogsView
              selectedProject={selectedProject}
              projects={projects}
              onSelectProject={setSelectedProject}
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(usr) => {
          setCurrentUser(usr);
          showToast(`Logged in as ${usr.name} (${usr.role})`);
        }}
      />
    </div>
  );
}
