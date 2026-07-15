import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { PostVisibility } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async togglePostLike(userId: string, postId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.visibility === PostVisibility.PRIVATE && post.authorId !== userId) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    const [likeAction, updatedPost] = await this.prisma.$transaction([
      existing
        ? this.prisma.postLike.delete({ where: { id: existing.id } })
        : this.prisma.postLike.create({ data: { userId, postId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: existing ? { decrement: 1 } : { increment: 1 } },
        select: { likeCount: true, authorId: true },
      }),
    ]);

    const result = { liked: !existing, likeCount: updatedPost.likeCount };

    // Emit real-time like event to post author
    this.realtimeGateway.emitToUser(updatedPost.authorId, 'like:toggled', {
      entityType: 'post',
      entityId: postId,
      liked: !existing,
      likeCount: updatedPost.likeCount,
      userId: existing ? null : userId, // null if unliked
      postAuthorId: updatedPost.authorId,
    });

    // Also emit to the user who liked (for their own UI)
    if (userId !== updatedPost.authorId) {
      this.realtimeGateway.emitToUser(userId, 'like:toggled:by_me', {
        entityType: 'post',
        entityId: postId,
        liked: !existing,
        likeCount: updatedPost.likeCount,
      });
    }

    return result;
  }

  async getPostLikers(postId: string, page = 1, limit = 20) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const [items, total] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { postId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.postLike.count({ where: { postId } }),
    ]);

    return {
      items: items.map((l) => l.user),
      total,
      page,
      hasMore: page * limit < total,
    };
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<{ liked: boolean; likeCount: number }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { visibility: true, authorId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.post.visibility === PostVisibility.PRIVATE && comment.post.authorId !== userId) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    const [_, updatedComment] = await this.prisma.$transaction([
      existing
        ? this.prisma.commentLike.delete({ where: { id: existing.id } })
        : this.prisma.commentLike.create({ data: { userId, commentId } }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: existing ? { decrement: 1 } : { increment: 1 } },
        select: { likeCount: true, authorId: true },
      }),
    ]);

    const result = { liked: !existing, likeCount: updatedComment.likeCount };

    // Emit real-time like event to comment author
    this.realtimeGateway.emitToUser(updatedComment.authorId, 'like:toggled', {
      entityType: 'comment',
      entityId: commentId,
      liked: !existing,
      likeCount: updatedComment.likeCount,
      userId: existing ? null : userId,
      commentAuthorId: updatedComment.authorId,
    });

    // Also emit to the user who liked
    if (userId !== updatedComment.authorId) {
      this.realtimeGateway.emitToUser(userId, 'like:toggled:by_me', {
        entityType: 'comment',
        entityId: commentId,
        liked: !existing,
        likeCount: updatedComment.likeCount,
      });
    }

    return result;
  }

  async getCommentLikers(commentId: string, page = 1, limit = 20) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const [items, total] = await Promise.all([
      this.prisma.commentLike.findMany({
        where: { commentId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.commentLike.count({ where: { commentId } }),
    ]);

    return {
      items: items.map((l) => l.user),
      total,
      page,
      hasMore: page * limit < total,
    };
  }
}
