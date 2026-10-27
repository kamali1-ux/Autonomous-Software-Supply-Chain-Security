import { Project, SBOMComponent, Vulnerability, RiskAssessment, RemediationProposal, ScanJob, AuditLog } from './types';
import { CycloneDXBom, parseMavenPom, parseNpmPackageJson, parsePythonRequirements, generateCycloneDXJson } from './sbomGenerator';
import { scanComponentsForVulnerabilities } from './vulnerabilityScanner';
import { calculateExplainableRisk } from './riskEngine';
import { SHOPEASE_POM_XML, NODEPAY_PACKAGE_JSON, PYDATA_REQUIREMENTS_TXT, CLOUDSECURE_POM_XML } from './sampleProjects';

class DatabaseStore {
  private projects: Map<string, Project> = new Map();
  private sboms: Map<string, CycloneDXBom> = new Map(); // key: projectId
  private components: Map<string, SBOMComponent[]> = new Map(); // key: projectId
  private vulnerabilities: Map<string, Vulnerability[]> = new Map(); // key: projectId
  private riskAssessments: Map<string, RiskAssessment> = new Map(); // key: projectId
  private remediationProposals: Map<string, RemediationProposal> = new Map(); // key: proposalId
  private scanJobs: ScanJob[] = [];
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Seed ShopEase Project (Primary College Review Target)
    const shopEaseId = 'proj-shopease-01';
    const shopEasePom = SHOPEASE_POM_XML;
    const initialComps = parseMavenPom(shopEasePom, 'ShopEase');

    const shopEaseProject: Project = {
      id: shopEaseId,
      name: 'ShopEase E-Commerce',
      description: 'Core retail shopping cart and order processing backend (Java 21 Maven)',
      ecosystem: 'MAVEN',
      sourceType: 'MANIFEST_UPLOAD',
      status: 'ACTIVE',
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-01T10:00:00Z',
      totalDependencies: initialComps.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: [
        {
          filename: 'pom.xml',
          content: shopEasePom,
          originalContent: shopEasePom,
          ecosystem: 'MAVEN'
        }
      ]
    };

    this.projects.set(shopEaseId, shopEaseProject);
    this.components.set(shopEaseId, initialComps);
    this.sboms.set(shopEaseId, generateCycloneDXJson('ShopEase', '1.4.0', initialComps));

    // Run initial scan on ShopEase so data is rich immediately
    this.runSyncScan(shopEaseId, 'Sarah Connor (Admin)');

    // 2. Seed NodePay API
    const nodePayId = 'proj-nodepay-02';
    const nodePayComps = parseNpmPackageJson(NODEPAY_PACKAGE_JSON);
    const nodePayProject: Project = {
      id: nodePayId,
      name: 'NodePay Webhook Service',
      description: 'Payment gateway settlement microservice (Node.js npm)',
      ecosystem: 'NPM',
      sourceType: 'ZIP_UPLOAD',
      status: 'ACTIVE',
      createdAt: '2026-03-02T14:30:00Z',
      updatedAt: '2026-03-02T14:30:00Z',
      totalDependencies: nodePayComps.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: [
        {
          filename: 'package.json',
          content: NODEPAY_PACKAGE_JSON,
          originalContent: NODEPAY_PACKAGE_JSON,
          ecosystem: 'NPM'
        }
      ]
    };
    this.projects.set(nodePayId, nodePayProject);
    this.components.set(nodePayId, nodePayComps);
    this.sboms.set(nodePayId, generateCycloneDXJson('NodePay', '2.1.0', nodePayComps));
    this.runSyncScan(nodePayId, 'Alex Rivera (Security Analyst)');

    // 3. Seed PyData Pipeline
    const pyDataId = 'proj-pydata-03';
    const pyDataComps = parsePythonRequirements(PYDATA_REQUIREMENTS_TXT);
    const pyDataProject: Project = {
      id: pyDataId,
      name: 'PyData ML Feature Store',
      description: 'Machine learning feature extraction pipeline (Python PyPI)',
      ecosystem: 'PYPI',
      sourceType: 'GITHUB_REPO',
      sourceUrl: 'https://github.com/example-org/pydata-pipeline',
      branch: 'main',
      status: 'ACTIVE',
      createdAt: '2026-03-03T09:15:00Z',
      updatedAt: '2026-03-03T09:15:00Z',
      totalDependencies: pyDataComps.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: [
        {
          filename: 'requirements.txt',
          content: PYDATA_REQUIREMENTS_TXT,
          originalContent: PYDATA_REQUIREMENTS_TXT,
          ecosystem: 'PYPI'
        }
      ]
    };
    this.projects.set(pyDataId, pyDataProject);
    this.components.set(pyDataId, pyDataComps);
    this.sboms.set(pyDataId, generateCycloneDXJson('PyData', '1.0.0', pyDataComps));
    this.runSyncScan(pyDataId, 'David Chen (Developer)');

