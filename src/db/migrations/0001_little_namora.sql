ALTER TABLE "photos" DROP CONSTRAINT "photos_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "photos" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;