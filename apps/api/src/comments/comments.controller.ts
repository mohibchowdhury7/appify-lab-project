import { Controller, Post, Get, Body, Param, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CommentsService } from './comments.service';
import { CreateCommentDto, CommentQueryDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SanitizePipe } from '../common/sanitize.pipe';

@ApiTags('comments')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UsePipes(SanitizePipe)
  @ApiOperation({ summary: 'Create a top-level comment on a post' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  async createComment(@Req() req: any, @Param('postId') postId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.createComment(req.user.sub, postId, dto.text);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'List top-level comments on a post' })
  async listComments(@Req() req: any, @Param('postId') postId: string, @Query() query: CommentQueryDto) {
    return this.commentsService.listComments(req.user.sub, postId, query.cursor, query.limit);
  }

  @Post('comments/:commentId/replies')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UsePipes(SanitizePipe)
  @ApiOperation({ summary: 'Create a reply to a comment' })
  @ApiResponse({ status: 201, description: 'Reply created' })
  @ApiResponse({ status: 400, description: 'Cannot reply to a reply' })
  async createReply(@Req() req: any, @Param('commentId') commentId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.createReply(req.user.sub, commentId, dto.text);
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'List replies to a comment' })
  async listReplies(@Req() req: any, @Param('commentId') commentId: string, @Query() query: CommentQueryDto) {
    return this.commentsService.listReplies(req.user.sub, commentId, query.cursor, query.limit);
  }
}
