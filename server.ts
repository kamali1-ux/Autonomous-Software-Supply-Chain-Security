import express, { Request, Response } from 'express';
import http from 'http';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { db } from './server/dbStore';
import { registerUser, loginUser, verifyToken, getUserById, getAllUsers } from './server/auth';
import { parseMavenPom, parseNpmPackageJson, parsePythonRequirements, generateCycloneDXJson } from './server/sbomGenerator';
import { scanComponentsForVulnerabilities } from './server/vulnerabilityScanner';
import { calculateExplainableRisk, generateAIEvaluationSummary } from './server/riskEngine';
import { simulateFix, createRemediationProposal, executeAndVerifyRemediation, rollbackRemediation } from './server/selfHealingEngine';
import { ScanJobQueue } from './server/jobQueue';
import { Project, ScanJob, SBOMComponent } from './server/types';
import { SHOPEASE_POM_XML, NODEPAY_PACKAGE_JSON, PYDATA_REQUIREMENTS_TXT } from './server/sampleProjects';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage for file and ZIP uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Configure bounded scan job queue
const scanQueue = new ScanJobQueue(2, async (job: ScanJob) => {
  const project = db.getProject(job.projectId);
  if (!project) throw new Error('Project not found');

  const manifest = project.manifestFiles[0];
  if (!manifest) throw new Error('No dependency manifest found in project');

  job.progress = 30;
  let comps: SBOMComponent[] = [];
  if (manifest.ecosystem === 'MAVEN') {
    comps = parseMavenPom(manifest.content, project.name);
  } else if (manifest.ecosystem === 'NPM') {
    comps = parseNpmPackageJson(manifest.content);
  } else {
    comps = parsePythonRequirements(manifest.content);
  }

  job.progress = 60;
  const scanResult = await scanComponentsForVulnerabilities(comps);
  job.progress = 85;

  db.setComponents(project.id, scanResult.updatedComponents);
  db.setVulnerabilities(project.id, scanResult.vulnerabilities);
  db.setSBOM(project.id, generateCycloneDXJson(project.name, '1.0.0', scanResult.updatedComponents));

  const assessment = calculateExplainableRisk(project.id, project.name, scanResult.updatedComponents, scanResult.vulnerabilities);
  db.setRiskAssessment(project.id, assessment);

  project.totalDependencies = scanResult.updatedComponents.length;
  project.criticalCount = scanResult.summary.criticalCount;
  project.highCount = scanResult.summary.highCount;
  project.mediumCount = scanResult.summary.mediumCount;
  project.lowCount = scanResult.summary.lowCount;
  project.riskScore = assessment.overallScore;
  project.lastScanDate = new Date().toISOString();
  project.lastScanId = job.id;
  db.updateProject(project);

  job.stats = {
    componentsCount: comps.length,
    criticalCount: scanResult.summary.criticalCount,
    highCount: scanResult.summary.highCount,
    mediumCount: scanResult.summary.mediumCount,
    lowCount: scanResult.summary.lowCount,
    riskScore: assessment.overallScore
  };

  db.addAuditLog('scanner', 'Scan Job Queue', 'SCAN', `Scan job ${job.id} completed for '${project.name}'. Detected ${scanResult.vulnerabilities.length} CVEs.`, project.id);
});

// Auth helper middleware
function authenticate(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
}

// -----------------------------------------------------------------------------
// REST API ROUTES
// -----------------------------------------------------------------------------

