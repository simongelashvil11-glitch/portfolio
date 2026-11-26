CREATE TABLE "creative_os"."angles" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"operation_id" integer,
	"product_id" integer,
	"segment_id" integer,
	"name" varchar(200) NOT NULL,
	"category" varchar(32) NOT NULL,
	"hypothesis" text NOT NULL,
	"audience" text,
	"awareness_stage" varchar(20) DEFAULT 'unclear' NOT NULL,
	"pain_point" text,
	"desire" text,
	"motivation" text,
	"core_message" text NOT NULL,
	"product_benefit" text,
	"customer_evidence" text,
	"evidence_insight_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_format" text,
	"potential_hooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proof_requirements" text,
	"weaknesses" text,
	"testing_recommendation" text,
	"status" varchar(12) DEFAULT 'idea' NOT NULL,
	"notes" text,
	"edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."briefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"script_id" integer,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"audience" varchar(20) NOT NULL,
	"result" jsonb NOT NULL,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."hooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"operation_id" integer,
	"angle_id" integer,
	"segment_id" integer,
	"product_id" integer,
	"text" text NOT NULL,
	"category" varchar(24) NOT NULL,
	"awareness_stage" varchar(20) DEFAULT 'unclear' NOT NULL,
	"trigger" text,
	"supporting_research" text,
	"evidence_insight_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visual_opening" text,
	"format" varchar(120),
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"bookmarked" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."script_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"sections" jsonb NOT NULL,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."script_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"number" integer NOT NULL,
	"source" varchar(12) NOT NULL,
	"label" varchar(200),
	"sections" jsonb NOT NULL,
	"note" text,
	"operation_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer,
	"segment_id" integer,
	"angle_id" integer,
	"hook_id" integer,
	"title" varchar(200) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"platform" varchar(40),
	"format" varchar(60),
	"framework" varchar(32) DEFAULT 'freeform' NOT NULL,
	"awareness_stage" varchar(20),
	"duration_seconds" integer,
	"language" varchar(40) DEFAULT 'English' NOT NULL,
	"offer" text,
	"cta" varchar(200),
	"instructions" text,
	"working" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_os"."angles" ADD CONSTRAINT "angles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."angles" ADD CONSTRAINT "angles_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."angles" ADD CONSTRAINT "angles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "creative_os"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."angles" ADD CONSTRAINT "angles_segment_id_audience_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "creative_os"."audience_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."briefs" ADD CONSTRAINT "briefs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."briefs" ADD CONSTRAINT "briefs_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "creative_os"."scripts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."briefs" ADD CONSTRAINT "briefs_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."hooks" ADD CONSTRAINT "hooks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."hooks" ADD CONSTRAINT "hooks_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."hooks" ADD CONSTRAINT "hooks_angle_id_angles_id_fk" FOREIGN KEY ("angle_id") REFERENCES "creative_os"."angles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."hooks" ADD CONSTRAINT "hooks_segment_id_audience_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "creative_os"."audience_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."hooks" ADD CONSTRAINT "hooks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "creative_os"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."script_reviews" ADD CONSTRAINT "script_reviews_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "creative_os"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."script_reviews" ADD CONSTRAINT "script_reviews_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."script_versions" ADD CONSTRAINT "script_versions_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "creative_os"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."script_versions" ADD CONSTRAINT "script_versions_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."scripts" ADD CONSTRAINT "scripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."scripts" ADD CONSTRAINT "scripts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "creative_os"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."scripts" ADD CONSTRAINT "scripts_segment_id_audience_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "creative_os"."audience_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."scripts" ADD CONSTRAINT "scripts_angle_id_angles_id_fk" FOREIGN KEY ("angle_id") REFERENCES "creative_os"."angles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."scripts" ADD CONSTRAINT "scripts_hook_id_hooks_id_fk" FOREIGN KEY ("hook_id") REFERENCES "creative_os"."hooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "angles_project_idx" ON "creative_os"."angles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "briefs_project_idx" ON "creative_os"."briefs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "hooks_project_idx" ON "creative_os"."hooks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "hooks_angle_idx" ON "creative_os"."hooks" USING btree ("angle_id");--> statement-breakpoint
CREATE INDEX "script_reviews_script_idx" ON "creative_os"."script_reviews" USING btree ("script_id");--> statement-breakpoint
CREATE INDEX "script_versions_script_idx" ON "creative_os"."script_versions" USING btree ("script_id");--> statement-breakpoint
CREATE INDEX "scripts_project_idx" ON "creative_os"."scripts" USING btree ("project_id");