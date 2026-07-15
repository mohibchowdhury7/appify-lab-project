import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Keep the 50,000 most recent public posts
const KEEP_POSTS = 50000;

async function main() {
  // ─── Check current counts ───
  const [userCount, postCount, likeCount, commentCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.postLike.count(),
    prisma.comment.count(),
  ]);

  console.log("Before cleanup:");
  console.log(`  Users:    ${userCount.toLocaleString()}`);
  console.log(`  Posts:    ${postCount.toLocaleString()}`);
  console.log(`  Likes:    ${likeCount.toLocaleString()}`);
  console.log(`  Comments: ${commentCount.toLocaleString()}`);

  if (postCount <= KEEP_POSTS) {
    console.log(`\nOnly ${postCount} posts — nothing to trim.`);
    return;
  }

  // ─── Find the cutoff: keep the KEEP_POSTS most recent ───
  const cutoffPost = await prisma.post.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: KEEP_POSTS - 1,
    select: { createdAt: true, id: true },
  });

  if (!cutoffPost) {
    console.log("No cutoff post found.");
    return;
  }

  console.log(`\nCutoff: posts older than ${cutoffPost.createdAt.toISOString()} (id < ${cutoffPost.id}) will be deleted.`);

  // ─── Delete in batches to avoid transaction timeout ───
  const toDelete = postCount - KEEP_POSTS;
  console.log(`Deleting ~${toDelete.toLocaleString()} posts...`);

  let deletedPosts = 0;
  const BATCH = 5000;

  while (true) {
    // Cascade deletes comments + likes via Prisma schema relations
    const result = await prisma.post.deleteMany({
      where: {
        OR: [
          { createdAt: { lt: cutoffPost.createdAt } },
          {
            createdAt: cutoffPost.createdAt,
            id: { lt: cutoffPost.id },
          },
        ],
      },
    });

    if (result.count === 0) break;
    deletedPosts += result.count;
    console.log(`  Deleted ${deletedPosts.toLocaleString()} / ${toDelete.toLocaleString()} posts`);
  }

  // ─── Clean up orphaned data (safety net) ───
  console.log("\nCleaning up orphaned likes...");
  const orphanLikes = await prisma.postLike.deleteMany({
    where: {
      post: null as any, // won't exist if the post was cascade-deleted elsewhere
    },
  });
  console.log(`  Removed ${orphanLikes.count} orphaned likes`);

  console.log("\nCleaning up orphaned comments...");
  const orphanComments = await prisma.comment.deleteMany({
    where: {
      post: null as any,
    },
  });
  console.log(`  Removed ${orphanComments.count} orphaned comments`);

  // ─── Remove extra users (keep only demo users + 500 others) ───
  const demoEmails = ["alice@example.com", "bob@example.com", "carol@example.com"];
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true },
  });
  const demoIds = demoUsers.map((u) => u.id);

  const extraUsers = await prisma.user.count({
    where: { id: { notIn: demoIds } },
  });

  if (extraUsers > 500) {
    const usersToDelete = extraUsers - 500;
    console.log(`\nRemoving ${usersToDelete.toLocaleString()} extra users...`);
    const usersToRemove = await prisma.user.findMany({
      where: { id: { notIn: demoIds } },
      select: { id: true },
      skip: 500, // keep 500 random users
      take: usersToDelete,
    });
    const ids = usersToRemove.map((u) => u.id);

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await prisma.user.deleteMany({ where: { id: { in: batch } } });
      console.log(`  Removed ${Math.min(i + BATCH, ids.length)} / ${ids.length} users`);
    }
  }

  // ─── Final counts ───
  const [finalUsers, finalPosts, finalLikes, finalComments] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.postLike.count(),
    prisma.comment.count(),
  ]);

  console.log("\n✅ Cleanup complete!");
  console.log(`  Users:    ${finalUsers.toLocaleString()}`);
  console.log(`  Posts:    ${finalPosts.toLocaleString()}`);
  console.log(`  Likes:    ${finalLikes.toLocaleString()}`);
  console.log(`  Comments: ${finalComments.toLocaleString()}`);

  // Clean up refresh tokens too
  const deletedTokens = await prisma.refreshToken.deleteMany();
  console.log(`  Refresh tokens flushed: ${deletedTokens.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
