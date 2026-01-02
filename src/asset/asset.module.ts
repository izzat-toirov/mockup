import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FileUploadService } from '../file-upload/file-upload.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssetController],
  providers: [AssetService, FileUploadService],
})
export class AssetModule {}
