import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartItemService {
  constructor(private prisma: PrismaService) {}

  async create(createCartItemDto: CreateCartItemDto) {
    // Check if variant exists
    const variant = await this.prisma.variant.findUnique({
      where: { id: createCartItemDto.variantId },
    });

    if (!variant) {
      throw new NotFoundException(
        `Variant with ID ${createCartItemDto.variantId} not found`,
      );
    }

    // Check if cart exists
    const cart = await this.prisma.cart.findUnique({
      where: { id: createCartItemDto.cartId },
    });

    if (!cart) {
      throw new NotFoundException(
        `Cart with ID ${createCartItemDto.cartId} not found`,
      );
    }

    // For simplicity, skip checking for existing cart item with same design
    // This is because JSON field comparison in Prisma is complex
    const cartItem = await this.prisma.cartItem.create({
      data: {
        ...createCartItemDto,
        frontDesign: createCartItemDto.frontDesign
          ? JSON.stringify(createCartItemDto.frontDesign)
          : undefined,
        backDesign: createCartItemDto.backDesign
          ? JSON.stringify(createCartItemDto.backDesign)
          : undefined,
      },
    });

    return cartItem;
  }

  async findAll(cartId: number) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    // Parse JSON fields back to objects
    return cartItems.map((item) => ({
      ...item,
      frontDesign: item.frontDesign
        ? JSON.parse(item.frontDesign as string)
        : null,
      backDesign: item.backDesign
        ? JSON.parse(item.backDesign as string)
        : null,
    }));
  }

  async findOne(id: number) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException(`CartItem with ID ${id} not found`);
    }

    // Parse JSON fields back to objects
    return {
      ...cartItem,
      frontDesign: cartItem.frontDesign
        ? JSON.parse(cartItem.frontDesign as string)
        : null,
      backDesign: cartItem.backDesign
        ? JSON.parse(cartItem.backDesign as string)
        : null,
    };
  }

  async update(id: number, updateCartItemDto: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem) {
      throw new NotFoundException(`CartItem with ID ${id} not found`);
    }

    // Check if variant exists if it's being updated
    if (updateCartItemDto.variantId) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: updateCartItemDto.variantId },
      });

      if (!variant) {
        throw new NotFoundException(
          `Variant with ID ${updateCartItemDto.variantId} not found`,
        );
      }
    }

    // Check if cart exists if it's being updated
    if (updateCartItemDto.cartId) {
      const cart = await this.prisma.cart.findUnique({
        where: { id: updateCartItemDto.cartId },
      });

      if (!cart) {
        throw new NotFoundException(
          `Cart with ID ${updateCartItemDto.cartId} not found`,
        );
      }
    }

    const updatedCartItem = await this.prisma.cartItem.update({
      where: { id },
      data: {
        ...updateCartItemDto,
        frontDesign: updateCartItemDto.frontDesign
          ? JSON.stringify(updateCartItemDto.frontDesign)
          : undefined,
        backDesign: updateCartItemDto.backDesign
          ? JSON.stringify(updateCartItemDto.backDesign)
          : undefined,
      },
    });

    // Parse JSON fields back to objects
    return {
      ...updatedCartItem,
      frontDesign: updatedCartItem.frontDesign
        ? JSON.parse(updatedCartItem.frontDesign as string)
        : null,
      backDesign: updatedCartItem.backDesign
        ? JSON.parse(updatedCartItem.backDesign as string)
        : null,
    };
  }

  async remove(id: number) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem) {
      throw new NotFoundException(`CartItem with ID ${id} not found`);
    }

    await this.prisma.cartItem.delete({
      where: { id },
    });

    return { message: `CartItem with ID ${id} has been deleted` };
  }

  async clearCart(cartId: number) {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return { message: `All items in cart with ID ${cartId} have been deleted` };
  }
}
