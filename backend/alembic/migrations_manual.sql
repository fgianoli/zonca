-- Manual migrations for features: events, maintenance, ical token
-- Apply with: psql -U <user> -d <db> -f migrations_manual.sql

-- ============================================================
-- User: ical_token
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS ical_token VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_ical_token ON users (ical_token);

-- ============================================================
-- Events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    date_start TIMESTAMPTZ NOT NULL,
    date_end TIMESTAMPTZ,
    location VARCHAR(200),
    description TEXT,
    max_participants INTEGER,
    requires_registration BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_reg UNIQUE (event_id, member_id)
);

-- ============================================================
-- Maintenances
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenances (
    id SERIAL PRIMARY KEY,
    boat_id INTEGER NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC(10, 2),
    performed_by VARCHAR(200),
    next_check_date DATE,
    finance_record_id INTEGER REFERENCES finance_records(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
