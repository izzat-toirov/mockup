import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileUploadService {
  constructor(private configService: ConfigService) {}

  async uploadFile(
    file: Express.Multer.File,
    allowedMimes: string[] = [],
  ): Promise<string> {
    // Validate file type
    if (allowedMimes.length > 0 && !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimes.join(', ')}`,
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir =
      this.configService.get<string>('UPLOAD_DIR') || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const { v4: uuidv4 } = await import('uuid');
    const uniqueFilename = `${uuidv4()}_${file.originalname}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return file URL
    const baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/uploads/${uniqueFilename}`;
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const uploadDir =
        this.configService.get<string>('UPLOAD_DIR') || './uploads';
      const filename = path.basename(fileUrl);
      const filePath = path.join(uploadDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