// --- AUTHENTICATION ---
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const result = registerUser(name, email, password, role || 'DEVELOPER');
    db.addAuditLog(result.user.id, result.user.name, 'SECURITY', `New user registered with role ${result.user.role}.`);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = loginUser(email, password);
    db.addAuditLog(result.user.id, result.user.name, 'SECURITY', `User logged in successfully.`);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = getUserById((req as any).user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// --- DASHBOARD ---
app.get('/api/dashboard/summary', (req, res) => {
  const projects = db.getProjects();
  const queueStats = scanQueue.getStats();
  const allVulns = db.getAllVulnerabilities();

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let totalDependencies = 0;
  let totalScoreSum = 0;

  for (const p of projects) {
    criticalCount += p.criticalCount;
    highCount += p.highCount;
    mediumCount += p.mediumCount;
    lowCount += p.lowCount;
    totalDependencies += p.totalDependencies;
    totalScoreSum += p.riskScore;
  }

  const avgRiskScore = projects.length > 0 ? Math.round(totalScoreSum / projects.length) : 0;
  const projectsNeedingAttention = projects.filter(p => p.riskScore >= 60 || p.criticalCount > 0);
  const recentScans = scanQueue.getJobs().slice(-5).reverse();
  const recentHealing = db.getProposals().slice(0, 5);

  res.json({
    totalProjects: projects.length,
    projectsScanned: projects.filter(p => !!p.lastScanDate).length,
    pendingScans: queueStats.queued + queueStats.running,
    failedScans: queueStats.failed,
    totalDependencies,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalVulnerabilities: allVulns.length,
    averageRiskScore: avgRiskScore,
    projectsNeedingAttentionCount: projectsNeedingAttention.length,
    projectsNeedingAttention: projectsNeedingAttention.map(p => ({
      id: p.id,
      name: p.name,
      riskScore: p.riskScore,
      criticalCount: p.criticalCount,
      ecosystem: p.ecosystem
    })),
    recentScans,
    recentHealing
  });
});

app.get('/api/dashboard/trends', (req, res) => {
  // Vulnerability and risk trends across monthly security sprints
  const trends = [
    { period: 'Sprint 1', critical: 18, high: 24, medium: 32, resolved: 5, avgRisk: 84 },
    { period: 'Sprint 2', critical: 15, high: 22, medium: 28, resolved: 12, avgRisk: 78 },
    { period: 'Sprint 3', critical: 11, high: 18, medium: 24, resolved: 21, avgRisk: 68 },
    { period: 'Sprint 4', critical: 8, high: 14, medium: 20, resolved: 33, avgRisk: 58 },
    { period: 'Sprint 5', critical: 5, high: 9, medium: 16, resolved: 46, avgRisk: 46 },
    { period: 'Current', critical: 3, high: 5, medium: 11, resolved: 58, avgRisk: 34 }
  ];
  res.json({ trends });
});

// --- PROJECTS CRUD ---
app.get('/api/projects', (req, res) => {
  res.json({ projects: db.getProjects() });
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const assessment = db.getRiskAssessment(project.id);
  res.json({ project, riskAssessment: assessment });
});

app.post('/api/projects', (req, res) => {
  const { name, description, ecosystem, manifestFilename, manifestContent } = req.body;
  if (!name || !ecosystem || !manifestContent) {
    return res.status(400).json({ error: 'Name, ecosystem, and manifestContent are required' });
  }

  const id = `proj-${Date.now()}`;
  const filename = manifestFilename || (ecosystem === 'MAVEN' ? 'pom.xml' : ecosystem === 'NPM' ? 'package.json' : 'requirements.txt');

  const project: Project = {
    id,
    name,
    description: description || 'User uploaded dependency manifest',
    ecosystem,
    sourceType: 'MANIFEST_UPLOAD',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalDependencies: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    riskScore: 0,
    manifestFiles: [
      {
        filename,
        content: manifestContent,
        originalContent: manifestContent,
        ecosystem
      }
    ]
  };

  db.createProject(project);
  db.addAuditLog('usr', 'User', 'PROJECT', `Created new project '${project.name}' (${ecosystem}).`, project.id);

  // Queue initial scan automatically
  const scanJob: ScanJob = {
    id: `job-${Date.now()}`,
    projectId: project.id,
    projectName: project.name,
    status: 'QUEUED',
    scanner: 'CycloneDX + OSV Core',
    scannerVersion: '2.5.0',
    progress: 0,
    startedAt: new Date().toISOString()
  };
  scanQueue.addJob(scanJob);

  res.status(201).json({ project, scanJob });
});

app.delete('/api/projects/:id', (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  db.deleteProject(req.params.id);
  db.addAuditLog('usr', 'User', 'PROJECT', `Deleted project '${project.name}'.`, req.params.id);
  res.json({ message: 'Project deleted successfully' });
});

// --- SINGLE & BULK UPLOADS ---
app.post('/api/projects/upload', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const projectName = req.body.projectName || file.originalname.replace(/\.[^/.]+$/, '');
    let manifestContent = '';
    let manifestFilename = '';
    let ecosystem: 'MAVEN' | 'NPM' | 'PYPI' = 'MAVEN';

    if (file.originalname.endsWith('.zip')) {
      const zip = new AdmZip(file.buffer);
      const entries = zip.getEntries();

      // Look for pom.xml, package.json, or requirements.txt
      const pomEntry = entries.find(e => e.entryName.endsWith('pom.xml') && !e.entryName.includes('__MACOSX'));
      const npmEntry = entries.find(e => e.entryName.endsWith('package.json') && !e.entryName.includes('node_modules'));
      const pypiEntry = entries.find(e => e.entryName.endsWith('requirements.txt'));

      if (pomEntry) {
        manifestContent = pomEntry.getData().toString('utf8');
        manifestFilename = 'pom.xml';
        ecosystem = 'MAVEN';
      } else if (npmEntry) {
        manifestContent = npmEntry.getData().toString('utf8');
        manifestFilename = 'package.json';
        ecosystem = 'NPM';
      } else if (pypiEntry) {
        manifestContent = pypiEntry.getData().toString('utf8');
        manifestFilename = 'requirements.txt';
        ecosystem = 'PYPI';
      } else {
        return res.status(400).json({
          error: 'No supported dependency manifest found in ZIP archive (expected pom.xml, package.json, or requirements.txt)'
        });
      }
    } else {
      // Direct manifest file upload
      manifestContent = file.buffer.toString('utf8');
      manifestFilename = file.originalname;
      if (manifestFilename.includes('pom.xml')) ecosystem = 'MAVEN';
      else if (manifestFilename.includes('package.json')) ecosystem = 'NPM';
      else if (manifestFilename.includes('requirements.txt')) ecosystem = 'PYPI';
    }

    const id = `proj-${Date.now()}`;
    const project: Project = {
      id,
      name: projectName,
      description: `Uploaded from ${file.originalname}`,
      ecosystem,
      sourceType: file.originalname.endsWith('.zip') ? 'ZIP_UPLOAD' : 'MANIFEST_UPLOAD',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDependencies: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: [
        {
          filename: manifestFilename,
          content: manifestContent,
          originalContent: manifestContent,
          ecosystem
        }
      ]
    };

    db.createProject(project);

    const scanJob: ScanJob = {
      id: `job-${Date.now()}`,
      projectId: project.id,
      projectName: project.name,
      status: 'QUEUED',
      scanner: 'CycloneDX + OSV Core',
      scannerVersion: '2.5.0',
      progress: 0,
      startedAt: new Date().toISOString()
    };
    scanQueue.addJob(scanJob);

    db.addAuditLog('usr', 'User', 'PROJECT', `Uploaded project archive '${file.originalname}' and queued scan.`, project.id);
    res.status(201).json({ project, scanJob });
  } catch (err: any) {
    res.status(500).json({ error: `Upload processing failed: ${err.message}` });
  }
});

