import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(configService: ConfigService) {
    this.supabase = createClient(
      configService.get<string>('SUPABASE_URL')!,
      configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    this.bucket = configService.get<string>('STORAGE_BUCKET', 'post-images');
  }

  async createUploadUrl(filename: string, contentType: string): Promise<{ url: string; key: string; publicUrl: string }> {
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const key = `${uuid()}.${ext}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(key, { upsert: true });

    if (error) throw new Error(`Failed to create upload URL: ${error.message}`);

    const publicUrl = this.getPublicUrl(key);

    return { url: data.signedUrl, key, publicUrl };
  }

  getPublicUrl(key: string): string {
    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }
}
