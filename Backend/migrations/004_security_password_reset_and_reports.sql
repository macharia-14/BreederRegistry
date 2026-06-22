-- Phase 8: security, password reset, and reporting support
-- Safe to run multiple times on PostgreSQL.

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_breeder ON password_reset_tokens(breeder_id);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at);

-- Ensure audit log indexes exist for production review and threat tracing.
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
