ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_locale" text DEFAULT 'zh-TW' NOT NULL;
