import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostVisibility } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface LikersPreview {
  avatarUrl: string | null;
}

interface LastComment {
  id: string;
  text: string;
  createdAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

interface FeedItem {
  id: string;
  text: string | null;
  imageUrl: string | null;
  visibility: PostVisibility;
  createdAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  recentLikers: LikersPreview[];
  lastComment: LastComment | null;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private readonly FEED_CACHE_PREFIX = 'feed';

  async create(userId: string, dto: CreatePostDto) {
    if (!dto.text && !dto.imageUrl) {
      throw new BadRequestException('At least text or image is required');
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        text: dto.text || null,
        imageUrl: dto.imageUrl || null,
        visibility: dto.visibility || PostVisibility.PUBLIC,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Emit real-time event for new post
    // Broadcast to all connected users (or could emit to followers)
    this.realtimeGateway.broadcast('post:created', {
      post: {
        id: post.id,
        text: post.text,
        imageUrl: post.imageUrl,
        visibility: post.visibility,
        createdAt: post.createdAt,
        author: post.author,
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        recentLikers: [],
        lastComment: null,
      },
      authorId: userId,
    });

    return post;
  }

  async getFeed(userId: string, cursor?: string, limit = 20): Promise<FeedResponse> {
    const cacheKey = `${this.FEED_CACHE_PREFIX}:${userId}:${cursor || 'first'}`;
    const cached = await this.cacheManager.get<FeedResponse>(cacheKey);
    if (cached) return cached;

    const response = await this.fetchFeedFromDb(userId, limit, cursor);
    await this.cacheManager.set(cacheKey, response, 30_000);
    return response;
  }

  private async fetchFeedFromDb(userId: string, limit: number, cursor?: string): Promise<FeedResponse> {
    const visibilityCondition = {
      OR: [
        { visibility: PostVisibility.PUBLIC },
        { visibility: PostVisibility.PRIVATE, authorId: userId },
      ],
    };

    let cursorCondition: Prisma.PostWhereInput = {};
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      cursorCondition = {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          {
            createdAt: decoded.createdAt,
            id: { lt: decoded.id },
          },
        ],
      };
    }

    const posts = await this.prisma.post.findMany({
      where: {
        AND: [visibilityCondition, cursorCondition],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        text: true,
        imageUrl: true,
        visibility: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit);
    const postIds = items.map((p) => p.id);

    // Check which posts the current user liked — single efficient query
    const userLikes = postIds.length > 0
      ? await this.prisma.postLike.findMany({
          where: { userId, postId: { in: postIds } },
          select: { postId: true },
        })
      : [];
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    // Efficient recent-likers: fetch only top 3 per post using a window function
    const recentLikersMap = new Map<string, LikersPreview[]>();
    if (postIds.length > 0) {
      const rows = await this.prisma.$queryRaw<Array<{ postId: string; avatarUrl: string | null }>>(
        Prisma.sql`
          SELECT "postId", "avatarUrl" FROM (
            SELECT pl."postId", u."avatarUrl",
              ROW_NUMBER() OVER (PARTITION BY pl."postId" ORDER BY pl."createdAt" DESC) AS rn
            FROM "PostLike" pl
            JOIN "User" u ON u."id" = pl."userId"
            WHERE pl."postId" = ANY(${postIds}::uuid[])
          ) sub WHERE sub.rn <= 3
        `,
      );

      for (const row of rows) {
        const arr = recentLikersMap.get(row.postId) ?? [];
        arr.push({ avatarUrl: row.avatarUrl });
        recentLikersMap.set(row.postId, arr);
      }
    }

    // Fetch last comment for each post efficiently in a single query
    const lastCommentMap = new Map<string, LastComment | null>();
    if (postIds.length > 0) {
      // Single query using CTE + ROW_NUMBER to get only the most recent comment per post
      // with all required data including counts
      const rawComments = await this.prisma.$queryRaw<Array<{
        id: string;
        text: string;
        createdAt: Date;
        postId: string;
        authorId: string;
        authorFirstName: string;
        authorLastName: string;
        authorAvatarUrl: string | null;
        likeCount: bigint;
        replyCount: bigint;
        likedByMe: boolean;
      }>>(
        Prisma.sql`
          WITH ranked_comments AS (
            SELECT
              c."id", c."text", c."createdAt", c."postId", c."authorId",
              u."firstName", u."lastName", u."avatarUrl",
              ROW_NUMBER() OVER (PARTITION BY c."postId" ORDER BY c."createdAt" DESC) as rn
            FROM "Comment" c
            JOIN "User" u ON u."id" = c."authorId"
            WHERE c."postId" = ANY(${postIds}::uuid[])
              AND c."parentId" IS NULL
          )
          SELECT
            rc."id", rc."text", rc."createdAt", rc."postId", rc."authorId",
            rc."firstName" as "authorFirstName",
            rc."lastName" as "authorLastName",
            rc."avatarUrl" as "authorAvatarUrl",
            COUNT(DISTINCT cl."id")::bigint as "likeCount",
            COUNT(DISTINCT r."id")::bigint as "replyCount",
            BOOL_OR(cl."userId" = ${userId}::uuid) as "likedByMe"
          FROM ranked_comments rc
          LEFT JOIN "CommentLike" cl ON cl."commentId" = rc."id"
          LEFT JOIN "Comment" r ON r."parentId" = rc."id"
          WHERE rc.rn = 1
          GROUP BY rc."id", rc."text", rc."createdAt", rc."postId", rc."authorId",
                   rc."firstName", rc."lastName", rc."avatarUrl"
        `,
      );

      // Build map directly from results
      for (const row of rawComments) {
        lastCommentMap.set(row.postId, {
          id: row.id,
          text: row.text,
          createdAt: row.createdAt,
          author: {
            id: row.authorId,
            firstName: row.authorFirstName,
            lastName: row.authorLastName,
            avatarUrl: row.authorAvatarUrl,
          },
          likeCount: Number(row.likeCount),
          likedByMe: row.likedByMe,
          replyCount: Number(row.replyCount),
        });
      }

      // Set null for posts with no comments
      for (const postId of postIds) {
        if (!lastCommentMap.has(postId)) {
          lastCommentMap.set(postId, null);
        }
      }
    }

    const feedItems: FeedItem[] = items.map((post) => ({
      id: post.id,
      text: post.text,
      imageUrl: post.imageUrl,
      visibility: post.visibility,
      createdAt: post.createdAt,
      author: post.author,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      likedByMe: likedPostIds.has(post.id),
      recentLikers: recentLikersMap.get(post.id) ?? [],
      lastComment: lastCommentMap.get(post.id) ?? null,
    }));

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = this.encodeCursor(last.createdAt, last.id);
    }

    return { items: feedItems, nextCursor, hasMore };
  }

