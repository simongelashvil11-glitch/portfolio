CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" text,
	"description" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);
