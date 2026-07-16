# JanSeva AI — Team A Backend, AI, Data and Security Plan

## 1. Mission

Team A must deliver the secure application core used by the citizen and staff interfaces:

- Identity and role-based access
- PostgreSQL persistence and Flyway migrations
- Complaint intake, tracking and workflow
- Explainable multilingual AI analysis
- Department routing and human review
- Secure evidence upload
- Notifications and audit history
- Staff map and analytics APIs
- Automated backend and AI tests

The total hackathon window is four hours. Team A has three hours of parallel development and must remain available during the final one-hour merge and acceptance period.

The goal is a demonstrable, end-to-end MVP. It is not a certified public-production government deployment.

## 2. Current Codebase and Boundaries

Build on the code already present in this workspace:

```text
backend/      Spring Boot 3.5, Java 17, JPA, Flyway and PostgreSQL
ai-service/   Python HTTP AI provider
compose.yml   PostgreSQL and Spring API
```

Existing capabilities that must be preserved:

- Grievance intake with idempotency support
- Flyway-managed PostgreSQL schema
- Governed department and issue taxonomy
- Provider-neutral classifier interface
- Explainable heuristic fallback
- Optional HTTP AI provider
- Confidence-based auto-route, review and abstention decisions
- Emergency human-review gate
- Routing decisions, review tasks, audit events and outbox events
- Basic analytics summary
- OpenAPI/Swagger support

Team A owns:

```text
backend/
ai-service/
backend database migrations
backend and AI tests
backend-related environment variables
```

Team A must not modify `frontend/`.

The existing `webapp/` Node/SQLite application is reference material only. Do not connect it to the Spring database, copy its SQLite repository into the backend, or deploy it in the final Compose stack.

## 3. Team Split

### Developer A1 — Identity, Persistence and Security

Own the following vertical slice:

1. Database migrations for users, sessions, attachments, timeline events and notifications.
2. Citizen registration and authentication.
3. JWT access and rotating refresh sessions.
4. Role and department authorization.
5. Citizen ownership checks.
6. Encryption of sensitive complaint fields and uploaded evidence.
7. Secure file validation and retrieval.
8. Administrator bootstrap and staff provisioning.

### Developer A2 — AI, Routing and Operational APIs

Own the following vertical slice:

1. Multilingual embedding classifier.
2. Priority detection and human-review rules.
3. Explainability and top-three predictions.
4. Complaint tracking code and lifecycle services.
5. Officer queue, assignment, routing correction and status APIs.
6. Notifications and public timeline creation.
7. Staff map and analytics APIs.
8. AI and workflow tests.

Both developers must commit independently to `team-a-backend-ai`. Developer A1 owns conflict resolution inside Team A.

## 4. Scope Priorities

### Required

- Citizen registration, login, refresh, logout and current-user lookup
- Roles: Citizen, Officer, Department Head, Admin and Commissioner
- Department-scoped officer access
- Complaint creation linked to the authenticated citizen
- Unique citizen-facing tracking code
- Multilingual department classification
- Priority and emergency detection
- Confidence, explanation, top predictions and model version
- Mandatory human review for emergency or uncertain predictions
- Complaint list, detail and timeline
- Staff queue, assignment, route correction and status transition
- In-app notifications
- Image/PDF upload with validation, hashing and encrypted storage
- Staff issue-map endpoint
- Real-database analytics summary
- Audit records for security-sensitive and workflow actions
- Health checks
- Tests for critical paths

### Only if all required acceptance tests pass

- Similar historical complaint response
- Citizen satisfaction feedback
- Public privacy-safe map
- CSV analytics export
- De-identified model-feedback export

### Explicitly deferred

- Custom model fine-tuning
- OCR and server-side speech transcription
- Generative summarization
- SMS, email and WhatsApp delivery
- Master-incident merging
- Forecasting
- MFA, malware scanning and penetration testing
- Kubernetes, Kafka, Redis and distributed workers

## 5. Frozen Data Contract

Do not change these values after the first 15 minutes without approval from both team leads.

### Roles

```text
CITIZEN
OFFICER
DEPARTMENT_HEAD
ADMIN
COMMISSIONER
```

### Complaint statuses

```text
RECEIVED
PROCESSING
PENDING_REVIEW
ROUTED
IN_PROGRESS
RESOLVED
REJECTED
```

Allowed transitions:

```text
RECEIVED       -> PROCESSING
PROCESSING     -> PENDING_REVIEW | ROUTED
PENDING_REVIEW -> ROUTED | REJECTED
ROUTED         -> IN_PROGRESS | REJECTED
IN_PROGRESS    -> ROUTED | RESOLVED
RESOLVED       -> no transition in the MVP
REJECTED       -> no transition in the MVP
```

