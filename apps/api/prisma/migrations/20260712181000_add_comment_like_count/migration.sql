ALTER TABLE "Comment" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Comment" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Comment" SET "likeCount" = (SELECT COUNT(*) FROM "CommentLike" WHERE "CommentLike"."commentId" = "Comment"."id");
UPDATE "Comment" SET "replyCount" = (SELECT COUNT(*) FROM "Comment" c2 WHERE c2."parentId" = "Comment"."id");
