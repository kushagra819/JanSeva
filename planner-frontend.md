# JanSeva AI — Team B Frontend, Maps and Integration Plan

## 1. Mission

Team B must deliver the complete browser experience for citizens, officers and administrators:

- Registration and login
- Citizen complaint submission
- GPS capture, interactive map and evidence selection
- Explainable AI result display
- Complaint history, tracking timeline and notifications
- Officer operational queue
- Routing, assignment and status controls
- Staff issue map and analytics
- Minimal staff-account administration
- Accessible responsive behavior
- Production frontend container and frontend tests

The total hackathon window is four hours. Team B has three hours of parallel development and must remain available during the final one-hour merge and acceptance period.

The goal is a polished, reliable hackathon MVP. Do not spend time creating screens for deferred features before the complete citizen-to-officer journey works.

## 2. Current Codebase and Boundaries

The current workspace contains:

```text
backend/      Canonical Spring Boot API
ai-service/   Canonical Python AI provider
webapp/       Legacy Node/SQLite prototype
```

There is no canonical React application yet. Team B must create:

```text
frontend/
```

The new frontend must use:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- React Leaflet
- Vitest and React Testing Library

Team B owns:

```text
frontend/
frontend Dockerfile
frontend Nginx configuration
frontend tests
frontend environment variables
```

Team B must not modify Java backend behavior or database migrations. Contract defects must be reported immediately to Team A.

The existing `webapp/` may be inspected for workflow and styling ideas, but it must not be imported, connected to SQLite, or deployed. The final browser application must communicate only with the Spring API.

## 3. Team Split

### Developer B1 — Citizen Experience and Authentication

Own:

1. React application shell and responsive navigation.
2. Authentication state and protected routes.
3. Citizen registration and login.
4. Complaint submission form.
5. GPS capture, location states and map pin.
6. Evidence selection, preview and upload.
7. AI result confirmation.
8. My Complaints, tracking timeline and notifications.

### Developer B2 — Staff, Administration, Maps and Analytics

Own:

1. Officer dashboard shell.
2. Department queue and filters.
3. Complaint review and AI explanation.
4. Assignment, route correction and status controls.
5. Staff issue map.
6. Analytics summary.
7. Minimal administrator user-provisioning screen.
8. Frontend tests, production build and Nginx container.

Both developers commit independently to `team-b-frontend-ui`. Developer B2 owns conflicts within Team B and the production frontend build.

## 4. Required User Journeys

### Citizen

```text
Register
  -> Sign in
  -> Submit multilingual complaint
  -> Capture or pin location
  -> Attach optional evidence
  -> View AI classification and explanation
  -> Save tracking code
  -> View My Complaints
  -> Open complaint timeline
  -> Receive staff-update notification
```

### Officer

```text
Sign in
  -> View department queue
  -> Filter urgent or pending-review complaints
  -> Open complaint and evidence
  -> Inspect AI recommendation and alternatives
  -> Confirm or correct route
  -> Assign officer
  -> Update status with public note
  -> View issue on map
```

### Administrator

```text
Sign in
  -> Create officer or department-head account
  -> Set department
  -> View recent audit actions
```

Department Head and Commissioner roles can reuse the staff shell for the hackathon. Department Head has department-wide operational access; Commissioner has citywide read-only map and analytics access.

## 5. Frontend Structure

Create a feature-oriented structure:

```text
frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── grievances.ts
│   │   ├── staff.ts
│   │   └── admin.ts
│   ├── components/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── grievance/
│   │   ├── map/
│   │   └── ui/
│   ├── features/
│   │   ├── auth/
│   │   ├── citizen/
│   │   ├── staff/
│   │   ├── admin/
│   │   └── analytics/
│   ├── hooks/
│   ├── pages/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── Dockerfile
├── nginx.conf
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

Do not introduce Redux. Use TanStack Query for server data and a small authentication context for session state.

## 6. Routes and Screens

### Public routes

```text
/                     Landing and service explanation
/register             Citizen registration
/login                All-role login
```

### Citizen routes

```text
/citizen               Citizen home
/citizen/submit        Complaint submission
/citizen/complaints    My Complaints
/citizen/complaints/:id Complaint detail and timeline
/citizen/notifications Notification centre
```

### Staff routes

```text
/staff                 Operational queue
/staff/complaints/:id  Complaint review
/staff/map             Issue map
/staff/analytics       Department/city analytics
```

### Administration

```text
/admin/users           Staff provisioning
/admin/audit           Recent audit activity
```

Unknown routes show a useful Not Found screen. Unauthorized routes redirect to the appropriate home page and show a short explanation.

## 7. Frozen Shared Types

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

Allowed staff actions must be derived from:

```text
PENDING_REVIEW -> ROUTED | REJECTED
ROUTED         -> IN_PROGRESS | REJECTED
IN_PROGRESS    -> ROUTED | RESOLVED
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

## 8. Frozen API Contract

The API client must parse the standard error shape:

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

Use metadata returned by the API for departments, taxonomy, statuses and thresholds. Do not duplicate user-facing category descriptions in multiple components.

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

Submission order:

1. Generate an idempotency key with `crypto.randomUUID()`.
2. Submit the complaint JSON.
3. Call the analyze endpoint.
4. If an attachment was selected, upload it as multipart data.
5. Navigate to the complaint result page.

Disable the submit button while the request is active. Retrying must reuse the same idempotency key until the submission succeeds or the form is reset.

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

### Notifications and administration

```text
GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
POST  /api/v1/admin/users
GET   /api/v1/admin/users
GET   /api/v1/admin/audit
```

### AI analysis type

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

## 9. Authentication UX

- Keep the access token in memory and restore a session using the refresh endpoint.
- Never display tokens or put them in URLs.
- On a single 401 response, attempt one refresh and retry the original request.
- If refresh fails, clear session state and navigate to login.
- Do not create an infinite refresh loop.
- Show a generic invalid-credentials message.
- Preserve the intended protected route after login when safe.
- Role navigation is convenience only; the backend remains authoritative.

## 10. Citizen Experience

### Registration

Fields:

- Full name
- Email
- Optional phone
- Password
- Confirm password

Show password requirements before submission. Map backend field errors to the correct control.

### Complaint form

Fields:

- Complaint details, 10–10,000 characters
- Language with Auto Detect default
- District
- Locality or landmark
- GPS/map location
- Optional JPEG, PNG, WebP or PDF evidence

Behavior:

- Permit all supported Indian Unicode scripts.
- Do not trim internal spacing or modify the citizen's wording.
- If geolocation is denied, allow manual map pin or submission without coordinates.
- Show selected coordinates in a human-readable form.
- Show evidence filename, size and preview when possible.
- Block files larger than 10 MB before upload.
- Warn citizens that emergency situations should also be reported to the appropriate emergency service.

### AI result

Display:

- Tracking code
- Predicted department and category
- Confidence as percentage and accessible text
- Priority badge
- Routing explanation
- Priority explanation
- Top three possible departments
- Human-review notice
- Model/provider disclosure in a collapsed details panel

Never say that AI made a final government decision. Use “AI recommendation” and “routing suggestion.”

### My Complaints and detail

- List tracking code, short redacted summary, department, priority, status and submitted time.
- Sort newest first.
- Provide clear empty and loading states.
- Timeline must distinguish system, citizen and staff events.
- Notifications link directly to the related complaint.

## 11. Officer Experience

### Queue

Display:

- Tracking code
- Redacted complaint summary
- Department
- Priority
- Current status
- AI confidence
- Submitted time
- SLA risk when returned by the backend

Filters:

- Search by tracking code or visible complaint text
- Status
- Priority
- Department where role permits

Default sort order:

