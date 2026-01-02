import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
      },
    });

    return product;
  }

  async findAll() {
    return await this.prisma.product.findMany({
      include: {
        variants: {
          select: {
            id: true,
            color: true,
            size: true,
            stock: true,
            price: true,
            frontImage: true,
            backImage: true,
            printAreaTop: true,
            printAreaLeft: true,
            printAreaWidth: true,
            printAreaHeight: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          select: {
            id: true,
            color: true,
            size: true,
            stock: true,
            price: true,
            frontImage: true,
            backImage: true,
            printAreaTop: true,
            printAreaLeft: true,
            printAreaWidth: true,
            printAreaHeight: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });

    return updatedProduct;
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: `Product with ID ${id} has been deleted` };
  }
}
