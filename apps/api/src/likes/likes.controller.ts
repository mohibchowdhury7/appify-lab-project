import { Controller, Post, Get, Param, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class LikesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

@ApiTags('likes')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('posts/:id/like')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Toggle like on a post' })
  @ApiResponse({ status: 201, description: 'Like toggled' })
  togglePostLike(@Req() req: any, @Param('id') id: string) {
    return this.likesService.togglePostLike(req.user.sub, id);
  }

  @Get('posts/:id/likes')
  @ApiOperation({ summary: 'Get users who liked a post' })
  getPostLikers(@Param('id') id: string, @Query() query: LikesQueryDto) {
    return this.likesService.getPostLikers(id, query.page, query.limit);
  }

  @Post('comments/:id/like')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Toggle like on a comment' })
  @ApiResponse({ status: 201, description: 'Like toggled' })
  toggleCommentLike(@Req() req: any, @Param('id') id: string) {
    return this.likesService.toggleCommentLike(req.user.sub, id);
  }

  @Get('comments/:id/likes')
  @ApiOperation({ summary: 'Get users who liked a comment' })
  getCommentLikers(@Param('id') id: string, @Query() query: LikesQueryDto) {
    return this.likesService.getCommentLikers(id, query.page, query.limit);
  }
}