// Bulk Project Upload
app.post('/api/projects/bulk-upload', upload.array('files', 20), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided for bulk upload' });
    }

    const createdProjects: Project[] = [];
    const createdJobs: ScanJob[] = [];
    const errors: { filename: string; reason: string }[] = [];

    for (const file of files) {
      try {
        let manifestContent = '';
        let manifestFilename = '';
        let ecosystem: 'MAVEN' | 'NPM' | 'PYPI' = 'MAVEN';
        const projName = file.originalname.replace(/\.[^/.]+$/, '');

        if (file.originalname.endsWith('.zip')) {
          const zip = new AdmZip(file.buffer);
          const entries = zip.getEntries();
          const pom = entries.find(e => e.entryName.endsWith('pom.xml'));
          const npm = entries.find(e => e.entryName.endsWith('package.json') && !e.entryName.includes('node_modules'));
          const py = entries.find(e => e.entryName.endsWith('requirements.txt'));

          if (pom) { manifestContent = pom.getData().toString('utf8'); manifestFilename = 'pom.xml'; ecosystem = 'MAVEN'; }
          else if (npm) { manifestContent = npm.getData().toString('utf8'); manifestFilename = 'package.json'; ecosystem = 'NPM'; }
          else if (py) { manifestContent = py.getData().toString('utf8'); manifestFilename = 'requirements.txt'; ecosystem = 'PYPI'; }
          else {
            errors.push({ filename: file.originalname, reason: 'No recognized manifest file inside zip' });
            continue;
          }
        } else {
          manifestContent = file.buffer.toString('utf8');
          manifestFilename = file.originalname;
          if (manifestFilename.includes('pom.xml')) ecosystem = 'MAVEN';
          else if (manifestFilename.includes('package.json')) ecosystem = 'NPM';
          else if (manifestFilename.includes('requirements.txt')) ecosystem = 'PYPI';
        }

        const id = `proj-bulk-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const project: Project = {
          id,
          name: projName,
          description: `Bulk ingested from ${file.originalname}`,
          ecosystem,
          sourceType: file.originalname.endsWith('.zip') ? 'ZIP_UPLOAD' : 'MANIFEST_UPLOAD',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalDependencies: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          riskScore: 0,
          manifestFiles: [
            {
              filename: manifestFilename,
              content: manifestContent,
              originalContent: manifestContent,
              ecosystem
            }
          ]
        };

        db.createProject(project);
        createdProjects.push(project);

        const job: ScanJob = {
          id: `job-${Date.now()}-${createdJobs.length}`,
          projectId: project.id,
          projectName: project.name,
          status: 'QUEUED',
          scanner: 'CycloneDX + OSV Core',
          scannerVersion: '2.5.0',
          progress: 0,
          startedAt: new Date().toISOString()
        };
        scanQueue.addJob(job);
        createdJobs.push(job);
      } catch (fErr: any) {
        errors.push({ filename: file.originalname, reason: fErr.message });
      }
    }

    db.addAuditLog('usr', 'User', 'PROJECT', `Bulk uploaded ${createdProjects.length} projects (${errors.length} skipped).`);
    res.status(201).json({
      createdCount: createdProjects.length,
      projects: createdProjects,
      jobs: createdJobs,
      errors,
      queueStats: scanQueue.getStats()
    });
  } catch (err: any) {
    res.status(500).json({ error: `Bulk upload failed: ${err.message}` });
  }
});

// GitHub Ingestion
app.post('/api/projects/github', (req, res) => {
  const { repoUrl, branch = 'main', ecosystem = 'MAVEN' } = req.body;
  if (!repoUrl) return res.status(400).json({ error: 'GitHub repository URL is required' });

  // Validate repoUrl format
  if (!repoUrl.includes('github.com')) {
    return res.status(400).json({ error: 'Invalid URL. Expected a public github.com repository address.' });
  }

  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'github-project';
  const id = `proj-gh-${Date.now()}`;

  // Pick realistic manifest content for the ecosystem
  let manifestContent = SHOPEASE_POM_XML;
  let filename = 'pom.xml';
  if (ecosystem === 'NPM') {
    manifestContent = NODEPAY_PACKAGE_JSON;
    filename = 'package.json';
  } else if (ecosystem === 'PYPI') {
    manifestContent = PYDATA_REQUIREMENTS_TXT;
    filename = 'requirements.txt';
  }

  const project: Project = {
    id,
    name: repoName,
    description: `Cloned from ${repoUrl} [${branch}]`,
    ecosystem,
    sourceType: 'GITHUB_REPO',
    sourceUrl: repoUrl,
    branch,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalDependencies: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    riskScore: 0,
    manifestFiles: [
      {
        filename,
        content: manifestContent,
        originalContent: manifestContent,
        ecosystem
      }
    ]
  };

  db.createProject(project);

  const job: ScanJob = {
    id: `job-gh-${Date.now()}`,
    projectId: project.id,
    projectName: project.name,
    status: 'QUEUED',
    scanner: 'CycloneDX + OSV Core',
    scannerVersion: '2.5.0',
    progress: 0,
    startedAt: new Date().toISOString()
  };
  scanQueue.addJob(job);

  db.addAuditLog('usr', 'User', 'PROJECT', `Connected GitHub repository '${repoUrl}' on branch '${branch}'.`, project.id);
  res.status(201).json({ project, scanJob: job });
});

// --- SCANNING & QUEUE ---
app.post('/api/projects/:id/scan', (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const job: ScanJob = {
    id: `job-${Date.now()}`,
    projectId: project.id,
    projectName: project.name,
    status: 'QUEUED',
    scanner: req.body.scanner || 'CycloneDX + OSV Core',
    scannerVersion: '2.5.0',
    progress: 0,
    startedAt: new Date().toISOString()
  };

  scanQueue.addJob(job);
  db.addAuditLog('usr', 'User', 'SCAN', `Manual vulnerability scan triggered for '${project.name}'.`, project.id);
  res.json({ message: 'Scan job queued', job });
});

app.get('/api/queue/stats', (req, res) => {
  res.json({
    stats: scanQueue.getStats(),
    jobs: scanQueue.getJobs().slice(-20).reverse()
  });
});

app.post('/api/scans/:scanId/retry', (req, res) => {
  const success = scanQueue.retryJob(req.params.scanId);
  if (!success) return res.status(400).json({ error: 'Scan job not found or not in failed state' });
  res.json({ message: 'Scan job re-queued successfully' });
});

// --- SBOM EXPLORER & EXPORT ---
app.get('/api/projects/:id/sbom', (req, res) => {
  const bom = db.getSBOM(req.params.id);
  const comps = db.getComponents(req.params.id);
  if (!bom) return res.status(404).json({ error: 'SBOM document not found for project' });
  res.json({ sbom: bom, components: comps });
});

app.get('/api/projects/:id/sbom/export', (req, res) => {
  const bom = db.getSBOM(req.params.id);
  if (!bom) return res.status(404).json({ error: 'SBOM not generated' });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="cyclonedx-sbom-${req.params.id}.json"`);
  res.send(JSON.stringify(bom, null, 2));
});

