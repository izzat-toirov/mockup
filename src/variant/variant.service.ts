import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantService {
  constructor(private prisma: PrismaService) {}

  async create(createVariantDto: CreateVariantDto) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createVariantDto.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createVariantDto.productId} not found`,
      );
    }

    const variant = await this.prisma.variant.create({
      data: createVariantDto,
    });

    return variant;
  }

  async findAll() {
    return await this.prisma.variant.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  async update(id: number, updateVariantDto: UpdateVariantDto) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    // Check if product exists if productId is being updated
    if (updateVariantDto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: updateVariantDto.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${updateVariantDto.productId} not found`,
        );
      }
    }

    const updatedVariant = await this.prisma.variant.update({
      where: { id },
      data: updateVariantDto,
    });

    return updatedVariant;
  }

  async remove(id: number) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    await this.prisma.variant.delete({
      where: { id },
    });

    return { message: `Variant with ID ${id} has been deleted` };
  }

  async updateStock(variantId: number, quantity: number) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    if (variant.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${variant.stock}, Requested: ${quantity}`,
      );
    }

    const updatedVariant = await this.prisma.variant.update({
      where: { id: variantId },
      data: {
        stock: variant.stock - quantity,
      },
    });

    return updatedVariant;
  }
}
