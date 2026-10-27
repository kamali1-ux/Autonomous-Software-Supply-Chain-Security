-- =============================================================================
-- Autonomous Software Supply Chain Security & Self-Healing SBOM Intelligence
-- Flyway Migration V1__initial_schema.sql (MySQL 8.0)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'SECURITY_ANALYST', 'DEVELOPER') NOT NULL DEFAULT 'DEVELOPER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    description TEXT,
    ecosystem ENUM('MAVEN', 'NPM', 'PYPI', 'MULTI') NOT NULL,
    source_type ENUM('ZIP_UPLOAD', 'MANIFEST_UPLOAD', 'GITHUB_REPO') NOT NULL,
    source_url VARCHAR(512),
    branch VARCHAR(128) DEFAULT 'main',
    status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    total_dependencies INT DEFAULT 0,
    critical_count INT DEFAULT 0,
    high_count INT DEFAULT 0,
    medium_count INT DEFAULT 0,
    low_count INT DEFAULT 0,
    risk_score INT DEFAULT 0,
    last_scan_id VARCHAR(64),
    last_scan_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_projects_status (status),
    INDEX idx_projects_ecosystem (ecosystem),
    INDEX idx_projects_risk (risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. SCAN JOBS TABLE
CREATE TABLE IF NOT EXISTS scan_jobs (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    project_name VARCHAR(191) NOT NULL,
    status ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    scanner VARCHAR(128) NOT NULL,
    scanner_version VARCHAR(64) NOT NULL,
    progress INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    duration_ms BIGINT DEFAULT NULL,
    INDEX idx_scan_jobs_project (project_id),
    INDEX idx_scan_jobs_status (status),
    CONSTRAINT fk_scan_jobs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. SBOM DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS sbom_documents (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    spec_version VARCHAR(16) NOT NULL DEFAULT '1.5',
    bom_format VARCHAR(32) NOT NULL DEFAULT 'CycloneDX',
    serial_number VARCHAR(128) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    raw_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sbom_project (project_id),
    CONSTRAINT fk_sbom_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SBOM COMPONENTS TABLE
CREATE TABLE IF NOT EXISTS sbom_components (
    id VARCHAR(191) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    component_group VARCHAR(128),
    component_name VARCHAR(128) NOT NULL,
    component_version VARCHAR(64) NOT NULL,
    purl VARCHAR(384) NOT NULL,
    ecosystem ENUM('MAVEN', 'NPM', 'PYPI') NOT NULL,
    is_direct BOOLEAN NOT NULL DEFAULT TRUE,
    license_id VARCHAR(64),
    hash_sha256 VARCHAR(64),
    vulnerabilities_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comp_project (project_id),
    INDEX idx_comp_purl (purl),
    INDEX idx_comp_name (component_name),
    CONSTRAINT fk_comp_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. DEPENDENCY RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS dependency_relationships (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    parent_purl VARCHAR(384) NOT NULL,
    child_purl VARCHAR(384) NOT NULL,
    INDEX idx_rel_project (project_id),
    INDEX idx_rel_parent (parent_purl),
    INDEX idx_rel_child (child_purl),
    CONSTRAINT fk_rel_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. VULNERABILITIES TABLE
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id VARCHAR(191) PRIMARY KEY,
    cve_id VARCHAR(64) NOT NULL,
    component_name VARCHAR(128) NOT NULL,
    component_group VARCHAR(128),
    component_version VARCHAR(64) NOT NULL,
    purl VARCHAR(384) NOT NULL,
    ecosystem ENUM('MAVEN', 'NPM', 'PYPI') NOT NULL,
    severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
    cvss_score DECIMAL(3,1) NOT NULL,
    cvss_version VARCHAR(64),
    summary TEXT NOT NULL,
    description LONGTEXT,
    affected_range VARCHAR(255) NOT NULL,
    fixed_version VARCHAR(64),
    cwe JSON,
    reference_urls JSON,
    has_known_exploit BOOLEAN DEFAULT FALSE,
    epss_score DECIMAL(5,4) DEFAULT 0.0,
    remediation_status ENUM('OPEN', 'PROPOSED', 'APPROVED', 'FIXED', 'VERIFIED', 'REJECTED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vuln_cve (cve_id),
    INDEX idx_vuln_severity (severity),
    INDEX idx_vuln_purl (purl)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. RISK ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS risk_assessments (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    overall_score INT NOT NULL,
    risk_category ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
    base_cvss_weighted INT NOT NULL,
    exploitability_score INT NOT NULL,
    exposure_context_score INT NOT NULL,
    transitive_risk_score INT NOT NULL,
    remediation_availability_score INT NOT NULL,
    contributing_factors JSON,
    reasons_for_prioritization JSON,
    limitations JSON,
    recommended_action TEXT,
    ai_explanation LONGTEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_risk_project (project_id),
    CONSTRAINT fk_risk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. REMEDIATION PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS remediation_proposals (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    project_name VARCHAR(191) NOT NULL,
    component_name VARCHAR(128) NOT NULL,
    component_group VARCHAR(128),
    current_version VARCHAR(64) NOT NULL,
    target_version VARCHAR(64) NOT NULL,
    ecosystem ENUM('MAVEN', 'NPM', 'PYPI') NOT NULL,
    vulnerabilities_addressed JSON NOT NULL,
    residual_vulnerabilities JSON,
    risk_before INT NOT NULL,
    risk_after INT NOT NULL,
    breaking_change_risk ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    status ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED', 'VERIFIED', 'FAILED', 'ROLLED_BACK') NOT NULL DEFAULT 'PENDING_APPROVAL',
    required_approval_role ENUM('DEVELOPER', 'SECURITY_ANALYST', 'ADMIN') NOT NULL,
    auto_remediation_eligible BOOLEAN DEFAULT FALSE,
    verification_log LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rem_project (project_id),
    INDEX idx_rem_status (status),
    CONSTRAINT fk_rem_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. REMEDIATION APPROVALS TABLE
CREATE TABLE IF NOT EXISTS remediation_approvals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    proposal_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(128) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action ENUM('APPROVED', 'REJECTED', 'REQUESTED') NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_appr_proposal (proposal_id),
    CONSTRAINT fk_appr_proposal FOREIGN KEY (proposal_id) REFERENCES remediation_proposals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(128) NOT NULL,
    action VARCHAR(255) NOT NULL,
    category ENUM('SCAN', 'REMEDIATION', 'APPROVAL', 'PROJECT', 'SECURITY') NOT NULL,
    details TEXT NOT NULL,
    project_id VARCHAR(64),
    ip_address VARCHAR(45),
    INDEX idx_audit_category (category),
    INDEX idx_audit_project (project_id),
    INDEX idx_audit_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. CONFIGURABLE SECURITY POLICIES TABLE
CREATE TABLE IF NOT EXISTS security_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_remediate_threshold ENUM('NEVER', 'LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
    cvss_alert_threshold DECIMAL(3,1) NOT NULL DEFAULT 7.0,
    max_risk_score_allowed INT NOT NULL DEFAULT 50,
    ignored_components JSON,
    blocked_licenses JSON,
    require_approval_direct_deps BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
