import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async create(createCartDto: CreateCartDto) {
    // Check if user already has a cart
    const existingCart = await this.prisma.cart.findUnique({
      where: { userId: createCartDto.userId },
    });

    if (existingCart) {
      throw new BadRequestException('User already has a cart');
    }

    const cart = await this.prisma.cart.create({
      data: createCartDto,
    });

    return cart;
  }

  async findOne(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Create a new cart for the user if it doesn't exist
      const newCart = await this.prisma.cart.create({
        data: { userId },
      });

      return {
        ...newCart,
        items: [],
      };
    }

    return cart;
  }

  async update(id: number, updateCartDto: UpdateCartDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    const updatedCart = await this.prisma.cart.update({
      where: { id },
      data: updateCartDto,
    });

    return updatedCart;
  }

  async remove(id: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    await this.prisma.cart.delete({
      where: { id },
    });

    return { message: `Cart with ID ${id} has been deleted` };
  }
}
