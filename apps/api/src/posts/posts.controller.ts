import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SanitizePipe } from '../common/sanitize.pipe';

@ApiTags('posts')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UsePipes(SanitizePipe)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created' })
  @ApiResponse({ status: 400, description: 'At least text or image is required' })
  async create(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.sub, dto);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get paginated feed of posts (newest first)' })
  @ApiResponse({ status: 200, description: 'Feed items with cursor' })
  async getFeed(@Req() req: any, @Query() query: FeedQueryDto) {
    return this.postsService.getFeed(req.user.sub, query.cursor, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single post by ID' })
  @ApiResponse({ status: 200, description: 'Post details' })
  @ApiResponse({ status: 404, description: 'Post not found or not visible' })
  async getPost(@Req() req: any, @Param('id') id: string) {
    return this.postsService.getPost(id, req.user.sub);
  }

  @Patch(':id')
  @UsePipes(SanitizePipe)
  @ApiOperation({ summary: 'Update a post (author only)' })
  @ApiResponse({ status: 200, description: 'Post updated' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.postsService.updatePost(id, req.user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post (author only)' })
  @ApiResponse({ status: 200, description: 'Post deleted' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.postsService.deletePost(id, req.user.sub);
  }
}