  async getPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        text: true,
        imageUrl: true,
        visibility: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
        authorId: true,
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (post.visibility === PostVisibility.PRIVATE && post.authorId !== userId) {
      throw new NotFoundException('Post not found');
    }

    const likedByMe = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId: post.id } },
      select: { id: true },
    }).then(Boolean);

    // Fetch up to 3 recent liker avatars
    const recentLikerRows = await this.prisma.postLike.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { user: { select: { avatarUrl: true } } },
    });

    return {
      id: post.id,
      text: post.text,
      imageUrl: post.imageUrl,
      visibility: post.visibility,
      createdAt: post.createdAt,
      author: post.author,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      likedByMe,
      recentLikers: recentLikerRows.map((l) => ({ avatarUrl: l.user.avatarUrl })),
    };
  }

  async updatePost(postId: string, userId: string, dto: { text?: string; visibility?: PostVisibility }) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new NotFoundException('Post not found');

    const result = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text || null } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return result;
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new NotFoundException('Post not found');

    await this.prisma.post.delete({ where: { id: postId } });
    return { status: 'deleted' };
  }

  async getCommentsPreview(userId: string, postIds: string[]) {
    if (postIds.length === 0) return {};

    const lastCommentRows = await this.prisma.$queryRaw<Array<any>>(
      Prisma.sql`
        SELECT c."postId", c."id", c."text", c."createdAt", c."likeCount", c."replyCount",
               u."id" AS "authorId", u."firstName", u."lastName", u."avatarUrl"
        FROM (
          SELECT "postId", "id", "text", "createdAt", "likeCount", "replyCount", "authorId",
                 ROW_NUMBER() OVER (PARTITION BY "postId" ORDER BY "createdAt" DESC, "id" DESC) AS rn
          FROM "Comment"
          WHERE "postId" = ANY(${postIds}::uuid[]) AND "parentId" IS NULL
        ) c
        JOIN "User" u ON u."id" = c."authorId"
        WHERE c.rn = 1
      `,
    );

    const lastCommentIds = lastCommentRows.map((r: any) => r.id);

    const lastCommentLikes = lastCommentIds.length > 0
      ? await this.prisma.commentLike.findMany({
          where: { userId, commentId: { in: lastCommentIds } },
          select: { commentId: true },
        })
      : [];
    const likedLastCommentIds = new Set(lastCommentLikes.map((l) => l.commentId));

    const result: Record<string, any> = {};
    for (const row of lastCommentRows) {
      result[row.postId] = {
        id: row.id,
        text: row.text,
        createdAt: row.createdAt,
        author: {
          id: row.authorId,
          firstName: row.firstName,
          lastName: row.lastName,
          avatarUrl: row.avatarUrl,
        },
        likeCount: row.likeCount,
        likedByMe: likedLastCommentIds.has(row.id),
        replyCount: row.replyCount,
      };
    }

    return result;
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
