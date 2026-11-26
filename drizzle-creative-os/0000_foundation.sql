CREATE SCHEMA IF NOT EXISTS "creative_os";
--> statement-breakpoint
CREATE TABLE "creative_os"."ad_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"overview" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."ad_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"media_type" varchar(32) NOT NULL,
	"size" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."ad_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" integer NOT NULL,
	"position" integer NOT NULL,
	"source" varchar(12) NOT NULL,
	"original_text" text NOT NULL,
	"start_char" integer,
	"end_char" integer,
	"element" varchar(40) NOT NULL,
	"strategic_purpose" text NOT NULL,
	"psychological_principle" text NOT NULL,
	"strengths" text NOT NULL,
	"weaknesses" text NOT NULL,
	"improvement" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(300) NOT NULL,
	"advertiser" varchar(200),
	"platform" varchar(40),
	"product_category" varchar(160),
	"source_url" varchar(1000),
	"format" varchar(60),
	"ad_copy" text,
	"transcript" text,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."ai_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"project_id" integer,
	"target_type" varchar(32),
	"target_id" integer,
	"model" varchar(64) NOT NULL,
	"effort" varchar(12),
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(16) NOT NULL,
	"estimate_low_usd" double precision NOT NULL,
	"estimate_high_usd" double precision NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cache_read_tokens" integer,
	"cache_write_tokens" integer,
	"web_search_requests" integer,
	"web_fetch_requests" integer,
	"cost_usd" double precision,
	"stop_reason" varchar(32),
	"error" text,
	"authorized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "creative_os"."assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"client" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"instructions" text,
	"product_info" text,
	"reference_ads" text,
	"deliverables" text,
	"deadline" date,
	"evaluation_criteria" text,
	"notes" text,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" varchar(60) NOT NULL,
	"entity" varchar(40) NOT NULL,
	"entity_id" integer,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "creative_os"."knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."knowledge_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer,
	"kind" varchar(32) NOT NULL,
	"title" varchar(300) NOT NULL,
	"source_type" varchar(8) NOT NULL,
	"source_url" varchar(1000),
	"file_name" varchar(300),
	"content" text NOT NULL,
	"char_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."pricing" (
	"model" varchar(64) PRIMARY KEY NOT NULL,
	"label" varchar(80) NOT NULL,
	"input_per_mtok" double precision NOT NULL,
	"output_per_mtok" double precision NOT NULL,
	"cache_write_per_mtok" double precision NOT NULL,
	"cache_read_per_mtok" double precision NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."products" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"url" varchar(500),
	"price" varchar(80),
	"offer" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"brand_name" varchar(160),
	"website" varchar(500),
	"industry" varchar(160),
	"target_countries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_audience" text,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objectives" text,
	"brand_voice" text,
	"client_instructions" text,
	"approved_claims" text,
	"prohibited_claims" text,
	"known_competitors" text,
	"notes" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"monthly_limit_usd" double precision,
	"per_operation_limit_usd" double precision,
	"web_search_per_1k" double precision DEFAULT 10 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_os"."ad_analyses" ADD CONSTRAINT "ad_analyses_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "creative_os"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."ad_analyses" ADD CONSTRAINT "ad_analyses_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."ad_images" ADD CONSTRAINT "ad_images_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "creative_os"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."ad_segments" ADD CONSTRAINT "ad_segments_analysis_id_ad_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "creative_os"."ad_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD CONSTRAINT "ads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."ai_operations" ADD CONSTRAINT "ai_operations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."assignments" ADD CONSTRAINT "assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_item_id_knowledge_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "creative_os"."knowledge_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."knowledge_items" ADD CONSTRAINT "knowledge_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."knowledge_items" ADD CONSTRAINT "knowledge_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "creative_os"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."products" ADD CONSTRAINT "products_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_analyses_ad_idx" ON "creative_os"."ad_analyses" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "ad_images_ad_idx" ON "creative_os"."ad_images" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "ad_segments_analysis_idx" ON "creative_os"."ad_segments" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "ads_project_idx" ON "creative_os"."ads" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_operations_idempotency_idx" ON "creative_os"."ai_operations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_operations_project_idx" ON "creative_os"."ai_operations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_operations_authorized_idx" ON "creative_os"."ai_operations" USING btree ("authorized_at");--> statement-breakpoint
CREATE INDEX "ai_operations_target_idx" ON "creative_os"."ai_operations" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "assignments_status_idx" ON "creative_os"."assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "creative_os"."audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_item_idx" ON "creative_os"."knowledge_chunks" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_project_idx" ON "creative_os"."knowledge_chunks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_search_idx" ON "creative_os"."knowledge_chunks" USING gin (to_tsvector('simple', "content"));--> statement-breakpoint
CREATE INDEX "knowledge_items_project_idx" ON "creative_os"."knowledge_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "products_project_idx" ON "creative_os"."products" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "creative_os"."projects" USING btree ("status");