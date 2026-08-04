CREATE TABLE "dashboard_core"."oidc_login_transactions" (
  "id" varchar(64) PRIMARY KEY,
  "state_hash" char(64) NOT NULL,
  "return_path" varchar(500) NOT NULL,
  "expires_at" timestamptz(3) NOT NULL,
  "consumed_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "uq_oidc_login_transactions_state_hash"
  ON "dashboard_core"."oidc_login_transactions" ("state_hash");

CREATE INDEX "idx_oidc_login_transactions_expiry"
  ON "dashboard_core"."oidc_login_transactions" ("expires_at", "consumed_at");