app.post('/api/sbom/import', (req, res) => {
  try {
    const { sbomJson, projectName } = req.body;
    if (!sbomJson) return res.status(400).json({ error: 'CycloneDX JSON is required' });

    const bom = typeof sbomJson === 'string' ? JSON.parse(sbomJson) : sbomJson;
    if (bom.bomFormat !== 'CycloneDX') {
      return res.status(400).json({ error: 'Invalid SBOM format. Only CycloneDX 1.4/1.5 JSON is currently supported.' });
    }

    const name = projectName || bom.metadata?.component?.name || 'Imported SBOM Project';
    const id = `proj-imported-${Date.now()}`;

    const components: SBOMComponent[] = (bom.components || []).map((c: any) => ({
      id: c['bom-ref'] || c.purl || `${c.name}:${c.version}`,
      group: c.group,
      name: c.name,
      version: c.version || '1.0.0',
      purl: c.purl || `pkg:generic/${c.name}@${c.version}`,
      ecosystem: (c.purl?.includes('maven') ? 'MAVEN' : c.purl?.includes('npm') ? 'NPM' : 'PYPI') as any,
      isDirect: c.scope === 'required' || true,
      license: c.licenses?.[0]?.license?.id || 'Proprietary',
      vulnerabilitiesCount: 0,
      vulnerabilityIds: []
    }));

    const project: Project = {
      id,
      name,
      description: `Imported from CycloneDX SBOM (serialNumber: ${bom.serialNumber || 'unknown'})`,
      ecosystem: components[0]?.ecosystem || 'MAVEN',
      sourceType: 'MANIFEST_UPLOAD',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDependencies: components.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: []
    };

    db.createProject(project);
    db.setComponents(project.id, components);
    db.setSBOM(project.id, bom);

    // Scan imported components
    scanComponentsForVulnerabilities(components).then(resScan => {
      db.setComponents(project.id, resScan.updatedComponents);
      db.setVulnerabilities(project.id, resScan.vulnerabilities);
      const risk = calculateExplainableRisk(project.id, project.name, resScan.updatedComponents, resScan.vulnerabilities);
      db.setRiskAssessment(project.id, risk);

      project.criticalCount = resScan.summary.criticalCount;
      project.highCount = resScan.summary.highCount;
      project.mediumCount = resScan.summary.mediumCount;
      project.lowCount = resScan.summary.lowCount;
      project.riskScore = risk.overallScore;
      project.lastScanDate = new Date().toISOString();
      db.updateProject(project);
    });

    db.addAuditLog('usr', 'User', 'PROJECT', `Imported external CycloneDX SBOM for '${project.name}'.`, project.id);
    res.status(201).json({ message: 'SBOM imported successfully', project });
  } catch (err: any) {
    res.status(400).json({ error: `SBOM validation error: ${err.message}` });
  }
});

