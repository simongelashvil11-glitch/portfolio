ALTER TABLE "creative_os"."ads" ADD COLUMN "video_url" varchar(2000);--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "video_seconds" double precision;--> statement-breakpoint
ALTER TABLE "creative_os"."ads" ADD COLUMN "transcript_source" varchar(12);--> statement-breakpoint
ALTER TABLE "creative_os"."settings" ADD COLUMN "auto_transcribe" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creative_os"."settings" ADD COLUMN "transcription_per_hour" double precision DEFAULT 0.2 NOT NULL;