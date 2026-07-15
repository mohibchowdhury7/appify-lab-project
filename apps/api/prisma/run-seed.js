const { PrismaClient, PostVisibility } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.user.findFirst({ where: { email: 'alice@example.com' } });
  if (exists) { console.log('Demo users already exist. Skipping.'); return; }

  const passwordHash = await bcrypt.hash('password123', 12);
  const alice = await prisma.user.create({ data: { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', passwordHash, avatarUrl: null } });
  const bob = await prisma.user.create({ data: { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', passwordHash, avatarUrl: null } });
  const carol = await prisma.user.create({ data: { firstName: 'Carol', lastName: 'Davis', email: 'carol@example.com', passwordHash, avatarUrl: null } });

  const p1 = await prisma.post.create({ data: { authorId: alice.id, text: 'Just finished building my new side project! 🚀', visibility: PostVisibility.PUBLIC } });
  const p2 = await prisma.post.create({ data: { authorId: bob.id, text: 'Working on a healthy tracking app — here is a sneak peek.', visibility: PostVisibility.PUBLIC } });
  await prisma.post.create({ data: { authorId: alice.id, text: 'This is my private post — only I can see it.', visibility: PostVisibility.PRIVATE } });
  await prisma.post.create({ data: { authorId: carol.id, text: 'Beautiful sunset today 🌅', visibility: PostVisibility.PUBLIC } });

  const c1 = await prisma.comment.create({ data: { postId: p1.id, authorId: bob.id, text: 'Looks amazing! Congrats!' } });
  const c2 = await prisma.comment.create({ data: { postId: p1.id, authorId: carol.id, text: 'Love the design. What tech stack did you use?' } });
  await prisma.comment.create({ data: { postId: p1.id, authorId: alice.id, parentId: c1.id, text: 'Thanks Bob! 🙌' } });
  await prisma.comment.create({ data: { postId: p1.id, authorId: alice.id, parentId: c2.id, text: 'React + NestJS + Prisma + PostgreSQL' } });

  await prisma.postLike.createMany({ data: [
    { userId: bob.id, postId: p1.id }, { userId: carol.id, postId: p1.id },
    { userId: alice.id, postId: p2.id },
  ]});
  await prisma.commentLike.createMany({ data: [
    { userId: alice.id, commentId: c1.id }, { userId: carol.id, commentId: c1.id },
    { userId: bob.id, commentId: c2.id },
  ]});

  console.log('Seed complete — 3 users, 4 posts, 4 comments created');
}

main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
