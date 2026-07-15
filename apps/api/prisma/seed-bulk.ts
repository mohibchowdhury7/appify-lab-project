import "dotenv/config";
import { PrismaClient, PostVisibility } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const prisma = new PrismaClient();

// ─── CONFIG ───
const TOTAL_POSTS = 5000;
const TOTAL_USERS = 500;
const BATCH_SIZE = 5000;
const COMMENT_PROBABILITY = 0.3; // 30% of posts get a comment
const LIKE_PROBABILITY = 0.5; // 50% of posts get at least 1 like
const MAX_LIKES_PER_POST = 15;
const DAYS_BACK = 365; // Posts spread over the past year

const POST_TEXTS = [
  "Just deployed a new feature! 🚀",
  "Working on something exciting... stay tuned!",
  "Beautiful day for coding ☀️",
  "Coffee and code — name a better duo ☕",
  "TypeScript is love, TypeScript is life 💙",
  "Another day, another bug fixed 🐛",
  "Ship it! 🚢",
  "Refactoring legacy code... pray for me 🙏",
  "Prisma makes database work so much easier",
  "NestJS + React = ❤️",
  "Weekend side project coming along nicely",
  "Learning Rust this month — wish me luck 🦀",
  "The best error message is no error message",
  "Tabs > Spaces. Fight me.",
  "Dark mode everything 🌙",
];

function randomText(): string | null {
  const r = Math.random();
  if (r < 0.1) return null; // 10% image-only posts
  if (r < 0.2) return POST_TEXTS[Math.floor(Math.random() * POST_TEXTS.length)];
  return POST_TEXTS[Math.floor(Math.random() * POST_TEXTS.length)];
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(past);
}

