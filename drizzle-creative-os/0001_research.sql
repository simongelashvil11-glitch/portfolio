CREATE TABLE "creative_os"."audience_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"operation_id" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"persona_name" varchar(160) NOT NULL,
	"situation" text NOT NULL,
	"primary_problem" text NOT NULL,
	"secondary_problems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"desired_transformation" text NOT NULL,
	"emotional_motivations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"beliefs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"previous_solutions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"buying_triggers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevant_benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_messaging" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_formats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"awareness_stage" varchar(20) DEFAULT 'unclear' NOT NULL,
	"supporting_insight_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_note" text,
	"focus" boolean DEFAULT false NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."awareness_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"segment_id" integer,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"dominant_stage" varchar(20) NOT NULL,
	"dominant_reasoning" text NOT NULL,
	"sophistication_level" varchar(8) NOT NULL,
	"sophistication_reasoning" text NOT NULL,
	"stages" jsonb NOT NULL,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."competitor_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"competitor_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"website" varchar(500),
	"facebook_url" varchar(500),
	"instagram_url" varchar(500),
	"tiktok_url" varchar(500),
	"kind" varchar(12) DEFAULT 'direct' NOT NULL,
	"status" varchar(12) DEFAULT 'tracked' NOT NULL,
	"discovery" jsonb,
	"discovered_by_operation_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."customer_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer,
	"competitor_id" integer,
	"operation_id" integer,
	"category" varchar(32) NOT NULL,
	"statement" text NOT NULL,
	"is_quote" boolean DEFAULT false NOT NULL,
	"quote_check" varchar(12) NOT NULL,
	"interpretation" text,
	"source_url" varchar(1000),
	"source_seen" boolean DEFAULT false NOT NULL,
	"source_id" integer,
	"subject" varchar(200),
	"confidence" varchar(8) NOT NULL,
	"evidence_strength" varchar(10) NOT NULL,
	"frequency_note" text,
	"bookmarked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."market_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."product_research" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"operation_id" integer,
	"model" varchar(64) NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_os"."sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"url" varchar(1000) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"title" varchar(500),
	"category" varchar(24) NOT NULL,
	"access_status" varchar(16) NOT NULL,
	"access_error" varchar(64),
	"published" varchar(80),
	"content" text,
	"operation_id" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_os"."audience_segments" ADD CONSTRAINT "audience_segments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."audience_segments" ADD CONSTRAINT "audience_segments_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."awareness_analyses" ADD CONSTRAINT "awareness_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."awareness_analyses" ADD CONSTRAINT "awareness_analyses_segment_id_audience_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "creative_os"."audience_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."awareness_analyses" ADD CONSTRAINT "awareness_analyses_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."competitor_profiles" ADD CONSTRAINT "competitor_profiles_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "creative_os"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."competitor_profiles" ADD CONSTRAINT "competitor_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."competitor_profiles" ADD CONSTRAINT "competitor_profiles_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."competitors" ADD CONSTRAINT "competitors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."competitors" ADD CONSTRAINT "competitors_discovered_by_operation_id_ai_operations_id_fk" FOREIGN KEY ("discovered_by_operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."customer_insights" ADD CONSTRAINT "customer_insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."customer_insights" ADD CONSTRAINT "customer_insights_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "creative_os"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."customer_insights" ADD CONSTRAINT "customer_insights_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "creative_os"."competitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."customer_insights" ADD CONSTRAINT "customer_insights_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."customer_insights" ADD CONSTRAINT "customer_insights_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "creative_os"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."market_analyses" ADD CONSTRAINT "market_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."market_analyses" ADD CONSTRAINT "market_analyses_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."product_research" ADD CONSTRAINT "product_research_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."product_research" ADD CONSTRAINT "product_research_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "creative_os"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."product_research" ADD CONSTRAINT "product_research_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."sources" ADD CONSTRAINT "sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "creative_os"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_os"."sources" ADD CONSTRAINT "sources_operation_id_ai_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "creative_os"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audience_segments_project_idx" ON "creative_os"."audience_segments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "awareness_analyses_project_idx" ON "creative_os"."awareness_analyses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "competitor_profiles_competitor_idx" ON "creative_os"."competitor_profiles" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "competitors_project_idx" ON "creative_os"."competitors" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "customer_insights_project_idx" ON "creative_os"."customer_insights" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "customer_insights_search_idx" ON "creative_os"."customer_insights" USING gin (to_tsvector('simple', coalesce("statement", '') || ' ' || coalesce("interpretation", '')));--> statement-breakpoint
CREATE INDEX "market_analyses_project_idx" ON "creative_os"."market_analyses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "product_research_product_idx" ON "creative_os"."product_research" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_project_url_idx" ON "creative_os"."sources" USING btree ("project_id","url");--> statement-breakpoint
CREATE INDEX "sources_project_idx" ON "creative_os"."sources" USING btree ("project_id");