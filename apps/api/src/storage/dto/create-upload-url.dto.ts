import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadUrlDto {
  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  filename!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType!: string;
}
