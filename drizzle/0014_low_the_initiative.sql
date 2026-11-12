ALTER TABLE "projects" ADD COLUMN "campaigns_title" varchar(120);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "campaigns" jsonb DEFAULT '[]'::jsonb NOT NULL;