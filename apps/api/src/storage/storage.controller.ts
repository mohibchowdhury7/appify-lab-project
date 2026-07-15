import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get a presigned URL for uploading a file' })
  @ApiResponse({ status: 201, description: 'Presigned URL generated' })
  async createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.storageService.createUploadUrl(dto.filename, dto.contentType);
  }
}
