# Autonomous Software Supply Chain Security & Self-Healing SBOM Intelligence
**Platform Codename:** `SBOM Guardian`

A production-grade, centralized software supply chain security and autonomous self-healing platform engineered for enterprise dependency governance, CycloneDX 1.5 SBOM generation, NIST/OSV vulnerability discovery, explainable AI risk scoring, policy-controlled patching, and post-remediation verification.

---

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  WEB FRONTEND                                     |
|  React 19 + TypeScript + Vite + Tailwind CSS + Recharts + Topology Visualizer     |
|  Port: 3000 (Desktop & Mobile Responsive)                                         |
+----------------------------------------+------------------------------------------+
                                         | REST APIs (Bearer JWT)
                                         v
+-----------------------------------------------------------------------------------+
|                        JAVA 21 SPRING BOOT CORE BACKEND                           |
|  - JWT Authentication & RBAC (Admin, Security Analyst, Developer)                 |
|  - Ingestion Engine (ZIP, Maven pom.xml, npm package.json, PyPI requirements.txt) |
|  - Bounded Concurrency Scan Job Queue (Worker Pool)                               |
|  - CycloneDX 1.5 JSON Generator & Parser                                          |
|  - Controlled Self-Healing Workspace & Sandbox Test Runner                        |
|  - Port: 8080                                                                     |
+--------------------+-------------------------------------+------------------------+
                     |                                     |
                     v (JDBC / Flyway Migrations)          v (REST / HTTP)
+----------------------------------+   +--------------------------------------------+
|         MYSQL 8 DATABASE         |   |      PYTHON 3 FASTAPI INTELLIGENCE ENGINE  |
|  - Normalized Schemas            |   |  - Transparent Heuristic Formula (0-100)   |
|  - Flyway Versioned Migrations   |   |  - CVSS 45% + KEV 25% + Exp 15% - Fix 10%  |
|  - Immutable Audit Trail         |   |  - Gemini 3.8 Flash Natural Language Agent |
|  - Port: 3306                    |   |  - Port: 8000                              |
+----------------------------------+   +--------------------------------------------+
```

---

## 2. Database Entity-Relationship (ER) Model

```
+-----------------+       1:N       +-----------------+       1:N       +-----------------------+
|    PROJECTS     | --------------> |   SCAN_JOBS     | --------------> |   AUDIT_LOGS          |
+-----------------+                 +-----------------+                 +-----------------------+
| id (PK)         |                 | id (PK)         |                 | id (PK)               |
| name            |                 | project_id (FK) |                 | timestamp             |
| ecosystem       |                 | scanner         |                 | user_id / role        |
| risk_score      |                 | status          |                 | category              |
| last_scan_date  |                 | progress        |                 | details               |
+-----------------+                 +-----------------+                 +-----------------------+
         | 1:1                               | 1:N
         v                                   v
+-----------------+                 +-----------------+       M:N       +-----------------------+
|  SBOM_DOCUMENTS |                 | SBOM_COMPONENTS | <-------------> |    VULNERABILITIES    |
+-----------------+                 +-----------------+                 +-----------------------+
| id (PK)         |                 | id (PK)         |                 | id / cve_id (PK)      |
| project_id (FK) |                 | purl            |                 | cvss_score            |
| serial_number   |                 | is_direct       |                 | severity              |
| raw_json (1.5)  |                 | license_id      |                 | has_known_exploit     |
+-----------------+                 +-----------------+                 | fixed_version         |
         |                                   |                          +-----------------------+
         v                                   v                                      |
+-----------------------------------------------------------------------------------+
|                            REMEDIATION_PROPOSALS                                  |
| id (PK), project_id (FK), component_name, current_ver, target_ver, risk_before/after|
| status (PENDING_APPROVAL -> APPROVED -> APPLIED -> VERIFIED -> ROLLED_BACK)       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Operational Workflow

$$\textbf{Discover} \longrightarrow \textbf{Generate SBOM} \longrightarrow \textbf{Scan} \longrightarrow \textbf{Analyze Risk} \longrightarrow \textbf{Explain} \longrightarrow \textbf{Recommend} \longrightarrow \textbf{Heal Safely} \longrightarrow \textbf{Verify} \longrightarrow \textbf{Report}$$

1. **Discover**: Ingest projects via direct dependency manifest upload (`pom.xml`, `package.json`, `requirements.txt`), multi-project ZIP archives, or public GitHub URLs.
2. **Generate SBOM**: Construct official CycloneDX 1.5 JSON documents with package URLs (`pkg:maven/...`, `pkg:npm/...`), licenses, and cryptographic hashes.
3. **Scan**: Interrogate dependencies against live OSV and NIST NVD databases for known CVEs.
4. **Analyze Risk**: Calculate explainable risk index from 0 to 100 separating CVSS base scores from composite contextual risk.
5. **Explain**: Generate structured contributing factors and executive briefings using server-side Gemini 3.8 Flash.
6. **Recommend**: What-If simulator predicts residual risk and checks SemVer breaking change risk.
7. **Heal Safely**: Policy-gated automated patching creates isolated sandbox workspaces and creates minimal manifest deltas.
8. **Verify**: Runs regression tests, regenerates the SBOM, and re-scans the patched manifest to verify that CVEs are eliminated before marking status as `VERIFIED`. Rollback is available in 1 click.
9. **Report**: Generates audit-ready executive PDF and CycloneDX JSON reports.