1. Emergency
2. High priority
3. Oldest unresolved

### Complaint review

Display:

- Original complaint for authorized staff
- Citizen contact only when the API authorizes it
- Exact staff location and map marker
- Evidence preview/download
- AI category and department
- Confidence and top candidates
- Priority and urgent reasons
- Human-review reason
- Timeline

Actions:

- Confirm AI route
- Correct department/category with mandatory reason
- Assign an officer
- Change status using only valid next statuses
- Add a citizen-visible status note

Disable action controls while saving and refresh the complaint after success.

## 12. Map and Analytics

### Staff map

Use React Leaflet.

Marker colors:

```text
EMERGENCY red
HIGH      amber
NORMAL    blue
```

Filters:

- Department
- Priority
- Status

Popup contents:

- Tracking code
- Department/category
- Priority
- Status
- Open Complaint link

Do not put access tokens in tile URLs. Handle missing coordinates by omitting the marker, not by inventing a location.

### Analytics

Required cards:

- Total complaints
- Pending review
- In progress
- Resolved
- Emergency/high priority

Required breakdowns:

- By department
- By status
- By priority

Use accessible HTML/CSS bars or a lightweight chart library already approved by the team. Do not spend more than 20 minutes on chart customization.

## 13. Frontend Security and Accessibility

- Never use `dangerouslySetInnerHTML` for API content.
- Treat all complaint and audit text as untrusted.
- Do not log tokens, citizen details or complete API responses.
- Validate forms with Zod before sending.
- Show backend errors without exposing stack traces.
- Use semantic headings, labels and buttons.
- Keep keyboard focus visible.
- Add an accessible label to every icon-only control.
- Maintain sufficient color contrast.
- Provide text in addition to priority colors.
- Announce submission and mutation results through an ARIA live region.
- Support widths down to 360 px.

## 14. Mocking Rules

Team B may temporarily mock the frozen contract during the first two hours.

Rules:

- Keep mocks behind `VITE_USE_MOCKS=true`.
- Mock only API responses, not application business logic.
- Use the exact frozen field names and enums.
- Default `.env.example` to `VITE_USE_MOCKS=false`.
- Disable mocks before the 03:00 handoff.
- No fake complaint, account or analytics data may appear in the production build.

## 15. Four-Hour Execution Schedule

### 00:00–00:15 — Contract freeze

Developer B1:

- Confirm authentication and citizen DTOs with Team A.
- Define shared role and complaint types.

Developer B2:

- Confirm staff, AI, map and analytics DTOs.
- Confirm standard error behavior.

Gate:

- Type definitions match Team A's Java DTOs.
- API paths and enums are frozen.

### 00:15–01:00 — Foundations

Developer B1:

- Scaffold React, TypeScript, Vite and Tailwind.
- Create application layout and authentication context.
- Implement register, login and protected routes.

Developer B2:

- Create API client and error normalization.
- Create staff layout and queue shell.
- Configure Vitest and reusable UI states.

Gate at 01:00:

- Application builds.
- Login/register screens work against the available API or contract mocks.
- Citizen and staff routes enforce role navigation.

### 01:00–01:50 — Main screens

Developer B1:

- Build complaint form.
- Add GPS and draggable map pin.
- Add attachment preview.
- Build AI result screen.

Developer B2:

- Build staff queue and filters.
- Build complaint review.
- Display explainability and evidence.

Gate at 01:50:

- Citizen submission flow renders the full AI result.
- Officer can open a complaint from the queue.

### 01:50–02:35 — Complete workflows

Developer B1:

- Build My Complaints, complaint detail and timeline.
- Build notification centre.
- Finish network, geolocation and empty states.

Developer B2:

- Add route, assignment and status forms.
- Build staff map and analytics.
- Build minimal admin user creation.

Gate at 02:35:

- Complete citizen and officer journeys work against the frozen contract.
- Map and analytics use API data.