async function main() {
  const passwordHash = await bcrypt.hash("testpass123", 12);

  // ─── Step 1: Create users ───
  console.log(`Creating ${TOTAL_USERS} users...`);
  const users: string[] = [];

  // Keep the 3 demo users if they exist, otherwise create them
  const existingUsers = await prisma.user.findMany({ select: { id: true } });
  users.push(...existingUsers.map((u) => u.id));

  const neededUsers = TOTAL_USERS - users.length;
  if (neededUsers > 0) {
    const userBatches = Math.ceil(neededUsers / BATCH_SIZE);
    for (let b = 0; b < userBatches; b++) {
      const batchUsers = Array.from(
        { length: Math.min(BATCH_SIZE, neededUsers - b * BATCH_SIZE) },
        (_, i) => ({
          id: uuid(),
          firstName: `User${b * BATCH_SIZE + i + 1}`,
          lastName: `Test`,
          email: `user${b * BATCH_SIZE + i + 1}@test.com`,
          passwordHash,
          avatarUrl: null,
        })
      );
      await prisma.user.createMany({ data: batchUsers, skipDuplicates: true });
      batchUsers.forEach((u) => users.push(u.id));
      console.log(`  Users: ${users.length}/${TOTAL_USERS}`);
    }
  }

  // ─── Step 2: Generate posts in batches ───
  console.log(`\nGenerating ${TOTAL_POSTS.toLocaleString()} posts...`);
  const postBatches = Math.ceil(TOTAL_POSTS / BATCH_SIZE);

  for (let b = 0; b < postBatches; b++) {
    const batchSize = Math.min(BATCH_SIZE, TOTAL_POSTS - b * BATCH_SIZE);
    const posts = Array.from({ length: batchSize }, () => {
      const authorId = users[Math.floor(Math.random() * users.length)];
      const isPrivate = Math.random() < 0.05; // 5% private posts
      const createdAt = randomDate(DAYS_BACK);
      return {
        id: uuid(),
        authorId,
        text: randomText(),
        imageUrl: null,
        visibility: isPrivate ? PostVisibility.PRIVATE : PostVisibility.PUBLIC,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await prisma.post.createMany({ data: posts });
    console.log(
      `  Posts: ${((b + 1) * BATCH_SIZE).toLocaleString()}/${TOTAL_POSTS.toLocaleString()}`
    );
  }

  // ─── Step 3: Generate likes ───
  console.log("\nGenerating likes...");
  const allPosts = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const postIds = allPosts.map((p) => p.id);

  let likeCount = 0;
  const likeBatches = Math.ceil(postIds.length / BATCH_SIZE);
  for (let b = 0; b < likeBatches; b++) {
    const batch = postIds.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const likes: { id: string; userId: string; postId: string }[] = [];
    const usedPairs = new Set<string>();

    for (const postId of batch) {
      if (Math.random() > LIKE_PROBABILITY) continue;
      const numLikes = Math.ceil(Math.random() * MAX_LIKES_PER_POST);
      for (let i = 0; i < numLikes; i++) {
        const userId = users[Math.floor(Math.random() * users.length)];
        const pairKey = `${userId}|${postId}`;
        if (usedPairs.has(pairKey)) continue;
        usedPairs.add(pairKey);
        likes.push({ id: uuid(), userId, postId });
      }
    }

    if (likes.length > 0) {
      await prisma.postLike.createMany({ data: likes, skipDuplicates: true });
      likeCount += likes.length;
    }
    console.log(`  Likes processed: ${(b * BATCH_SIZE + batch.length).toLocaleString()}/${postIds.length.toLocaleString()} posts`);
  }
  console.log(`  Total likes created: ${likeCount.toLocaleString()}`);

  // ─── Step 4: Generate comments ───
  console.log("\nGenerating comments...");
  let commentCount = 0;
  const commentBatches = Math.ceil(postIds.length / BATCH_SIZE);
  for (let b = 0; b < commentBatches; b++) {
    const batch = postIds.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const comments: { id: string; postId: string; authorId: string; text: string; createdAt: Date; updatedAt: Date }[] = [];

    for (const postId of batch) {
      if (Math.random() > COMMENT_PROBABILITY) continue;
      const numComments = Math.ceil(Math.random() * 5);
      for (let i = 0; i < numComments; i++) {
        const authorId = users[Math.floor(Math.random() * users.length)];
        const createdAt = randomDate(DAYS_BACK);
        comments.push({
          id: uuid(),
          postId,
          authorId,
          text: "Great post! 👏",
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    if (comments.length > 0) {
      await prisma.comment.createMany({ data: comments });
      commentCount += comments.length;
    }
    console.log(`  Comments processed: ${(b * BATCH_SIZE + batch.length).toLocaleString()}/${postIds.length.toLocaleString()} posts`);
  }
  console.log(`  Total comments created: ${commentCount.toLocaleString()}`);

  // ─── Step 5: Backfill counter columns ───
  console.log("\nBackfilling post counters...");
  await prisma.$executeRawUnsafe(`
    UPDATE "Post" SET "likeCount" = (SELECT COUNT(*) FROM "PostLike" WHERE "PostLike"."postId" = "Post"."id")
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "Post" SET "commentCount" = (SELECT COUNT(*) FROM "Comment" WHERE "Comment"."postId" = "Post"."id")
  `);
  console.log("  Counters backfilled");
  await prisma.$executeRawUnsafe(`
    UPDATE "Comment" SET "likeCount" = (SELECT COUNT(*) FROM "CommentLike" WHERE "CommentLike"."commentId" = "Comment"."id")
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "Comment" SET "replyCount" = (SELECT COUNT(*) FROM "Comment" c2 WHERE c2."parentId" = "Comment"."id")
  `);
  console.log("  Comment counters backfilled");

  console.log("\n✅ Bulk seed complete!");
  console.log(`   Users: ${users.length.toLocaleString()}`);
  console.log(`   Posts: ${TOTAL_POSTS.toLocaleString()}`);
  console.log(`   Likes: ${likeCount.toLocaleString()}`);
  console.log(`   Comments: ${commentCount.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
