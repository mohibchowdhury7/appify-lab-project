import 'dotenv/config';
import { PrismaClient, PostVisibility } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.create({
    data: {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      passwordHash,
      avatarUrl: null,
    },
  });

  const bob = await prisma.user.create({
    data: {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com',
      passwordHash,
      avatarUrl: null,
    },
  });

  const carol = await prisma.user.create({
    data: {
      firstName: 'Carol',
      lastName: 'Davis',
      email: 'carol@example.com',
      passwordHash,
      avatarUrl: null,
    },
  });

  const post1 = await prisma.post.create({
    data: {
      authorId: alice.id,
      text: 'Just finished building my new side project! 🚀',
      imageUrl: null,
      visibility: PostVisibility.PUBLIC,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: bob.id,
      text: 'Working on a healthy tracking app — here is a sneak peek.',
      imageUrl: null,
      visibility: PostVisibility.PUBLIC,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      authorId: alice.id,
      text: 'This is my private post — only I can see it.',
      imageUrl: null,
      visibility: PostVisibility.PRIVATE,
    },
  });

  const post4 = await prisma.post.create({
    data: {
      authorId: carol.id,
      text: 'Beautiful sunset today 🌅',
      imageUrl: null,
      visibility: PostVisibility.PUBLIC,
    },
  });

  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: bob.id,
      text: 'Looks amazing! Congrats!',
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: carol.id,
      text: 'Love the design. What tech stack did you use?',
    },
  });

  await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: alice.id,
      parentId: comment1.id,
      text: 'Thanks Bob! 🙌',
    },
  });

  await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: alice.id,
      parentId: comment2.id,
      text: 'React + NestJS + Prisma + PostgreSQL',
    },
  });

  await prisma.postLike.createMany({
    data: [
      { userId: bob.id, postId: post1.id },
      { userId: carol.id, postId: post1.id },
      { userId: alice.id, postId: post2.id },
      { userId: alice.id, postId: post4.id },
      { userId: bob.id, postId: post4.id },
    ],
  });

  await prisma.commentLike.createMany({
    data: [
      { userId: alice.id, commentId: comment1.id },
      { userId: carol.id, commentId: comment1.id },
      { userId: bob.id, commentId: comment2.id },
    ],
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