### Priorities

```text
NORMAL
HIGH
EMERGENCY
```

### Departments

```text
ELECTRICITY
WATER
ROADS
SANITATION
PUBLIC_SERVICES
```

### Channels

```text
WEB
MOBILE
CALL_CENTRE
EMAIL
```

## 6. Database Changes

Create one new Flyway migration after the existing taxonomy migration. Do not edit migrations that may already have run.

### Users

Required fields:

```text
id UUID primary key
name varchar(160)
email varchar(320) unique, normalized to lowercase
phone_cipher text nullable
password_hash text
role varchar(32)
department_code varchar(64) nullable
active boolean
created_at timestamptz
updated_at timestamptz
```

Only staff roles may contain `department_code`. Admin and Commissioner may be citywide. Officer and Department Head access must be department-scoped.

### Refresh sessions

```text
id UUID primary key
user_id UUID foreign key
token_hash char(64) unique
expires_at timestamptz
revoked_at timestamptz nullable
replaced_by UUID nullable
created_at timestamptz
```

Never store a raw refresh token.

### Grievance additions

Add:

```text
tracking_code varchar(32) unique not null
citizen_id UUID nullable foreign key
assigned_officer_id UUID nullable foreign key
exact_location_cipher text nullable
public_latitude numeric(9,6) nullable
public_longitude numeric(9,6) nullable
sla_due_at timestamptz nullable
```

For newly submitted citizen complaints:

- Encrypt exact latitude/longitude together as JSON.
- Store coordinates rounded to two decimal places in the public coordinate columns.
- Preserve the original redacted text for AI and authorized display.
- Store the original complaint text as AES-GCM ciphertext in the existing text storage or a new ciphertext column.

### Attachments

```text
id UUID primary key
grievance_id UUID foreign key
uploaded_by UUID foreign key
original_name_cipher text
stored_name varchar(160) unique
mime_type varchar(120)
size_bytes bigint
sha256 char(64)
created_at timestamptz
```

The physical file must be encrypted before it is written to the evidence volume.

### Timeline events

```text
id UUID primary key
grievance_id UUID foreign key
actor_id UUID nullable
event_type varchar(64)
old_status varchar(40) nullable
new_status varchar(40) nullable
public_message varchar(1000) nullable
created_at timestamptz
```

### Notifications

```text
id UUID primary key
user_id UUID foreign key
grievance_id UUID nullable foreign key
title varchar(200)
message varchar(1000)
read_at timestamptz nullable
created_at timestamptz
```

## 7. Authentication and Security Behavior

### Passwords

- Hash with Argon2id.
- Minimum 12 characters.
- Require upper-case, lower-case, number and symbol.
- Never log passwords or raw tokens.

### Tokens

- Access token lifetime: 15 minutes.
- Refresh session lifetime: 7 days.
- JWT contains user ID, role and optional department code.
- Rotate the refresh token on every successful refresh.
- Revoke the active refresh session on logout.
- Use a randomly generated 32-byte or stronger secret from `JWT_SECRET`.

### Authorization rules

- Citizen: create and read only their own complaints, timeline, attachments and notifications.
- Officer: read and update only complaints routed to their department.
- Department Head: officer capabilities plus department-wide assignment.
- Admin: staff provisioning and audit access.
- Commissioner: citywide read-only analytics and map access.
- Backend authorization is mandatory even when frontend navigation hides a feature.

### Encryption

- Use AES-256-GCM with a key supplied through `ENCRYPTION_KEY`.
- Generate a random nonce per encrypted value.
- Store a version prefix with ciphertext so future rotation is possible.
- Decryption failure must return a controlled server error and an audit event; never return corrupted plaintext.

### File validation

Allowed MVP formats:

```text
image/jpeg
image/png
image/webp
application/pdf
```

Rules:

- Default maximum size: 10 MB.
- Validate MIME declaration and magic bytes.
- Discard the user-provided path.
- Generate the stored filename server-side.
- Calculate SHA-256 before encryption.
- Require complaint ownership or authorized staff access before download.
- Send `X-Content-Type-Options: nosniff`.

## 8. Frozen API Contract

