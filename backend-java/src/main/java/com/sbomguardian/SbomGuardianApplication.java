package com.sbomguardian;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Autonomous Software Supply Chain Security & Self-Healing SBOM Intelligence Engine
 * Spring Boot 3.2 Main Application Entry Point
 */
@SpringBootApplication
@EnableAsync
public class SbomGuardianApplication {

    public static void main(String[] args) {
        SpringApplication.run(SbomGuardianApplication.class, args);
        System.out.println("=============================================================");
        System.out.println(" SBOM GUARDIAN ENGINE RUNNING ON PORT 8080");
        System.out.println(" Database: MySQL 8 (Flyway Versioned Migrations)");
        System.out.println(" CycloneDX Specification: 1.5 JSON");
        System.out.println("=============================================================");
    }
}
