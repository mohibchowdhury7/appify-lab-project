-- AlterTable
ALTER TABLE "Post" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "commentCount" INTEGER NOT NULL DEFAULT 0;

-- Seed counts from existing data
UPDATE "Post" SET "likeCount" = (SELECT COUNT(*) FROM "PostLike" WHERE "PostLike"."postId" = "Post"."id");
UPDATE "Post" SET "commentCount" = (SELECT COUNT(*) FROM "Comment" WHERE "Comment"."postId" = "Post"."id");

-- Composite index for feed cursor pagination (visibility filter + tie-breaking sort)
CREATE INDEX "Post_visibility_createdAt_id_idx" ON "Post"("visibility", "createdAt" DESC, "id" DESC);