---

## 4. Quickstart: Running with Docker Compose

Ensure Docker Desktop is running:

```bash
# Clone and enter directory
git clone https://github.com/example-org/sbom-guardian.git
cd sbom-guardian

# Start MySQL 8, Java Spring Boot, Python FastAPI, and React frontend
docker-compose up --build
```

- Web Platform: `http://localhost:3000`
- Spring Boot API: `http://localhost:8080/api`
- FastAPI AI Intelligence: `http://localhost:8000/docs`
- MySQL 8 Instance: `localhost:3306`

---

## 5. Local Development Startup (Without Docker)

### Prerequisites
- Node.js >= 20.x
- Java 21 JDK & Apache Maven 3.9+
- Python 3.10+
- MySQL 8.0

### A. Integrated Node Full-Stack Runner (Immediate Evaluation)
The included Node/TypeScript server runs the complete REST API suite, real CycloneDX generator, vulnerability engine, self-healing pipeline, and React frontend concurrently:

```bash
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

### B. Java Spring Boot Service
```bash
cd backend-java
mvn clean install -DskipTests
mvn spring-boot:run
```

### C. Python FastAPI Risk Service
```bash
cd ai-service-python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 6. Official College Review Demo Script (Reproducible Walkthrough)

To demonstrate the full end-to-end pipeline during a project viva or review:

1. **Login & Persona Selection**:
   - Access the platform and observe current persona in the top bar: `Sarah Connor (ADMIN)`.
   - Use the Role Switcher dropdown to demonstrate RBAC (Admin, Security Analyst, Developer).

2. **Benchmark Project Setup (ShopEase)**:
   - Click **"Reset ShopEase Demo"** in the top navigation bar.
   - Observe `ShopEase E-Commerce Platform` (`pom.xml` with Java 21 Maven).

3. **Inspect CycloneDX SBOM**:
   - Navigate to **SBOM Explorer**.
   - Review direct components (`log4j-core 2.14.1`, `spring-core 5.3.17`, `jackson-databind 2.9.8`) and resolved transitives.
   - Click **JSON Preview** to view the raw CycloneDX 1.5 JSON artifact.
   - Click **Export CycloneDX** to download the JSON document.

4. **Review Vulnerability Findings**:
   - Navigate to **Vulnerability Center**.
   - Note `CVE-2021-44228 (Log4Shell)` with CVSS 10.0 and active CISA KEV exploitation indicator.
   - Note `CVE-2022-22965 (Spring4Shell)` with CVSS 9.8.

5. **Explainable AI Risk Scoring**:
   - Navigate to **AI Risk Intelligence**.
   - Review mathematical breakdown: CVSS Weight (45 pts) + Exploitability (25 pts) + Exposure (15 pts) = **92/100 (CRITICAL)**.
   - Click **"Synthesize AI Threat Briefing"** to generate the executive risk narrative via Gemini 3.8 Flash.

6. **Simulate Safe Candidate Fixes**:
   - Navigate to **What-If Fix Simulator**.
   - Select `CVE-2021-44228` and set candidate version to `2.17.1`.
   - Observe projected risk score plummeting from `92` down to `14`, with breaking change risk calculated as `LOW`.
   - Click **"Create Formal Remediation Proposal"**.

7. **Security Governance & Signoff**:
   - Navigate to **Approval Center**.
   - Inspect proposal `REM-...` requiring `ADMIN` or `SECURITY_ANALYST` approval.
   - Enter reviewer remarks and click **"Authorize Remediation"**.

8. **Execute Controlled Self-Healing & Verification**:
   - Navigate to **Self-Healing Center**.
   - Click **"Execute Controlled Patch & Verify"**.
   - Observe live sandbox terminal:
     1. Creates backup snapshot of `pom.xml`.
     2. Modifies `<version>2.14.1</version>` to `<version>2.17.1</version>`.
     3. Executes simulated JDK 21 test runner (`14 tests run, 0 failures`).
     4. Regenerates CycloneDX SBOM.
     5. Re-runs vulnerability scan verifying `CVE-2021-44228` is 100% eliminated.
     6. Marks status as `VERIFIED`.

9. **One-Click Rollback Demonstration**:
   - Click **"Rollback"** on the verified proposal.
   - Observe instant restoration of the original manifest and re-indexing of baseline telemetry.

10. **Executive Report & Audit History**:
    - Open **Executive Reports** and click **"Print / Save PDF"** to preview the audit document.
    - Open **History & Audit Logs** to verify that every scan, approval, and execution event was immutably recorded.

---

## 7. Security Policy Configurations
Administrators can fine-tune supply chain policies under the **Security Policies** tab:
- **Auto-Remediation Sensitivity**: Never, Low, Medium, High.
- **CVSS Alert Threshold**: Configurable slider from 1.0 to 9.0.
- **Max Tolerated Risk Score**: Ceiling limit triggering emergency sprint quarantine.
- **Package Whitelist**: Ignore accepted risk packages with formal justification tickets.
- **License Blacklist**: Restrict copyleft licenses (e.g., AGPL-3.0, GPL-3.0-only).

---

## 8. License & Attribution
Developed for Final Year College Project: *Autonomous Software Supply Chain Security & Self-Healing SBOM Intelligence*.
Licensed under Apache 2.0.