### 02:35–03:00 — Production build and handoff

Developer B1:

- Complete mobile and accessibility pass.
- Run citizen component tests.
- Verify all mocks are disabled.

Developer B2:

- Add production Dockerfile and Nginx proxy.
- Run TypeScript, build and staff tests.
- Produce the Team B handoff note.

Gate at 03:00:

- Production build passes.
- No mock operational data remains.
- Team B branch is committed with exact hash.

### 03:00–04:00 — Merge and acceptance

- Connect to the merged real backend.
- Fix request/response mismatches.
- Verify all role journeys.
- Fix only integration defects and critical usability failures.
- Do not add new features.

## 16. Required Frontend Tests

### Authentication

- Registration maps field errors correctly.
- Login stores session state and routes by role.
- Protected route redirects an anonymous visitor.
- Failed refresh clears the session.
- Citizen cannot navigate to staff screens through UI controls.

### Citizen flow

- Complaint form validates length.
- GPS denied state remains usable.
- Submit button prevents duplicate clicks.
- AI result renders department, confidence, priority and explanation.
- Human-review warning appears when required.
- Attachment size/type validation works.
- Timeline displays events in chronological order.

### Staff flow

- Queue filters update the request.
- Emergency items display text and color indicators.
- Route correction requires a reason.
- Invalid status action is not shown.
- Successful status update refreshes complaint details.
- Missing map coordinates do not crash the map.

### Security and resilience

- API content is rendered as text, not HTML.
- Standard errors show a readable message.
- Network failure shows retry controls.
- Empty collections show purposeful empty states.
- Unknown route shows Not Found.

## 17. Environment Contract

```text
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCKS=false
```

The production Nginx container must proxy:

```text
/api/      -> http://api:8080/api/
/actuator/ -> http://api:8080/actuator/
```

All other routes must fall back to `index.html` so browser refresh works with React Router.

## 18. Team B Handoff

Before the 03:00 merge, provide:

```text
Branch:
Commit hash:
Completed screens:
Required frontend environment variables:
API paths exercised:
Tests and build results:
Known limitations:
Skipped tests:
Mock status: disabled/removed
```

The branch is not ready if the production build fails or mocks remain enabled.

## 19. Definition of Done

- [ ] React/TypeScript production build passes.
- [ ] Registration, login and logout work.
- [ ] Protected routes work for every role.
- [ ] Citizen can submit a multilingual complaint.
- [ ] GPS denial and manual pinning are handled.
- [ ] Evidence selection and upload work.
- [ ] AI explainability is displayed completely.
- [ ] My Complaints and timeline work.
- [ ] Notifications work.
- [ ] Officer queue, filters and complaint review work.
- [ ] Route, assignment and status controls work.
- [ ] Staff map and analytics use real API data.
- [ ] Admin can create an officer.
- [ ] Mobile layout is usable at 360 px.
- [ ] No fake complaints or production mocks remain.
- [ ] Frontend tests pass.
- [ ] Handoff commit is ready by 03:00.

## 20. Final Integration and Demo

After both branches are merged, the application must run through one Compose stack:

```powershell
docker compose -f compose.yml -f compose.ai.yml up --build -d
docker compose ps
docker compose logs --tail 100 api
docker compose logs --tail 100 ai
```

Target URLs after final Compose integration:

```text
Application: http://localhost:8080
Swagger API: http://localhost:8081/docs
```

Final demonstration:

1. Administrator creates an officer account.
2. Citizen registers and submits a pothole complaint with a real selected location.
3. AI recommends Roads, shows confidence and explains the route.
4. Officer opens the department queue and starts the complaint.
5. Citizen sees the new timeline entry and notification.
6. Staff map and analytics reflect the complaint.
7. Citizen submits an exposed-wire complaint.
8. AI marks it Emergency and requires human review.
9. Containers restart without losing data.

Never run `docker compose down -v` after real data has been entered.