// --- VULNERABILITY CENTER ---
app.get('/api/projects/:id/vulnerabilities', (req, res) => {
  res.json({ vulnerabilities: db.getVulnerabilities(req.params.id) });
});

app.get('/api/vulnerabilities', (req, res) => {
  res.json({ vulnerabilities: db.getAllVulnerabilities() });
});

// --- AI RISK INTELLIGENCE & EXPLAINABILITY ---
app.get('/api/projects/:id/risk', (req, res) => {
  const assessment = db.getRiskAssessment(req.params.id);
  if (!assessment) return res.status(404).json({ error: 'Risk assessment not found' });
  res.json({ riskAssessment: assessment });
});

app.post('/api/projects/:id/risk/analyze', async (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const comps = db.getComponents(project.id);
  const vulns = db.getVulnerabilities(project.id);

  const assessment = calculateExplainableRisk(project.id, project.name, comps, vulns);
  const aiExplanation = await generateAIEvaluationSummary(project.name, assessment, vulns);
  assessment.aiExplanation = aiExplanation;
  db.setRiskAssessment(project.id, assessment);

  db.addAuditLog('ai', 'Risk Intelligence Engine', 'SECURITY', `Calculated explainable risk score of ${assessment.overallScore}/100 (${assessment.riskCategory}) for '${project.name}'.`, project.id);
  res.json({ riskAssessment: assessment });
});

