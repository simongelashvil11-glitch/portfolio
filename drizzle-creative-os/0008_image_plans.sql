CREATE TABLE "creative_os"."image_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"script_id" integer,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"tool" varchar(24) NOT NULL,
	"format" varchar(24) NOT NULL,
	"result" jsonb NOT NULL,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_os"."image_plans" ADD CONSTRAINT "image_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."image_plans" ADD CONSTRAINT "image_plans_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "creative_os"."scripts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."image_plans" ADD CONSTRAINT "image_plans_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_plans_project_idx" ON "creative_os"."image_plans" USING btree ("project_id");