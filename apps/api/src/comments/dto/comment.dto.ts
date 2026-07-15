import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great post!' })
  @IsString()
  @MaxLength(3000)
  text!: string;
}

export class CommentQueryDto {
  @ApiPropertyOptional({ description: 'Cursor string: createdAt_id' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