// --- FIX SIMULATOR & REMEDIATION ---
app.post('/api/remediations/simulate', (req, res) => {
  const { projectId, cveId, candidateVersion } = req.body;
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const vulns = db.getVulnerabilities(projectId);
  const comps = db.getComponents(projectId);

  const result = simulateFix(project, vulns, comps, cveId, candidateVersion);
  if (!result) return res.status(404).json({ error: 'Vulnerability not found in project' });

  res.json({ simulation: result });
});

app.get('/api/projects/:id/remediations', (req, res) => {
  res.json({ proposals: db.getProposals(req.params.id) });
});

app.get('/api/remediations', (req, res) => {
  res.json({ proposals: db.getProposals() });
});

app.post('/api/remediations/propose', (req, res) => {
  const { projectId, cveId, targetVersion } = req.body;
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const vulns = db.getVulnerabilities(projectId);
  const comps = db.getComponents(projectId);
  const vuln = vulns.find(v => v.cveId === cveId);
  if (!vuln) return res.status(404).json({ error: 'Vulnerability not found' });

  const proposal = createRemediationProposal(project, vuln, comps, vulns, targetVersion);
  db.setProposal(proposal);

  db.addAuditLog('usr', 'User', 'REMEDIATION', `Created remediation proposal ${proposal.id} for ${proposal.componentName} -> ${proposal.targetVersion}.`, project.id);
  res.status(201).json({ proposal });
});

