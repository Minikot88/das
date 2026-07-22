-- Extend the existing user profile without replacing the applied PostgreSQL baseline.
ALTER TABLE "user_profiles" ADD COLUMN "normalized_email" VARCHAR(191);
UPDATE "user_profiles" SET "normalized_email" = lower(btrim("email"));
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "user_profiles" GROUP BY "normalized_email" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot enable production authentication: duplicate normalized user email';
  END IF;
END $$;
ALTER TABLE "user_profiles" ALTER COLUMN "normalized_email" SET NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN "email_verified_at" TIMESTAMPTZ(3);
ALTER TABLE "user_profiles" ADD COLUMN "disabled_at" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "uq_user_profiles_normalized_email" ON "user_profiles"("normalized_email");

CREATE TABLE "user_credentials" (
  "id" VARCHAR(64) NOT NULL,
  "user_id" VARCHAR(64) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "password_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_user_credentials_user" ON "user_credentials"("user_id");

CREATE TABLE "auth_sessions" (
  "id" VARCHAR(64) NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "user_id" VARCHAR(64) NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "csrf_token_hash" CHAR(64) NOT NULL,
  "idle_expires_at" TIMESTAMPTZ(3) NOT NULL,
  "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
  "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3),
  "ip_hash" CHAR(64),
  "user_agent_hash" CHAR(64),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_auth_sessions_token_hash" ON "auth_sessions"("token_hash");
CREATE INDEX "idx_auth_sessions_user_active" ON "auth_sessions"("user_id", "revoked_at", "created_at");
CREATE INDEX "idx_auth_sessions_expiry" ON "auth_sessions"("idle_expires_at", "absolute_expires_at");

CREATE TABLE "password_reset_tokens" (
  "id" VARCHAR(64) NOT NULL,
  "user_id" VARCHAR(64) NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "used_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_password_reset_tokens_hash" ON "password_reset_tokens"("token_hash");
CREATE INDEX "idx_password_reset_tokens_user" ON "password_reset_tokens"("user_id", "created_at");

CREATE TABLE "invitations" (
  "id" VARCHAR(64) NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "project_id" VARCHAR(64),
  "email" VARCHAR(191) NOT NULL,
  "normalized_email" VARCHAR(191) NOT NULL,
  "role" VARCHAR(32) NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "created_by" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_invitations_token_hash" ON "invitations"("token_hash");
CREATE INDEX "idx_invitations_org_email" ON "invitations"("organization_id", "normalized_email", "created_at");

CREATE TABLE "organization_members" (
  "id" VARCHAR(64) NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "user_id" VARCHAR(64) NOT NULL,
  "role" VARCHAR(32) NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_organization_members_org_user" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "idx_organization_members_user" ON "organization_members"("user_id", "organization_id");

CREATE TABLE "authentication_audit_logs" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" VARCHAR(64),
  "user_id" VARCHAR(64),
  "request_id" VARCHAR(64) NOT NULL,
  "event" VARCHAR(80) NOT NULL,
  "outcome" VARCHAR(32) NOT NULL,
  "ip_hash" CHAR(64),
  "metadata_json" JSONB,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "authentication_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_authentication_audit_org_time" ON "authentication_audit_logs"("organization_id", "occurred_at", "id");
CREATE INDEX "idx_authentication_audit_user_time" ON "authentication_audit_logs"("user_id", "occurred_at", "id");

-- Preserve legacy data: one initial organization admin per organization and project ownership memberships.
INSERT INTO "organization_members" ("id", "organization_id", "user_id", "role", "created_at", "updated_at")
SELECT 'org-member-' || md5("organization_id" || ':' || "id"), "organization_id", "id",
  CASE WHEN row_number() OVER (PARTITION BY "organization_id" ORDER BY "created_at", "id") = 1 THEN 'organization_admin' ELSE 'member' END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "user_profiles"
ON CONFLICT ("organization_id", "user_id") DO NOTHING;

INSERT INTO "bi_project_members" ("id", "organization_id", "project_id", "user_id", "role")
SELECT 'member-' || md5("id" || ':' || "owner_user_id"), "organization_id", "id", "owner_user_id", 'project_owner'
FROM "bi_projects"
ON CONFLICT ("project_id", "user_id") DO UPDATE SET "role" = 'project_owner';

ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "authentication_audit_logs" ADD CONSTRAINT "authentication_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "authentication_audit_logs" ADD CONSTRAINT "authentication_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
