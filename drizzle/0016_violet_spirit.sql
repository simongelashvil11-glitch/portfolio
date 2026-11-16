CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(300) NOT NULL,
	"country" varchar(2),
	"region" varchar(80),
	"city" varchar(120),
	"ip" varchar(64),
	"referrer" varchar(300),
	"device" varchar(16),
	"browser" varchar(40),
	"os" varchar(40),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visits_created_at_idx" ON "visits" USING btree ("created_at");