All errors use:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Please correct the highlighted fields.",
  "fieldErrors": {
    "text": "Complaint must contain at least 10 characters."
  },
  "traceId": "request-correlation-id"
}
```

Authenticated requests use:

```http
Authorization: Bearer <access-token>
```

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### Metadata

```text
GET /api/v1/meta
```

Return roles needed by the UI, department codes, categories, statuses, priorities and confidence thresholds.

### Citizen complaints

```text
POST /api/v1/grievances
GET  /api/v1/grievances/mine
GET  /api/v1/grievances/{id}
POST /api/v1/grievances/{id}/analyze
GET  /api/v1/grievances/{id}/analysis
POST /api/v1/grievances/{id}/attachments
GET  /api/v1/grievances/{id}/timeline
```

Complaint submission stays JSON. The frontend creates the complaint, calls the analyze endpoint, then uploads evidence separately as multipart data.

### Staff operations

```text
GET   /api/v1/staff/grievances
POST  /api/v1/grievances/{id}/review
PATCH /api/v1/staff/grievances/{id}/assign
PATCH /api/v1/staff/grievances/{id}/status
GET   /api/v1/staff/map/issues
GET   /api/v1/analytics/summary
```

Staff list query parameters:

```text
status
priority
departmentCode
query
limit
```

Ignore a caller-supplied department filter when it exceeds the caller's authorization.

### Notifications and administration

```text
GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
POST  /api/v1/admin/users
GET   /api/v1/admin/users
GET   /api/v1/admin/audit
```

### AI analysis response

```json
{
  "grievanceId": "uuid",
  "provider": "sentence-transformer",
  "modelVersion": "multilingual-minilm-v1",
  "taxonomyCode": "ROADS.POTHOLE",
  "departmentCode": "ROADS",
  "confidence": 0.87,
  "priority": "HIGH",
  "priorityReason": "The complaint indicates an accident risk.",
  "urgentReasons": ["unsafe road condition"],
  "explanation": "The complaint is most similar to the governed pothole category.",
  "topPredictions": [
    {
      "departmentCode": "ROADS",
      "taxonomyCode": "ROADS.POTHOLE",
      "confidence": 0.87
    },
    {
      "departmentCode": "SANITATION",
      "taxonomyCode": "SANITATION.SEWER",
      "confidence": 0.08
    },
    {
      "departmentCode": "PUBLIC_SERVICES",
      "taxonomyCode": "PUBLIC_SERVICES.OTHER",
      "confidence": 0.05
    }
  ],
  "decision": "AUTO_ROUTE",
  "requiresHumanReview": false
}
```

## 9. AI Implementation

Use:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

Implementation rules:

1. Load the model once during AI-service startup.
2. Embed governed taxonomy name, description and keywords once and cache the vectors.
3. Embed the redacted complaint.
4. Calculate cosine similarity against all active taxonomy nodes.
5. Convert scores into normalized top-candidate confidence values.
6. Return the top three candidates.
7. Detect priority using explicit multilingual safety phrases and context rules.
8. Keep the original complaint wording; do not translate silently.
9. Record provider and model version for every prediction.
10. Fall back to the current heuristic provider if the HTTP model is unavailable.

Routing decision:

```text
EMERGENCY priority                         -> EMERGENCY_REVIEW
confidence >= AI_AUTO_ROUTE_THRESHOLD     -> AUTO_ROUTE
confidence >= AI_REVIEW_THRESHOLD         -> HUMAN_REVIEW
confidence below AI_REVIEW_THRESHOLD      -> ABSTAIN
top-two score difference below 0.08       -> HUMAN_REVIEW
```

Default thresholds:

```text
AI_AUTO_ROUTE_THRESHOLD=0.85
AI_REVIEW_THRESHOLD=0.55
```

Do not train a custom model during the hackathon. Officer route corrections may be recorded for later governed training.

## 10. Four-Hour Execution Schedule

### 00:00–00:15 — Contract freeze

Developer A1:

- Confirm migration names and authentication DTOs.
- Confirm token claims with Team B.

Developer A2:

- Confirm AI response and staff workflow DTOs.
- Confirm enums and error response with Team B.

Gate:

- API contract is frozen.
- Both frontend developers have matching TypeScript shapes.

### 00:15–01:00 — Foundations

Developer A1:

- Add migrations.
- Implement user repository and password service.
- Implement register, login, refresh and current-user APIs.
- Add JWT authentication filter and role helpers.

Developer A2:

- Update AI provider response.
- Implement MiniLM taxonomy similarity.
- Implement top predictions and priority explanation.
- Add AI unit tests.

Gate at 01:00:

- New database migration succeeds.
- Citizen can register and log in by API.
- AI health and classification endpoints return the frozen shape.

### 01:00–01:50 — Citizen vertical slice

Developer A1:

- Link complaints to citizens.
- Generate tracking codes.
- Add encryption service.
- Implement ownership checks and file upload.

Developer A2:

- Complete complaint analysis lifecycle.
- Add My Complaints and timeline APIs.
- Create initial timeline and notification events.

Gate at 01:50:

- Authenticated citizen submits one real complaint.
- Complaint analysis returns department, priority, confidence and explanation.
- Citizen can retrieve the complaint and timeline.

### 01:50–02:35 — Staff operations

Developer A1:

- Add department and role guards.
- Add notification read operation.
- Add admin staff creation.
- Audit authentication and staff mutations.

Developer A2:

- Add staff queue filters.
- Add assignment, review and status transitions.
- Add staff map and analytics endpoints.
- Notify citizen after visible staff actions.

Gate at 02:35:

- Officer sees only their department.
- Officer can assign, confirm route and update status.
- Citizen receives a notification and timeline update.

### 02:35–03:00 — Verification and handoff

Developer A1:

- Run security and authorization tests.
- Verify no secret or PII is logged.
- Produce migration and environment handoff notes.

Developer A2:

- Run AI and workflow tests.
- Verify map privacy and analytics.
- Produce endpoint and model handoff notes.

Gate at 03:00:

- Team A branch is committed.
- Handoff note includes exact commit hash.
- No known critical test failure remains.

### 03:00–04:00 — Merge and acceptance

- Support the integration owner during merge.
- Fix only integration defects and critical regressions.
- Do not add features.
- Complete the full citizen-to-officer acceptance test.

## 11. Required Tests

### Authentication

- Register valid citizen.
- Reject duplicate email.
- Reject weak password.
- Authenticate valid credentials.
- Reject invalid credentials without revealing whether an email exists.
- Refresh rotates the session.
- Logout revokes the session.
- Expired access token is rejected.

### Authorization

- Citizen cannot access another citizen's complaint.
- Officer cannot access another department.
- Citizen cannot use staff or admin endpoints.
- Officer cannot create another staff account.
- Commissioner analytics access is read-only.

### Complaint and AI

- Reject complaint shorter than 10 characters.
- Idempotency key returns the original complaint.
- Normal complaint is routed or reviewed according to confidence.
- Electrical hazard becomes `EMERGENCY` and requires review.
- Analysis contains three predictions and model version.
- AI-service failure activates the explainable fallback.

### Files and privacy

- Reject oversized evidence.
- Reject mismatched extension and magic bytes.
- Reject unauthorized evidence download.
- Public/map response contains no citizen identity, contact or complaint body.
- Exact coordinates are not returned in public output.

### Workflow

- Reject invalid status transition.
- Route correction creates routing, timeline and audit records.
- Status change creates a citizen notification.
- Database restart preserves complaint and workflow records.

## 12. Environment Contract

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
ENCRYPTION_KEY
ADMIN_EMAIL
ADMIN_PASSWORD
AI_PROVIDER
AI_CLASSIFIER_URL
AI_CLASSIFIER_API_KEY
AI_AUTO_ROUTE_THRESHOLD
AI_REVIEW_THRESHOLD
UPLOAD_DIRECTORY
MAX_UPLOAD_MB
CORS_ALLOWED_ORIGINS
```

