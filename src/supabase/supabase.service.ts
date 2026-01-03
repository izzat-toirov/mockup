import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

// Type definitions for Supabase
interface SupabaseClient {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        file: Buffer,
        options?: { cacheControl?: string; upsert?: boolean },
      ): Promise<{ data?: any; error?: any }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
      remove(paths: string[]): Promise<{ error?: any }>;
    };
  };
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient | null = null;

  constructor(private configService: ConfigService) {
    // Check if Supabase package is available before initializing
    try {
      // Dynamically import Supabase client
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
      const bucketName = this.configService.get<string>('SUPABASE_BUCKET');

      if (!supabaseUrl || !supabaseKey || !bucketName) {
        throw new Error(
          'Supabase configuration is missing. Please check your environment variables.',
        );
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
    } catch (error) {
      this.logger.error(
        'Supabase client initialization failed. Please install @supabase/supabase-js package.',
      );
      this.logger.error(error.message);
      // In a real implementation, we would throw an error, but for now we'll continue
      // so the application can still run without the Supabase package
    }
  }

  /**
   * Uploads an image to Supabase with both original and compressed versions
   * @param file The uploaded file from Multer
   * @param folder The folder in Supabase storage
   * @returns Object containing URLs for original and compressed images
   */
  async uploadImageWithPreview(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ originalUrl: string; previewUrl: string }> {
    if (!this.supabase) {
      throw new Error(
        'Supabase client not initialized. Please install @supabase/supabase-js package and configure environment variables.',
      );
    }

    const bucketName = this.configService.get<string>('SUPABASE_BUCKET');
    if (!bucketName) {
      throw new Error('SUPABASE_BUCKET environment variable is not configured');
    }

    try {
      // Generate unique filenames
      const timestamp = Date.now();
      const fileExtension =
        file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const originalFilename = `${folder}/${timestamp}-original.${fileExtension}`;
      const previewFilename = `${folder}/${timestamp}-preview.${fileExtension}`;

      // Process original image (keep high quality)
      const originalBuffer = await sharp(file.buffer).toBuffer();

      // Process preview image (compressed, max 800px)
      const previewBuffer = await sharp(file.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload original image
      const { data: originalData, error: originalError } =
        await this.supabase.storage
          .from(bucketName)
          .upload(originalFilename, originalBuffer, {
            cacheControl: '3600',
            upsert: false,
          });

      if (originalError) {
        this.logger.error(
          `Supabase original upload error: ${originalError.message}`,
        );
        throw new Error(
          `Original file upload failed: ${originalError.message}`,
        );
      }

      // Upload preview image
      const { data: previewData, error: previewError } =
        await this.supabase.storage
          .from(bucketName)
          .upload(previewFilename, previewBuffer, {
            cacheControl: '3600',
            upsert: false,
          });

      if (previewError) {
        this.logger.error(
          `Supabase preview upload error: ${previewError.message}`,
        );
        throw new Error(`Preview file upload failed: ${previewError.message}`);
      }

      // Get public URLs
      const { data: originalUrlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(originalFilename);

      const { data: previewUrlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(previewFilename);

      return {
        originalUrl: originalUrlData.publicUrl,
        previewUrl: previewUrlData.publicUrl,
      };
    } catch (error) {
      this.logger.error(`Error uploading file to Supabase: ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!this.supabase) {
      throw new Error(
        'Supabase client not initialized. Please install @supabase/supabase-js package and configure environment variables.',
      );
    }

    const bucketName = this.configService.get<string>('SUPABASE_BUCKET');
    if (!bucketName) {
      throw new Error('SUPABASE_BUCKET environment variable is not configured');
    }

    try {
      // Generate a unique filename using timestamp and original name
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFilename = `${folder}/${timestamp}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

      // Upload the file to Supabase storage
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(uniqueFilename, file.buffer, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        this.logger.error(`Supabase upload error: ${error.message}`);
        throw new Error(`File upload failed: ${error.message}`);
      }

      // Get the public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFilename);

      return publicUrlData.publicUrl;
    } catch (error) {
      this.logger.error(`Error uploading file to Supabase: ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error(
        'Supabase client not initialized. Please install @supabase/supabase-js package and configure environment variables.',
      );
    }

    const bucketName = this.configService.get<string>('SUPABASE_BUCKET');
    if (!bucketName) {
      throw new Error('SUPABASE_BUCKET environment variable is not configured');
    }

    try {
      // Extract the file path from the public URL if needed
      const path = filePath.split('/').slice(-2).join('/'); // Gets the filename and folder

      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) {
        this.logger.error(`Supabase delete error: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error deleting file from Supabase: ${error.message}`);
      return false;
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    if (!this.supabase) {
      throw new Error(
        'Supabase client not initialized. Please install @supabase/supabase-js package and configure environment variables.',
      );
    }

    const bucketName = this.configService.get<string>('SUPABASE_BUCKET');
    if (!bucketName) {
      throw new Error('SUPABASE_BUCKET environment variable is not configured');
    }

    const { data } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}
