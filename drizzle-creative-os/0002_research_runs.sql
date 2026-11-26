CREATE TABLE "creative_os"."research_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"operation_id" integer,
	"kind" varchar(40) NOT NULL,
	"target_id" integer,
	"model" varchar(64) NOT NULL,
	"summary" text,
	"queries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_counts" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_os"."research_runs" ADD CONSTRAINT "research_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."research_runs" ADD CONSTRAINT "research_runs_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_runs_project_kind_idx" ON "creative_os"."research_runs" USING btree ("project_id","kind");