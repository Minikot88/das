-- Preserve the newest outstanding reset per user before enforcing the invariant.
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "user_id" ORDER BY "created_at" DESC, "id" DESC) AS position
  FROM "password_reset_tokens"
  WHERE "used_at" IS NULL AND "revoked_at" IS NULL
)
UPDATE "password_reset_tokens" AS token
SET "revoked_at" = CURRENT_TIMESTAMP
FROM ranked
WHERE token."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "uq_password_reset_tokens_one_active_user"
ON "password_reset_tokens" ("user_id")
WHERE "used_at" IS NULL AND "revoked_at" IS NULL;
