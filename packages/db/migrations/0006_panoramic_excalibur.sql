ALTER TABLE "users" ALTER COLUMN "presence_sharing" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "presence_sharing" SET DEFAULT 'everyone'::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile_photo_visibility" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile_photo_visibility" SET DEFAULT 'everyone'::text;--> statement-breakpoint
UPDATE "users" SET "presence_sharing" = 'contacts' WHERE "presence_sharing" = 'friends';--> statement-breakpoint
UPDATE "users" SET "profile_photo_visibility" = 'contacts' WHERE "profile_photo_visibility" = 'friends';--> statement-breakpoint
DROP TYPE "public"."presence_sharing";--> statement-breakpoint
CREATE TYPE "public"."presence_sharing" AS ENUM('everyone', 'contacts', 'nobody');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "presence_sharing" SET DEFAULT 'everyone'::"public"."presence_sharing";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "presence_sharing" SET DATA TYPE "public"."presence_sharing" USING "presence_sharing"::"public"."presence_sharing";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile_photo_visibility" SET DEFAULT 'everyone'::"public"."presence_sharing";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile_photo_visibility" SET DATA TYPE "public"."presence_sharing" USING "profile_photo_visibility"::"public"."presence_sharing";