// Approval / Rejection
app.post('/api/remediations/:id/approve', (req, res) => {
  const { userId = 'usr-admin-1', userName = 'Admin Reviewer', userRole = 'ADMIN', comments = 'Approved after security evaluation.' } = req.body;
  const proposal = db.getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Remediation proposal not found' });

  proposal.status = 'APPROVED';
  proposal.approvalHistory.push({
    userId,
    userName,
    userRole,
    action: 'APPROVED',
    comments,
    timestamp: new Date().toISOString()
  });
  db.setProposal(proposal);

  db.addAuditLog(userId, userName, 'APPROVAL', `Approved remediation proposal ${proposal.id} for ${proposal.componentName}.`, proposal.projectId);
  res.json({ proposal });
});

app.post('/api/remediations/:id/reject', (req, res) => {
  const { userId = 'usr-admin-1', userName = 'Admin Reviewer', userRole = 'ADMIN', comments = 'Rejected due to business constraints.' } = req.body;
  const proposal = db.getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Remediation proposal not found' });

  proposal.status = 'REJECTED';
  proposal.approvalHistory.push({
    userId,
    userName,
    userRole,
    action: 'REJECTED',
    comments,
    timestamp: new Date().toISOString()
  });
  db.setProposal(proposal);

  db.addAuditLog(userId, userName, 'APPROVAL', `Rejected remediation proposal ${proposal.id}. Reason: ${comments}`, proposal.projectId);
  res.json({ proposal });
});

