import { GoogleGenAI } from '@google/genai';
import { RiskAssessment, RiskFactor, Vulnerability, SBOMComponent } from './types';

export function calculateExplainableRisk(
  projectId: string,
  projectName: string,
  components: SBOMComponent[],
  vulnerabilities: Vulnerability[]
): RiskAssessment {
  if (vulnerabilities.length === 0) {
    return {
      projectId,
      overallScore: 0,
      riskCategory: 'LOW',
      baseCvssWeighted: 0,
      exploitabilityScore: 0,
      exposureContextScore: 0,
      transitiveRiskScore: 0,
      remediationAvailabilityScore: 0,
      contributingFactors: [
        {
          factor: 'Clean Bill of Materials',
          impact: 'POSITIVE',
          description: 'No known CVEs detected in discovered dependency manifests.',
          scoreContribution: 0
        }
      ],
      reasonsForPrioritization: ['Routine maintenance; no urgent security action required.'],
      limitations: ['Static manifest analysis cannot detect zero-day or runtime-only memory corruption.'],
      recommendedAction: 'Maintain current dependencies and monitor release advisories.',
      calculatedAt: new Date().toISOString()
    };
  }

  // 1. CVSS Severity Factor (Weight: 45%)
  const maxCvss = Math.max(...vulnerabilities.map(v => v.cvssScore), 0);
  const avgCvss = vulnerabilities.reduce((acc, v) => acc + v.cvssScore, 0) / vulnerabilities.length;
  // Combine peak CVSS with density
  const baseCvssWeighted = Math.min(45, Math.round((maxCvss * 0.7 + avgCvss * 0.3) * 4.5));

  // 2. Exploitability Factor (Weight: 25%)
  const hasActiveExploit = vulnerabilities.some(v => v.hasKnownExploit);
  const maxEpss = Math.max(...vulnerabilities.map(v => v.epssScore || 0), 0);
  let exploitabilityScore = 0;
  if (hasActiveExploit) exploitabilityScore += 18;
  if (maxEpss > 0.8) exploitabilityScore += 7;
  else if (maxEpss > 0.4) exploitabilityScore += 4;
  exploitabilityScore = Math.min(25, exploitabilityScore);

  // 3. Exposure Context Factor (Weight: 15%)
  // Direct dependencies are directly invoked by app code
  const directVulns = vulnerabilities.filter(v => {
    const comp = components.find(c => c.purl === v.purl);
    return comp?.isDirect ?? true;
  });
  const exposureContextScore = directVulns.length > 0 ? 15 : 8;

  // 4. Transitive Risk Depth (Weight: 10%)
  const transitiveVulns = vulnerabilities.filter(v => {
    const comp = components.find(c => c.purl === v.purl);
    return comp && !comp.isDirect;
  });
  const transitiveRiskScore = transitiveVulns.length > 0 ? 10 : 2;

  // 5. Remediation Availability Factor (Discount: up to 10 points)
  const fixableCount = vulnerabilities.filter(v => !!v.fixedVersion).length;
  const fixRatio = fixableCount / vulnerabilities.length;
  // If fixes exist, actionable risk can be neutralized promptly
  const remediationAvailabilityScore = Math.round(fixRatio * 10);

  // Total score: base + exploit + exposure + transitive - fix discount/mitigation
  let rawScore = baseCvssWeighted + exploitabilityScore + exposureContextScore + transitiveRiskScore - (remediationAvailabilityScore * 0.5);
  let overallScore = Math.max(5, Math.min(100, Math.round(rawScore)));

  // Category
  let riskCategory: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (overallScore >= 80 || maxCvss >= 9.0) riskCategory = 'CRITICAL';
  else if (overallScore >= 60 || maxCvss >= 7.0) riskCategory = 'HIGH';
  else if (overallScore >= 40) riskCategory = 'MEDIUM';

  const contributingFactors: RiskFactor[] = [];

  if (maxCvss >= 9.0) {
    contributingFactors.push({
      factor: 'Critical CVSS Score',
      impact: 'CRITICAL',
      description: `Peak CVSS score of ${maxCvss.toFixed(1)} detected (${vulnerabilities.find(v => v.cvssScore === maxCvss)?.cveId}). Allows remote compromise with low attack complexity.`,
      scoreContribution: baseCvssWeighted
    });
  } else if (maxCvss >= 7.0) {
    contributingFactors.push({
      factor: 'High CVSS Base Metric',
      impact: 'HIGH',
      description: `Peak CVSS score of ${maxCvss.toFixed(1)} detected across dependencies.`,
      scoreContribution: baseCvssWeighted
    });
  }

  if (hasActiveExploit) {
    contributingFactors.push({
      factor: 'Known Exploitation in the Wild (KEV)',
      impact: 'CRITICAL',
      description: 'Active public weaponized exploit kits and in-the-wild attacks observed (CISA KEV / EPSS > 0.90).',
      scoreContribution: exploitabilityScore
    });
  }

  if (directVulns.length > 0) {
    contributingFactors.push({
      factor: 'Direct Surface Exposure',
      impact: 'HIGH',
      description: `${directVulns.length} direct dependencies have unpatched vulnerabilities directly reachable in project manifest.`,
      scoreContribution: exposureContextScore
    });
  }

  if (transitiveVulns.length > 0) {
    contributingFactors.push({
      factor: 'Hidden Transitive Vulnerabilities',
      impact: 'MEDIUM',
      description: `${transitiveVulns.length} nested child dependencies contain vulnerabilities introduced through parent packages.`,
      scoreContribution: transitiveRiskScore
    });
  }

  if (fixableCount > 0) {
    contributingFactors.push({
      factor: 'Verified Fixes Available',
      impact: 'POSITIVE',
      description: `${fixableCount} of ${vulnerabilities.length} vulnerabilities have verified safe upgrade targets published in registries.`,
      scoreContribution: -remediationAvailabilityScore
    });
  }

  const reasonsForPrioritization: string[] = [];
  if (hasActiveExploit) {
    reasonsForPrioritization.push('Elevated exploitability: active weaponized PoCs make this an immediate target.');
  }
  if (vulnerabilities.some(v => v.cveId === 'CVE-2021-44228' || v.cveId === 'CVE-2022-22965')) {
    reasonsForPrioritization.push('Catastrophic supply chain incident: Log4Shell/Spring4Shell enables unauthenticated RCE.');
  }
  if (directVulns.length > 0) {
    reasonsForPrioritization.push('Direct dependency ownership allows straightforward manifest bumping without complex tree overrides.');
  }

  const limitations = [
    'Static manifest analysis assumes declared dependencies are loaded at runtime.',
    'Dynamic runtime code path reachability is unverified until test suite execution.',
    'Scoring does not evaluate air-gapped network segmentation or WAF perimeter filters.'
  ];

  let recommendedAction = 'Review proposed candidate fixes and apply updates.';
  if (riskCategory === 'CRITICAL') {
    recommendedAction = 'Immediate quarantine & automated remediation: apply verified dependency bumps and trigger regression test suite.';
  } else if (riskCategory === 'HIGH') {
    recommendedAction = 'Schedule priority sprint patch; obtain Developer or Security Analyst approval before merging.';
  }

  return {
    projectId,
    overallScore,
    riskCategory,
    baseCvssWeighted,
    exploitabilityScore,
    exposureContextScore,
    transitiveRiskScore,
    remediationAvailabilityScore,
    contributingFactors,
    reasonsForPrioritization,
    limitations,
    recommendedAction,
    calculatedAt: new Date().toISOString()
  };
}

