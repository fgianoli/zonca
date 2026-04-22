-- Manual migration v2: crews, gallery, email templates, invoices, gdpr
-- Apply with: psql -U <user> -d <db> -f migrations_manual_v2.sql

-- ============================================================
-- Crews
-- ============================================================
CREATE TABLE IF NOT EXISTS crews (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    default_slot VARCHAR(5),
    pope_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_members (
    crew_id INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_hint VARCHAR(20),
    PRIMARY KEY (crew_id, member_id)
);

-- ============================================================
-- Photo Gallery
-- ============================================================
CREATE TABLE IF NOT EXISTS photo_albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date DATE,
    cover_photo_id INTEGER,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    album_id INTEGER NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(500),
    caption VARCHAR(500),
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deferred FK for album cover (circular reference)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_album_cover_photo'
    ) THEN
        ALTER TABLE photo_albums
            ADD CONSTRAINT fk_album_cover_photo
            FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- Email Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    key VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    available_vars TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    number VARCHAR(30) NOT NULL UNIQUE,
    date DATE NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_fiscal_code VARCHAR(20),
    recipient_address TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    payment_method VARCHAR(50),
    fee_id INTEGER REFERENCES fees(id) ON DELETE SET NULL,
    finance_record_id INTEGER REFERENCES finance_records(id) ON DELETE SET NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    pdf_path VARCHAR(500),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GDPR Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email_snapshot VARCHAR(255) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