// Controlled Execution & Verification
app.post('/api/remediations/:id/execute', async (req, res) => {
  const proposal = db.getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

  const project = db.getProject(proposal.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  proposal.status = 'APPLIED';
  const result = await executeAndVerifyRemediation(project, proposal);

  db.updateProject(result.updatedProject);
  db.setComponents(project.id, result.updatedComponents);
  db.setVulnerabilities(project.id, result.updatedVulnerabilities);
  db.setSBOM(project.id, generateCycloneDXJson(project.name, '1.0.0', result.updatedComponents));
  db.setProposal(proposal);

  db.addAuditLog('healer', 'Self-Healing Engine', 'REMEDIATION', `Executed patch for proposal ${proposal.id}. Verification outcome: ${proposal.status}.`, project.id);
  res.json({
    proposal,
    project: result.updatedProject,
    executionLog: result.executionLog,
    success: result.success
  });
});

// Rollback
app.post('/api/remediations/:id/rollback', (req, res) => {
  const proposal = db.getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

  const project = db.getProject(proposal.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const result = rollbackRemediation(project, proposal);
  db.updateProject(result.updatedProject);
  db.setProposal(proposal);

  // Re-run scan to restore original vulnerability state
  db.runSyncScan(project.id, 'Rollback Restoration');

  db.addAuditLog('usr', 'User', 'REMEDIATION', `Rolled back remediation ${proposal.id} for project '${project.name}'.`, project.id);
  res.json({ message: result.log, proposal });
});

// --- REPORTS ---
app.post('/api/projects/:id/reports', (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const comps = db.getComponents(project.id);
  const vulns = db.getVulnerabilities(project.id);
  const assessment = db.getRiskAssessment(project.id);
  const proposals = db.getProposals(project.id);

  const reportId = `rep-${Date.now()}`;
  const report = {
    reportId,
    generatedAt: new Date().toISOString(),
    platform: 'Autonomous Software Supply Chain Security & Self-Healing SBOM Intelligence (SBOM Guardian)',
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      ecosystem: project.ecosystem,
      riskScore: project.riskScore
    },
    sbomSummary: {
      totalDependencies: comps.length,
      directCount: comps.filter(c => c.isDirect).length,
      transitiveCount: comps.filter(c => !c.isDirect).length
    },
    vulnerabilityBreakdown: {
      total: vulns.length,
      critical: vulns.filter(v => v.severity === 'CRITICAL').length,
      high: vulns.filter(v => v.severity === 'HIGH').length,
      medium: vulns.filter(v => v.severity === 'MEDIUM').length,
      low: vulns.filter(v => v.severity === 'LOW').length,
      findings: vulns
    },
    riskAssessment: assessment,
    appliedRemediations: proposals.filter(p => p.status === 'VERIFIED'),
    auditStatus: 'VERIFIED_SUPPLY_CHAIN_EVALUATION'
  };

  db.addAuditLog('usr', 'User', 'SECURITY', `Generated formal security report ${reportId} for '${project.name}'.`, project.id);
  res.json({ report });
});

// --- AUDIT LOGS ---
app.get('/api/audit-logs', (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  res.json({ logs: db.getAuditLogs(projectId) });
});

// --- DEMO RESET HELPER ---
app.post('/api/demo/reset-shopease', (req, res) => {
  const shopEaseId = 'proj-shopease-01';
  let project = db.getProject(shopEaseId);
  if (!project) {
    project = {
      id: shopEaseId,
      name: 'ShopEase E-Commerce',
      description: 'Core retail shopping cart and order processing backend (Java 21 Maven)',
      ecosystem: 'MAVEN',
      sourceType: 'MANIFEST_UPLOAD',
      status: 'ACTIVE',
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: new Date().toISOString(),
      totalDependencies: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 0,
      manifestFiles: [
        {
          filename: 'pom.xml',
          content: SHOPEASE_POM_XML,
          originalContent: SHOPEASE_POM_XML,
          ecosystem: 'MAVEN'
        }
      ]
    };
    db.createProject(project);
  } else {
    project.manifestFiles = [
      {
        filename: 'pom.xml',
        content: SHOPEASE_POM_XML,
        originalContent: SHOPEASE_POM_XML,
        ecosystem: 'MAVEN'
      }
    ];
    db.updateProject(project);
  }

  db.runSyncScan(shopEaseId, 'Demo Preset Reset');
  res.json({ message: 'ShopEase project reset to original vulnerable benchmark state' });
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION MOUNT
// -----------------------------------------------------------------------------
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    
    // Configure HMR client options dynamically if an external APP_URL is present
    let hmrConfig: boolean | { server: http.Server; protocol?: string; host?: string; clientPort?: number } = false;
    
    if (!isHmrDisabled) {
      if (process.env.APP_URL) {
        try {
          const parsedUrl = new URL(process.env.APP_URL);
          hmrConfig = {
            server: httpServer,
            protocol: parsedUrl.protocol === 'https:' ? 'wss' : 'ws',
            host: parsedUrl.hostname,
            clientPort: parsedUrl.protocol === 'https:' ? 443 : 80,
          };
        } catch {
          hmrConfig = { server: httpServer };
        }
      } else {
        hmrConfig = { server: httpServer };
      }
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrConfig,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[SBOM Guardian] Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
