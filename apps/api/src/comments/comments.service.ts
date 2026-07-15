import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { PostVisibility } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface AuthorSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface CommentItem {
  id: string;
  text: string;
  createdAt: Date;
  author: AuthorSummary;
  likeCount: number;
  likedByMe: boolean;
  recentLikers: Array<{ avatarUrl: string | null }>;
  replyCount: number;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private readonly COMMENTS_CACHE_PREFIX = 'comments';

  async createComment(userId: string, postId: string, text: string): Promise<CommentItem> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.visibility === PostVisibility.PRIVATE && post.authorId !== userId) {
      throw new NotFoundException('Post not found');
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { postId, authorId: userId, text, parentId: null },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    const result: CommentItem = { id: comment.id, text: comment.text, createdAt: comment.createdAt, author: comment.author, likeCount: 0, likedByMe: false, recentLikers: [], replyCount: 0 };

    // Emit real-time event to post author (and potentially other subscribers)
    this.realtimeGateway.emitToUser(post.authorId, 'comment:created', {
      comment: result,
      postId,
      postAuthorId: post.authorId,
      commentAuthorId: userId,
    });

    // Also emit to current user (the one who commented)
    if (post.authorId !== userId) {
      this.realtimeGateway.emitToUser(userId, 'comment:created:by_me', {
        comment: result,
        postId,
      });
    }

    return result;
  }

  async createReply(userId: string, commentId: string, text: string): Promise<CommentItem> {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { author: true },
    });
    if (!parent) throw new NotFoundException('Comment not found');

    if (parent.parentId !== null) {
      throw new BadRequestException('Cannot reply to a reply — only one level of nesting allowed');
    }

    const [reply] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { postId: parent.postId, authorId: userId, text, parentId: commentId },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.post.update({
        where: { id: parent.postId },
        data: { commentCount: { increment: 1 } },
      }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { replyCount: { increment: 1 } },
      }),
    ]);

    const result: CommentItem = { id: reply.id, text: reply.text, createdAt: reply.createdAt, author: reply.author, likeCount: 0, likedByMe: false, recentLikers: [], replyCount: 0 };

    // Emit real-time event to comment author
    this.realtimeGateway.emitToUser(parent.author.id, 'reply:created', {
      reply: result,
      parentCommentId: commentId,
      postId: parent.postId,
      replyAuthorId: userId,
      parentCommentAuthorId: parent.author.id,
    });

    return result;
  }

  async listComments(userId: string, postId: string, cursor?: string, limit = 20) {
    const cacheKey = `${this.COMMENTS_CACHE_PREFIX}:${postId}:${cursor || 'first'}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    // Parallel: post visibility check + comments query
    const conditions: any[] = [{ postId, parentId: null }];
    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      conditions.push({ OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] });
    }

    const [post, comments] = await Promise.all([
      this.prisma.post.findUnique({ where: { id: postId } }),
      this.prisma.comment.findMany({
        where: { AND: conditions },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          text: true,
          likeCount: true,
          replyCount: true,
          createdAt: true,
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
    ]);

    if (!post) throw new NotFoundException('Post not found');
    if (post.visibility === PostVisibility.PRIVATE && post.authorId !== userId) {
      throw new NotFoundException('Post not found');
    }

    const result = await this.formatCommentList(userId, comments, limit);
    await this.cacheManager.set(cacheKey, result, 15_000);
    return result;
  }

  async listReplies(userId: string, commentId: string, cursor?: string, limit = 20) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const cacheKey = `replies:${commentId}:${cursor || 'first'}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const conditions: any[] = [{ parentId: commentId }];
    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      conditions.push({ OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] });
    }

    const replies = await this.prisma.comment.findMany({
      where: { AND: conditions },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        text: true,
        likeCount: true,
        replyCount: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    const result = await this.formatCommentList(userId, replies, limit);
    await this.cacheManager.set(cacheKey, result, 15_000);
    return result;
  }

  private async formatCommentList(userId: string, comments: any[], limit: number) {
    const hasMore = comments.length > limit;
    const items = comments.slice(0, limit);
    const commentIds = items.map((c: any) => c.id);

    // Parallel: likedByMe check + recent-likers preview — runs concurrently
    const [userLikes, recentLikersRows] = await Promise.all([
      commentIds.length > 0
        ? this.prisma.commentLike.findMany({
            where: { userId, commentId: { in: commentIds } },
            select: { commentId: true },
          })
        : Promise.resolve([]),
      commentIds.length > 0
        ? this.prisma.$queryRaw<Array<{ commentId: string; avatarUrl: string | null }>>(
            Prisma.sql`
              SELECT "commentId", "avatarUrl" FROM (
                SELECT cl."commentId", u."avatarUrl",
                  ROW_NUMBER() OVER (PARTITION BY cl."commentId" ORDER BY cl."createdAt" DESC) AS rn
                FROM "CommentLike" cl
                JOIN "User" u ON u."id" = cl."userId"
                WHERE cl."commentId" = ANY(${commentIds}::uuid[])
              ) sub WHERE sub.rn <= 3
            `,
          )
        : Promise.resolve([]),
    ]);

    const likedCommentIds = new Set(userLikes.map((l) => l.commentId));

    const recentLikersMap = new Map<string, Array<{ avatarUrl: string | null }>>();
    for (const row of recentLikersRows) {
      const arr = recentLikersMap.get(row.commentId) ?? [];
      arr.push({ avatarUrl: row.avatarUrl });
      recentLikersMap.set(row.commentId, arr);
    }

    const result = items.map((c: any) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      author: c.author,
      likeCount: c.likeCount,
      likedByMe: likedCommentIds.has(c.id),
      recentLikers: recentLikersMap.get(c.id) ?? [],
      replyCount: c.replyCount,
    }));

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = this.encodeCursor(last.createdAt, last.id);
    }

    return { items: result, nextCursor, hasMore };
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [iso, id] = decoded.split('|');
    return { createdAt: new Date(iso), id };
  }
}
