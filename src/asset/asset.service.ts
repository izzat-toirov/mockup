import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
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
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimes.join(', ')}`,
      );
    }

    try {
      // Upload file to Supabase
      const fileUrl = await this.supabaseService.uploadFile(file, 'assets');

      // Create asset record
      const asset = await this.prisma.asset.create({
        data: {
          url: fileUrl,
          userId: userId,
        },
      });

      return asset;
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
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

    // Delete file from Supabase storage
    try {
      await this.supabaseService.deleteFile(asset.url);
    } catch (error) {
      console.error('Error deleting file from Supabase:', error.message);
      // Continue with asset deletion even if file deletion fails
    }

    // Delete asset record
    await this.prisma.asset.delete({
      where: { id },
    });

    return { message: `Asset with ID ${id} has been deleted` };
  }
}
