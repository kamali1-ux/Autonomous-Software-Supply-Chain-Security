export const SHOPEASE_POM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.shopease.retail</groupId>
    <artifactId>shopease-backend</artifactId>
    <version>1.4.0</version>
    <packaging>jar</packaging>
    
    <name>ShopEase E-Commerce Platform</name>
    <description>Core retail shopping cart and order processing backend</description>

    <properties>
        <java.version>21</java.version>
        <log4j.version>2.14.1</log4j.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starter Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>2.5.4</version>
        </dependency>

        <!-- Spring Core Vulnerable to Spring4Shell (CVE-2022-22965) -->
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
            <version>5.3.17</version>
        </dependency>

        <!-- Apache Log4j Core Vulnerable to Log4Shell (CVE-2021-44228) -->
        <dependency>
            <groupId>org.apache.logging.log4j</groupId>
            <artifactId>log4j-core</artifactId>
            <version>\${log4j.version}</version>
        </dependency>

        <!-- FasterXML Jackson Databind Deserialization (CVE-2019-12384) -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.9.8</version>
        </dependency>

        <!-- Apache Commons Lang Utility -->
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
            <version>3.12.0</version>
        </dependency>
    </dependencies>
</project>`;

export const NODEPAY_PACKAGE_JSON = `{
  "name": "nodepay-api",
  "version": "2.1.0",
  "description": "Payment gateway and webhook settlement processor",
  "main": "server.js",
  "dependencies": {
    "express": "4.17.1",
    "lodash": "4.17.15",
    "axios": "0.21.0",
    "dotenv": "10.0.0"
  },
  "devDependencies": {
    "mocha": "9.1.0"
  }
}`;

export const PYDATA_REQUIREMENTS_TXT = `# PyData Machine Learning Feature Pipeline
urllib3==1.26.4
pyyaml==5.3.1
requests==2.25.0
scikit-learn==1.0.2
pandas==1.3.5
`;
