import { Project, Vulnerability, RiskAssessment, RemediationProposal, ScanJob, AuditLog, DashboardSummary, User } from '../types';

let currentAuthToken: string | null = localStorage.getItem('sbom_token');

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  if (token) localStorage.setItem('sbom_token', token);
  else localStorage.removeItem('sbom_token');
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (currentAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errMessage = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (name: string, email: string, password: string, role?: string) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/api/dashboard/summary'),
  getDashboardTrends: () => request<{ trends: any[] }>('/api/dashboard/trends'),

  // Projects
  getProjects: () => request<{ projects: Project[] }>('/api/projects'),
  getProject: (id: string) => request<{ project: Project; riskAssessment?: RiskAssessment }>(`/api/projects/${id}`),
  createProject: (data: { name: string; description?: string; ecosystem: string; manifestFilename?: string; manifestContent: string }) =>
    request<{ project: Project; scanJob: ScanJob }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteProject: (id: string) => request<{ message: string }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Uploads
  uploadSingle: (formData: FormData) =>
    request<{ project: Project; scanJob: ScanJob }>('/api/projects/upload', {
      method: 'POST',
      body: formData
    }),

  uploadBulk: (formData: FormData) =>
    request<{ createdCount: number; projects: Project[]; jobs: ScanJob[]; errors: any[]; queueStats: any }>('/api/projects/bulk-upload', {
      method: 'POST',
      body: formData
    }),

  connectGitHub: (data: { repoUrl: string; branch?: string; ecosystem?: string }) =>
    request<{ project: Project; scanJob: ScanJob }>('/api/projects/github', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Scanning & Queue
  triggerScan: (projectId: string, scanner?: string) =>
    request<{ message: string; job: ScanJob }>(`/api/projects/${projectId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ scanner })
    }),
  getQueueStats: () => request<{ stats: any; jobs: ScanJob[] }>('/api/queue/stats'),
  retryScan: (scanId: string) => request<{ message: string }>(`/api/scans/${scanId}/retry`, { method: 'POST' }),

  // SBOM
  getSBOM: (projectId: string) => request<{ sbom: any; components: any[] }>(`/api/projects/${projectId}/sbom`),
  importSBOM: (sbomJson: any, projectName?: string) =>
    request<{ message: string; project: Project }>('/api/sbom/import', {
      method: 'POST',
      body: JSON.stringify({ sbomJson, projectName })
    }),

  // Vulnerabilities
  getProjectVulnerabilities: (projectId: string) =>
    request<{ vulnerabilities: Vulnerability[] }>(`/api/projects/${projectId}/vulnerabilities`),
  getAllVulnerabilities: () => request<{ vulnerabilities: Vulnerability[] }>('/api/vulnerabilities'),

  // Risk
  getProjectRisk: (projectId: string) => request<{ riskAssessment: RiskAssessment }>(`/api/projects/${projectId}/risk`),
  analyzeRisk: (projectId: string) => request<{ riskAssessment: RiskAssessment }>(`/api/projects/${projectId}/risk/analyze`, { method: 'POST' }),

  // Remediation & What-If
  simulateFix: (projectId: string, cveId: string, candidateVersion?: string) =>
    request<{ simulation: any }>('/api/remediations/simulate', {
      method: 'POST',
      body: JSON.stringify({ projectId, cveId, candidateVersion })
    }),

  createProposal: (projectId: string, cveId: string, targetVersion?: string) =>
    request<{ proposal: RemediationProposal }>('/api/remediations/propose', {
      method: 'POST',
      body: JSON.stringify({ projectId, cveId, targetVersion })
    }),

  getProposals: (projectId?: string) =>
    request<{ proposals: RemediationProposal[] }>(projectId ? `/api/projects/${projectId}/remediations` : '/api/remediations'),

  approveProposal: (proposalId: string, data: { userId?: string; userName?: string; userRole?: string; comments?: string }) =>
    request<{ proposal: RemediationProposal }>(`/api/remediations/${proposalId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  rejectProposal: (proposalId: string, data: { userId?: string; userName?: string; userRole?: string; comments?: string }) =>
    request<{ proposal: RemediationProposal }>(`/api/remediations/${proposalId}/reject`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  executeRemediation: (proposalId: string) =>
    request<{ proposal: RemediationProposal; project: Project; executionLog: string[]; success: boolean }>(
      `/api/remediations/${proposalId}/execute`,
      { method: 'POST' }
    ),

  rollbackRemediation: (proposalId: string) =>
    request<{ message: string; proposal: RemediationProposal }>(`/api/remediations/${proposalId}/rollback`, {
      method: 'POST'
    }),

  // Reports
  generateReport: (projectId: string) => request<{ report: any }>(`/api/projects/${projectId}/reports`, { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (projectId?: string) => request<{ logs: AuditLog[] }>(projectId ? `/api/audit-logs?projectId=${projectId}` : '/api/audit-logs'),

  // Demo Reset
  resetShopEaseDemo: () => request<{ message: string }>('/api/demo/reset-shopease', { method: 'POST' })
};
