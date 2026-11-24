ALTER TABLE "visits" ADD COLUMN "network" varchar(120);--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "asn" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "cloud" boolean;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "utm_source" varchar(100);--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "utm_medium" varchar(100);--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "utm_campaign" varchar(100);--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "screen" varchar(16);--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "lang" varchar(35);