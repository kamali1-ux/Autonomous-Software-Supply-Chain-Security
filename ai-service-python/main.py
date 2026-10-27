"""
Autonomous Software Supply Chain Security & Self-Healing SBOM Intelligence
Python 3 FastAPI Explainable Risk Intelligence Service
"""

import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="SBOM Guardian AI & Explainable Risk Intelligence Service",
    description="Mathematical composite risk scoring, threat prioritization, and plain-language explanation service",
    version="1.0.0"
)

class VulnerabilityPayload(BaseModel):
    cve_id: str
    component_name: str
    component_version: str
    severity: str
    cvss_score: float
    has_known_exploit: bool = False
    epss_score: Optional[float] = 0.0
    fixed_version: Optional[str] = None
    is_direct: bool = True

class RiskEvaluationRequest(BaseModel):
    project_id: str
    project_name: str
    total_dependencies: int
    vulnerabilities: List[VulnerabilityPayload]

class RiskFactor(BaseModel):
    factor: str
    impact: str
    description: str
    score_contribution: int

class RiskEvaluationResponse(BaseModel):
    project_id: str
    overall_score: int
    risk_category: str
    base_cvss_weighted: int
    exploitability_score: int
    exposure_context_score: int
    transitive_risk_score: int
    remediation_availability_score: int
    contributing_factors: List[RiskFactor]
    reasons_for_prioritization: List[str]
    limitations: List[str]
    recommended_action: str
    ai_explanation: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "risk-intelligence-python", "version": "1.0.0"}

@app.post("/api/risk/evaluate", response_model=RiskEvaluationResponse)
def evaluate_risk(payload: RiskEvaluationRequest):
    vulns = payload.vulnerabilities
    
    if not vulns:
        return RiskEvaluationResponse(
            project_id=payload.project_id,
            overall_score=0,
            risk_category="LOW",
            base_cvss_weighted=0,
            exploitability_score=0,
            exposure_context_score=0,
            transitive_risk_score=0,
            remediation_availability_score=0,
            contributing_factors=[
                RiskFactor(
                    factor="Clean Software Bill of Materials",
                    impact="POSITIVE",
                    description="Zero unmitigated CVEs discovered in cataloged components.",
                    score_contribution=0
                )
            ],
            reasons_for_prioritization=["Routine baseline maintenance."],
            limitations=["Static analysis assumes loaded packages match runtime classpath."],
            recommended_action="Maintain scheduled pipeline dependency scans."
        )

    # 1. CVSS Component (Max 45 pts)
    max_cvss = max((v.cvss_score for v in vulns), default=0.0)
    avg_cvss = sum(v.cvss_score for v in vulns) / len(vulns)
    base_cvss_weighted = min(45, int((max_cvss * 0.7 + avg_cvss * 0.3) * 4.5))

    # 2. Exploitability (Max 25 pts)
    has_kev = any(v.has_known_exploit for v in vulns)
    max_epss = max((v.epss_score or 0.0 for v in vulns), default=0.0)
    exploit_pts = 18 if has_kev else 0
    if max_epss > 0.8:
        exploit_pts += 7
    elif max_epss > 0.4:
        exploit_pts += 4
    exploitability_score = min(25, exploit_pts)

    # 3. Exposure Context (Max 15 pts)
    has_direct = any(v.is_direct for v in vulns)
    exposure_context_score = 15 if has_direct else 8

    # 4. Transitive Risk (Max 10 pts)
    has_transitive = any(not v.is_direct for v in vulns)
    transitive_risk_score = 10 if has_transitive else 2

    # 5. Fix Availability Discount (Up to 10 pts)
    fixable = sum(1 for v in vulns if v.fixed_version)
    remediation_availability_score = int((fixable / len(vulns)) * 10)

    # Aggregate
    raw = base_cvss_weighted + exploitability_score + exposure_context_score + transitive_risk_score - int(remediation_availability_score * 0.5)
    overall_score = max(5, min(100, raw))

    if overall_score >= 80 or max_cvss >= 9.0:
        risk_category = "CRITICAL"
    elif overall_score >= 60 or max_cvss >= 7.0:
        risk_category = "HIGH"
    elif overall_score >= 40:
        risk_category = "MEDIUM"
    else:
        risk_category = "LOW"

    factors: List[RiskFactor] = []
    if max_cvss >= 9.0:
        factors.append(RiskFactor(
            factor="Critical CVSS Base Score",
            impact="CRITICAL",
            description=f"Peak CVSS metric of {max_cvss:.1f} allows unauthenticated code execution.",
            score_contribution=base_cvss_weighted
        ))
    if has_kev:
        factors.append(RiskFactor(
            factor="CISA Known Exploited Vulnerability (KEV)",
            impact="CRITICAL",
            description="Active weaponized exploits observed in wild threat telemetry.",
            score_contribution=exploitability_score
        ))

    priorities = []
    if has_kev:
        priorities.append("Active in-the-wild exploitation creates urgent operational exposure.")
    if has_direct:
        priorities.append("Direct manifest dependencies can be bumped without transitive tree overrides.")

    recommended = "Apply verified dependency upgrade and execute test suite."
    if risk_category == "CRITICAL":
        recommended = "Emergency quarantine & patch: apply automated remediation and trigger full regression suite."

    return RiskEvaluationResponse(
        project_id=payload.project_id,
        overall_score=overall_score,
        risk_category=risk_category,
        base_cvss_weighted=base_cvss_weighted,
        exploitability_score=exploitability_score,
        exposure_context_score=exposure_context_score,
        transitive_risk_score=transitive_risk_score,
        remediation_availability_score=remediation_availability_score,
        contributing_factors=factors,
        reasons_for_prioritization=priorities,
        limitations=[
            "Static manifest analysis cannot detect in-memory runtime heap state.",
            "Network perimeter firewalls or WAF protections are not calculated in static formula."
        ],
        recommended_action=recommended,
        ai_explanation=f"Autonomous intelligence analysis for '{payload.project_name}' calculated a risk score of {overall_score}/100 ({risk_category}). The primary vulnerability vector involves {vulns[0].cve_id} in {vulns[0].component_name}."
    )
