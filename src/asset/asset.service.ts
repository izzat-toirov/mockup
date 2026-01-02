import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FileUploadService } from '../file-upload/file-upload.service';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}

  async create(createAssetDto: CreateAssetDto) {
    const asset = await this.prisma.asset.create({
      data: createAssetDto,
    });

    return asset;
  }

  async uploadFile(file: Express.Multer.File, userId: number) {
    // Validate image file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileUrl = await this.fileUploadService.uploadFile(file, allowedMimes);

    // Create asset record
    const asset = await this.prisma.asset.create({
      data: {
        url: fileUrl,
        userId: userId,
      },
    });

    return asset;
  }

  async findAll() {
    return await this.prisma.asset.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return asset;
  }

  async update(id: number, updateAssetDto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const updatedAsset = await this.prisma.asset.update({
      where: { id },
      data: updateAssetDto,
    });

    return updatedAsset;
  }

  async remove(id: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // Delete file from storage
    await this.fileUploadService.deleteFile(asset.url);

    // Delete asset record
    await this.prisma.asset.delete({
      where: { id },
    });

    return { message: `Asset with ID ${id} has been deleted` };
  }
}
