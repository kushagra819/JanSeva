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
