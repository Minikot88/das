-- PostgreSQL compares CHAR columns through a text cast in Prisma's prepared
-- lookups, which prevents the unique token-hash indexes from being selected.
-- VARCHAR keeps the stored hashes unchanged and makes equality indexable.
ALTER TABLE "auth_sessions" ALTER COLUMN "token_hash" TYPE VARCHAR(64);
ALTER TABLE "password_reset_tokens" ALTER COLUMN "token_hash" TYPE VARCHAR(64);
ALTER TABLE "invitations" ALTER COLUMN "token_hash" TYPE VARCHAR(64);
ALTER TABLE "dashboard_share_links" ALTER COLUMN "token_hash" TYPE VARCHAR(64);