    // 4. Seed CloudSecure Gateway (Clean reference project)
    const cleanId = 'proj-cloudsecure-04';
    const cleanComps = parseMavenPom(CLOUDSECURE_POM_XML, 'CloudSecure');
    const cleanProject: Project = {
      id: cleanId,
      name: 'CloudSecure Perimeter Gateway',
      description: 'Zero-trust ingress API gateway (Java 21 Maven)',
      ecosystem: 'MAVEN',
      sourceType: 'GITHUB_REPO',
      sourceUrl: 'https://github.com/example-org/cloudsecure-gateway',
      branch: 'main',
      status: 'ACTIVE',
      createdAt: '2026-03-04T11:45:00Z',
      updatedAt: '2026-03-04T11:45:00Z',
      totalDependencies: cleanComps.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: [
        {
          filename: 'pom.xml',
          content: CLOUDSECURE_POM_XML,
          originalContent: CLOUDSECURE_POM_XML,
          ecosystem: 'MAVEN'
        }
      ]
    };
    this.projects.set(cleanId, cleanProject);
    this.components.set(cleanId, cleanComps);
    this.sboms.set(cleanId, generateCycloneDXJson('CloudSecure', '3.0.0', cleanComps));
    this.runSyncScan(cleanId, 'Sarah Connor (Admin)');

    this.addAuditLog('system', 'System Init', 'PROJECT', 'Platform initialized with 4 baseline enterprise projects and verified vulnerability rules.', 'all');
  }

  public runSyncScan(projectId: string, initiatedBy: string = 'User') {
    const project = this.projects.get(projectId);
    if (!project) return;

    const manifest = project.manifestFiles[0];
    if (!manifest) return;

    let comps: SBOMComponent[] = [];
    if (manifest.ecosystem === 'MAVEN') comps = parseMavenPom(manifest.content, project.name);
    else if (manifest.ecosystem === 'NPM') comps = parseNpmPackageJson(manifest.content);
    else comps = parsePythonRequirements(manifest.content);

    // Sync vulnerability scan
    scanComponentsForVulnerabilities(comps).then(result => {
      this.components.set(projectId, result.updatedComponents);
      this.vulnerabilities.set(projectId, result.vulnerabilities);
      this.sboms.set(projectId, generateCycloneDXJson(project.name, '1.0.0', result.updatedComponents));

      const assessment = calculateExplainableRisk(projectId, project.name, result.updatedComponents, result.vulnerabilities);
      this.riskAssessments.set(projectId, assessment);

      project.totalDependencies = result.updatedComponents.length;
      project.criticalCount = result.summary.criticalCount;
      project.highCount = result.summary.highCount;
      project.mediumCount = result.summary.mediumCount;
      project.lowCount = result.summary.lowCount;
      project.riskScore = assessment.overallScore;
      project.lastScanDate = new Date().toISOString();
      project.lastScanId = `scan-${Date.now()}`;

      this.addAuditLog('usr', initiatedBy, 'SCAN', `Completed full vulnerability scan on project '${project.name}'. Discovered ${result.vulnerabilities.length} CVEs.`, projectId);
    });
  }

  // Projects CRUD
  public getProjects(): Project[] {
    return Array.from(this.projects.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public createProject(project: Project): Project {
    this.projects.set(project.id, project);
    return project;
  }

  public updateProject(project: Project): Project {
    this.projects.set(project.id, project);
    return project;
  }

  public deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  // SBOM & Components
  public getSBOM(projectId: string): CycloneDXBom | undefined {
    return this.sboms.get(projectId);
  }

  public setSBOM(projectId: string, bom: CycloneDXBom): void {
    this.sboms.set(projectId, bom);
  }

  public getComponents(projectId: string): SBOMComponent[] {
    return this.components.get(projectId) || [];
  }

  public setComponents(projectId: string, comps: SBOMComponent[]): void {
    this.components.set(projectId, comps);
  }

  // Vulnerabilities
  public getVulnerabilities(projectId: string): Vulnerability[] {
    return this.vulnerabilities.get(projectId) || [];
  }

  public setVulnerabilities(projectId: string, vulns: Vulnerability[]): void {
    this.vulnerabilities.set(projectId, vulns);
  }

  public getAllVulnerabilities(): Vulnerability[] {
    const list: Vulnerability[] = [];
    for (const [projId, vulns] of this.vulnerabilities.entries()) {
      list.push(...vulns);
    }
    return list;
  }

  // Risk Assessments
  public getRiskAssessment(projectId: string): RiskAssessment | undefined {
    return this.riskAssessments.get(projectId);
  }

  public setRiskAssessment(projectId: string, assessment: RiskAssessment): void {
    this.riskAssessments.set(projectId, assessment);
  }

  // Remediation Proposals
  public getProposals(projectId?: string): RemediationProposal[] {
    const all = Array.from(this.remediationProposals.values());
    if (projectId) return all.filter(p => p.projectId === projectId);
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getProposal(id: string): RemediationProposal | undefined {
    return this.remediationProposals.get(id);
  }

  public setProposal(proposal: RemediationProposal): void {
    this.remediationProposals.set(proposal.id, proposal);
  }

  // Audit Logs
  public addAuditLog(userId: string, userName: string, category: AuditLog['category'], details: string, projectId?: string) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action: details.split('.')[0] || details,
      category,
      details,
      projectId
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }

  public getAuditLogs(projectId?: string): AuditLog[] {
    if (projectId) return this.auditLogs.filter(l => l.projectId === projectId);
    return this.auditLogs;
  }
}

export const db = new DatabaseStore();
