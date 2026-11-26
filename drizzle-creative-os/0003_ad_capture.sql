ALTER TABLE "creative_os"."ads" ADD COLUMN "source" varchar(16) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "competitor_id" integer;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "library_id" varchar(40);--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "started_running" date;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "still_active" boolean;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "variations" integer;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "cta" varchar(60);--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "landing_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "media_kind" varchar(12);--> statement-breakpoint
ALTER TABLE "creative_os"."settings" ADD COLUMN "capture_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "creative_os"."settings" ADD COLUMN "capture_token_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creative_os"."settings" ADD COLUMN "capture_token_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD CONSTRAINT "ads_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "creative_os"."competitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ads_project_library_idx" ON "creative_os"."ads" USING btree ("project_id","library_id");--> statement-breakpoint
CREATE INDEX "ads_competitor_idx" ON "creative_os"."ads" USING btree ("competitor_id");