Do not commit actual secrets.

## 13. Team A Handoff

Before the 03:00 merge, create a handoff message containing:

```text
Branch:
Commit hash:
Completed endpoints:
Migration added:
Required environment variables:
Model and cache requirements:
Tests run and results:
Known limitations:
Skipped tests:
```

The branch is not ready for merge if the commit hash or migration instructions are missing.

## 14. Definition of Done

- [ ] Spring application compiles.
- [ ] Flyway migration succeeds from an empty PostgreSQL database.
- [ ] Register, login, refresh and logout work.
- [ ] RBAC and department isolation work.
- [ ] Citizen complaint ownership works.
- [ ] Sensitive data and evidence are encrypted.
- [ ] AI returns all explainability fields.
- [ ] Emergency and low-confidence results require review.
- [ ] Staff assignment, route and status APIs work.
- [ ] Notifications and timeline work.
- [ ] Map and analytics APIs use real data.
- [ ] No fake complaints are seeded.
- [ ] Critical automated tests pass.
- [ ] Handoff commit is ready by 03:00.

## 15. Integration Commands

Run from the repository root after Team A is merged:

```powershell
docker compose -f compose.yml -f compose.ai.yml build api ai
docker compose -f compose.yml -f compose.ai.yml up -d postgres ai api
docker compose ps
docker compose logs --tail 100 api
docker compose logs --tail 100 ai
```

Backend test command:

```powershell
Set-Location backend
mvn test
Set-Location ..
```

Never use `docker compose down -v` after real complaints have been entered.