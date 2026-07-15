-- CreateIndex
CREATE INDEX "CommentLike_commentId_createdAt_idx" ON "CommentLike"("commentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PostLike_postId_createdAt_idx" ON "PostLike"("postId", "createdAt" DESC);
