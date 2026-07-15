import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.post.count().then(c => { console.log('Posts:', c); prisma.$disconnect(); }).catch(e => { console.error(e); prisma.$disconnect(); });
