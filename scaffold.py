import os
from pathlib import Path

def create_file(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# --- AI SERVICE ---
create_file("ai-service/main.py", """
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
from sentence_transformers import SentenceTransformer, util
import torch

app = FastAPI()

model_name = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
model = SentenceTransformer(model_name)

class AnalyzeRequest(BaseModel):
    grievanceId: str
    text: str

class Prediction(BaseModel):
    departmentCode: str
    taxonomyCode: str
    confidence: float

class AnalyzeResponse(BaseModel):
    grievanceId: str
    provider: str = "sentence-transformer"
    modelVersion: str = "multilingual-minilm-v1"
    taxonomyCode: str
    departmentCode: str
    confidence: float
    priority: str
    priorityReason: str
    urgentReasons: List[str]
    explanation: str
    topPredictions: List[Prediction]
    decision: str
    requiresHumanReview: bool

TAXONOMY = [
    {"code": "ROADS.POTHOLE", "dept": "ROADS", "desc": "Potholes on the road, broken roads, accident risk"},
    {"code": "SANITATION.SEWER", "dept": "SANITATION", "desc": "Sewer overflow, drainage issue, garbage on street"},
    {"code": "ELECTRICITY.OUTAGE", "dept": "ELECTRICITY", "desc": "Power cut, no electricity, broken wire, sparking"},
    {"code": "WATER.NO_SUPPLY", "dept": "WATER", "desc": "No water supply, dirty water, pipeline leak"},
    {"code": "PUBLIC_SERVICES.OTHER", "dept": "PUBLIC_SERVICES", "desc": "Other general public service issues"}
]

# Pre-compute embeddings
tax_texts = [t["desc"] for t in TAXONOMY]
tax_embeddings = model.encode(tax_texts, convert_to_tensor=True)

@app.get("/health")
def health():
    return {"status": "up"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    emb = model.encode(req.text, convert_to_tensor=True)
    cosine_scores = util.cos_sim(emb, tax_embeddings)[0]
    
    results = []
    for i, score in enumerate(cosine_scores):
        results.append({
            "code": TAXONOMY[i]["code"],
            "dept": TAXONOMY[i]["dept"],
            "score": score.item()
        })
    
    results.sort(key=lambda x: x["score"], reverse=True)
    top3 = results[:3]
    
    best = top3[0]
    confidence = best["score"]
    
    priority = "NORMAL"
    priorityReason = ""
    urgentReasons = []
    
    text_lower = req.text.lower()
    if "emergency" in text_lower or "accident" in text_lower or "sparking" in text_lower:
        priority = "EMERGENCY"
        priorityReason = "Detected safety keywords."
        urgentReasons = ["unsafe condition"]
        
    ai_auto_route_threshold = float(os.environ.get("AI_AUTO_ROUTE_THRESHOLD", 0.85))
    ai_review_threshold = float(os.environ.get("AI_REVIEW_THRESHOLD", 0.55))
    
    decision = "AUTO_ROUTE"
    requiresHumanReview = False
    
    if priority == "EMERGENCY":
        decision = "EMERGENCY_REVIEW"
        requiresHumanReview = True
    elif confidence >= ai_auto_route_threshold:
        decision = "AUTO_ROUTE"
    elif confidence >= ai_review_threshold:
        decision = "HUMAN_REVIEW"
        requiresHumanReview = True
    else:
        decision = "ABSTAIN"
        requiresHumanReview = True
        
    if len(top3) > 1 and (top3[0]["score"] - top3[1]["score"]) < 0.08:
        decision = "HUMAN_REVIEW"
        requiresHumanReview = True

    preds = [Prediction(departmentCode=r["dept"], taxonomyCode=r["code"], confidence=r["score"]) for r in top3]

    return AnalyzeResponse(
        grievanceId=req.grievanceId,
        taxonomyCode=best["code"],
        departmentCode=best["dept"],
        confidence=confidence,
        priority=priority,
        priorityReason=priorityReason,
        urgentReasons=urgentReasons,
        explanation="Matched based on semantic similarity.",
        topPredictions=preds,
        decision=decision,
        requiresHumanReview=requiresHumanReview
    )
""")

# --- BACKEND SPRING BOOT ---
# pom.xml
create_file("backend/pom.xml", """
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
        <relativePath/>
    </parent>
    <groupId>com.janseva</groupId>
    <artifactId>backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>backend</name>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.11.5</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.11.5</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.11.5</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk15on</artifactId>
            <version>1.70</version>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
""")

create_file("backend/src/main/resources/application.yml", """
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/janseva}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    baseline-on-migrate: true

janseva:
  security:
    jwt-secret: ${JWT_SECRET:supersecretkey32byteslongmin1234}
    encryption-key: ${ENCRYPTION_KEY:12345678901234567890123456789012}
  ai:
    url: ${AI_CLASSIFIER_URL:http://localhost:8000/analyze}
  upload:
    dir: ${UPLOAD_DIRECTORY:./uploads}
""")

create_file("backend/src/main/resources/db/migration/V1__init_taxonomy.sql", """
CREATE TABLE taxonomy (
    code VARCHAR(64) PRIMARY KEY,
    department VARCHAR(64) NOT NULL,
    description TEXT
);

INSERT INTO taxonomy (code, department, description) VALUES
('ROADS.POTHOLE', 'ROADS', 'Potholes on the road, broken roads, accident risk'),
('SANITATION.SEWER', 'SANITATION', 'Sewer overflow, drainage issue, garbage on street'),
('ELECTRICITY.OUTAGE', 'ELECTRICITY', 'Power cut, no electricity, broken wire, sparking'),
('WATER.NO_SUPPLY', 'WATER', 'No water supply, dirty water, pipeline leak'),
('PUBLIC_SERVICES.OTHER', 'PUBLIC_SERVICES', 'Other general public service issues');
""")

create_file("backend/src/main/resources/db/migration/V2__team_a_additions.sql", """
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(160),
    email VARCHAR(320) UNIQUE NOT NULL,
    phone_cipher TEXT,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) NOT NULL,
    department_code VARCHAR(64),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE refresh_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash CHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by UUID,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE grievances (
    id UUID PRIMARY KEY,
    tracking_code VARCHAR(32) UNIQUE NOT NULL,
    citizen_id UUID REFERENCES users(id),
    assigned_officer_id UUID REFERENCES users(id),
    exact_location_cipher TEXT,
    public_latitude NUMERIC(9,6),
    public_longitude NUMERIC(9,6),
    sla_due_at TIMESTAMPTZ,
    status VARCHAR(40) NOT NULL,
    priority VARCHAR(40) NOT NULL,
    department_code VARCHAR(64),
    taxonomy_code VARCHAR(64),
    confidence NUMERIC(5,4),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    grievance_id UUID REFERENCES grievances(id),
    uploaded_by UUID REFERENCES users(id),
    original_name_cipher TEXT NOT NULL,
    stored_name VARCHAR(160) UNIQUE NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY,
    grievance_id UUID REFERENCES grievances(id),
    actor_id UUID,
    event_type VARCHAR(64) NOT NULL,
    old_status VARCHAR(40),
    new_status VARCHAR(40),
    public_message VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    grievance_id UUID REFERENCES grievances(id),
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);
""")

create_file("backend/src/main/java/com/janseva/JanSevaApplication.java", """
package com.janseva;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class JanSevaApplication {
    public static void main(String[] args) {
        SpringApplication.run(JanSevaApplication.class, args);
    }
}
""")

print("Scaffolding complete.")
