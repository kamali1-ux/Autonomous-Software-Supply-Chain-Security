export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ecosystem: 'MAVEN' | 'NPM' | 'PYPI' | 'MULTI';
  sourceType: 'ZIP_UPLOAD' | 'MANIFEST_UPLOAD' | 'GITHUB_REPO';
  sourceUrl?: string;
  branch?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  totalDependencies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  riskScore: number;
  lastScanId?: string;
  lastScanDate?: string;
  manifestFiles: {
    filename: string;
    content: string;
    originalContent?: string;
    ecosystem: 'MAVEN' | 'NPM' | 'PYPI';
  }[];
}

export interface SBOMComponent {
  id: string;
  name: string;
  group?: string;
  version: string;
  purl: string;
  ecosystem: 'MAVEN' | 'NPM' | 'PYPI';
  isDirect: boolean;
  license?: string;
  hashes?: { alg: string; content: string }[];
  vulnerabilitiesCount: number;
  vulnerabilityIds: string[];
  dependencies?: string[]; // IDs of dependent components
}

export interface Vulnerability {
  id: string; // e.g. CVE-2021-44228
  cveId: string;
  componentName: string;
  componentGroup?: string;
  componentVersion: string;
  purl: string;
  ecosystem: 'MAVEN' | 'NPM' | 'PYPI';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number;
  cvssVersion: string;
  summary: string;
  description: string;
  affectedRange: string;
  fixedVersion: string | null;
  cwe: string[];
  referenceUrls: string[];
  hasKnownExploit: boolean;
  epssScore?: number;
  remediationStatus: 'OPEN' | 'PROPOSED' | 'APPROVED' | 'FIXED' | 'VERIFIED' | 'REJECTED';
}

export interface RiskFactor {
  factor: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'POSITIVE';
  description: string;
  scoreContribution: number;
}

export interface RiskAssessment {
  projectId: string;
  overallScore: number; // 0 - 100
  riskCategory: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  baseCvssWeighted: number;
  exploitabilityScore: number;
  exposureContextScore: number;
  transitiveRiskScore: number;
  remediationAvailabilityScore: number;
  contributingFactors: RiskFactor[];
  reasonsForPrioritization: string[];
  limitations: string[];
  recommendedAction: string;
  aiExplanation?: string;
  calculatedAt: string;
}

export interface RemediationProposal {
  id: string;
  projectId: string;
  projectName: string;
  componentName: string;
  group?: string;
  currentVersion: string;
  targetVersion: string;
  ecosystem: 'MAVEN' | 'NPM' | 'PYPI';
  vulnerabilitiesAddressed: string[]; // CVE IDs
  residualVulnerabilities: string[];
  riskBefore: number;
  riskAfter: number;
  breakingChangeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'VERIFIED' | 'FAILED' | 'ROLLED_BACK';
  requiredApprovalRole: 'DEVELOPER' | 'SECURITY_ANALYST' | 'ADMIN';
  autoRemediationEligible: boolean;
  approvalHistory: {
    userId: string;
    userName: string;
    userRole: string;
    action: 'APPROVED' | 'REJECTED' | 'REQUESTED';
    comments: string;
    timestamp: string;
  }[];
  verificationResult?: {
    testPassed: boolean;
    sbomRegenerated: boolean;
    rescanCompleted: boolean;
    vulnerabilitiesResolved: boolean;
    executionLog: string[];
    timestamp: string;
  };
  createdAt: string;
}

export interface ScanJob {
  id: string;
  projectId: string;
  projectName: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scanner: 'CycloneDX + OSV Core' | 'Trivy Analyzer';
  scannerVersion: string;
  progress: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  stats?: {
    componentsCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    riskScore: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'SCAN' | 'REMEDIATION' | 'APPROVAL' | 'PROJECT' | 'SECURITY';
  details: string;
  projectId?: string;
  ipAddress?: string;
}