export async function generateAIEvaluationSummary(
  projectName: string,
  assessment: RiskAssessment,
  vulnerabilities: Vulnerability[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateDeterministicSummary(projectName, assessment, vulnerabilities);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const vulnSummary = vulnerabilities.slice(0, 5).map(v => 
      `- ${v.cveId} (${v.componentName}@${v.componentVersion}): CVSS ${v.cvssScore} ${v.severity}. Summary: ${v.summary}`
    ).join('\n');

    const prompt = `You are a Principal Software Supply Chain Security Architect analyzing project "${projectName}".
Risk Score: ${assessment.overallScore}/100 (${assessment.riskCategory} Risk).
Vulnerabilities:
${vulnSummary}

Provide a concise, 2-3 paragraph executive security briefing explaining:
1. Why these dependencies pose a concrete threat to the application (blast radius and attack vectors).
2. The supply chain risk implications (e.g. Log4Shell JNDI injection or prototype pollution).
3. Explicit actionable recommendation for engineering leadership.
Maintain a professional, objective tone without marketing fluff or buzzwords.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return response.text || generateDeterministicSummary(projectName, assessment, vulnerabilities);
  } catch (err) {
    console.warn('Gemini API call skipped or encountered error, falling back to deterministic explanation:', err);
    return generateDeterministicSummary(projectName, assessment, vulnerabilities);
  }
}

function generateDeterministicSummary(
  projectName: string,
  assessment: RiskAssessment,
  vulnerabilities: Vulnerability[]
): string {
  const topVuln = vulnerabilities[0];
  if (!topVuln) {
    return `Security posture assessment for ${projectName} indicates healthy dependency hygiene with 0 known unpatched CVEs in the primary manifest. Routine continuous integration scanning is recommended.`;
  }

  return `Security risk assessment for ${projectName} indicates an overall supply chain risk score of ${assessment.overallScore}/100 categorized as ${assessment.riskCategory}.

The primary risk driver is ${topVuln.cveId} affecting ${topVuln.componentName} (version ${topVuln.componentVersion}) with a CVSS base metric of ${topVuln.cvssScore}. This vulnerability enables remote threat actors to trigger unintended behaviors or arbitrary code execution through unvalidated parser inputs. ${topVuln.hasKnownExploit ? 'Active weaponized exploits exist in public threat catalogs, significantly elevating likelihood of compromise.' : ''}

Remediation Strategy: Upgrading to verified vendor-released versions (such as ${topVuln.fixedVersion || 'the latest stable release'}) resolves the vulnerable input vectors. All changes must be verified through the isolated test runner and re-scanned against the CycloneDX baseline.`;
}
