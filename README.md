# JanSeva AI

JanSeva is a runnable grievance-management MVP with a React citizen/staff interface, Spring Boot API, PostgreSQL persistence, encrypted complaint/evidence storage, explainable routing, notifications, analytics, and role-based workflows.

## Quick start

Prerequisite: Docker Desktop must show **Engine running**.

```powershell
cd C:\Users\Kumud\Desktop\JanSeva\JanSeva
docker compose up --build -d
docker compose ps
```

Open `http://localhost:3000`.

The default stack uses the built-in explainable multilingual heuristic classifier so the first run is fast and deterministic. To enable the larger Sentence Transformer service:

```powershell
$env:AI_PROVIDER="http"
docker compose --profile ai up --build -d
```

## Local administrator

For local demonstration, Compose creates the bootstrap administrator from these environment variables:

- `ADMIN_EMAIL` (default `admin@janseva.gov`)
- `ADMIN_PASSWORD` (default `Admin123!@#pass`)

Set unique values before starting any shared environment:

```powershell
$env:ADMIN_EMAIL="admin@your-municipality.gov.in"
$env:ADMIN_PASSWORD="Use-A-Unique-Long-Password-123!"
$env:JWT_SECRET="replace-with-at-least-32-random-characters"
$env:ENCRYPTION_KEY="replace-with-exactly-32-characters"
docker compose up --build -d
```

## Verification

```powershell
cd backend
mvn test
cd ..\frontend
npm run build
```

Stop without deleting data:

```powershell
docker compose down
```

Do not use `docker compose down -v` if the volumes contain real data.

## Roles and flows

- Citizen: register, submit multilingual complaint, add a pin/evidence, view AI routing, timeline, and notifications.
- Officer: review the scoped queue, verify/correct AI routes, and update valid workflow states.
- Department Head: officer functions plus assignment and department analytics.
- Commissioner: citywide queue, privacy-safe map, and analytics.
- Admin: citywide operations plus staff provisioning and audit activity.

This is a hackathon/pilot MVP. Public deployment still requires the security, privacy, backup, MFA, malware-scanning, TLS, and penetration-testing gates listed in the product plan.
