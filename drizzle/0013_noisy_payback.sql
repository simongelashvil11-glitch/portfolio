ALTER TABLE "projects" ADD COLUMN "stats_title" varchar(120);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stats_note" varchar(200);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stats" jsonb DEFAULT '[]'::jsonb NOT NULL;