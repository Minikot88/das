-- Application metadata only. External source schemas are never managed by Prisma.
ALTER TABLE "datasets" ADD COLUMN "source_config_json" JSONB;
