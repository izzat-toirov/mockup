import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { VariantService } from '../variant/variant.service';
import { NotificationService } from '../notification/notification.service';
import { OrderStatus, NotificationType } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private variantService: VariantService,
    private notificationService: NotificationService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    // If userId is provided, ensure user exists
    if (createOrderDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID ${createOrderDto.userId} not found`,
        );
      }
    }

    // Validate and check stock for each order item
    for (const item of createOrderDto.items) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
      });

      if (!variant) {
        throw new NotFoundException(
          `Variant with ID ${item.variantId} not found`,
        );
      }

      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for variant ${item.variantId}. Available: ${variant.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // First create the order
      const newOrder = await tx.order.create({
        data: {
          userId: createOrderDto.userId,
          customerName: createOrderDto.customerName,
          customerPhone: createOrderDto.customerPhone,
          region: createOrderDto.region,
          address: createOrderDto.address,
          totalPrice: createOrderDto.totalPrice,
          status: createOrderDto.status,
          paymentStatus: createOrderDto.paymentStatus,
        },
      });

      // Then create order items and update stock
      for (const item of createOrderDto.items) {
        // Create order item
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            frontDesign: item.frontDesign
              ? JSON.stringify(item.frontDesign)
              : undefined,
            frontPreviewUrl: item.frontPreviewUrl,
            backDesign: item.backDesign
              ? JSON.stringify(item.backDesign)
              : undefined,
            backPreviewUrl: item.backPreviewUrl,
            finalPrintFile: item.finalPrintFile,
          },
        });

        // Update stock
        const variant = await tx.variant.findUnique({
          where: { id: item.variantId },
        });

        if (variant) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: {
              stock: variant.stock - item.quantity,
            },
          });
        }
      }

      return newOrder;
    });

    return order;
  }

  async findAll() {
    return await this.prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
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
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
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

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Prepare update data, excluding undefined userId to avoid Prisma error
    const { userId, ...updateData } = updateOrderDto;
    const updatePayload: any = { ...updateData };

    // Only include userId in the update if it's explicitly provided
    if (userId !== undefined) {
      updatePayload.userId = userId;
    }

    // Check if status is being updated and send notification
    if (updateOrderDto.status && order.status !== updateOrderDto.status) {
      if (order.userId) {
        await this.notificationService.create({
          userId: order.userId,
          title: `Order Status Updated`,
          message: `Your order #${id} status has been updated to ${updateOrderDto.status}`,
          type: NotificationType.ORDER,
        });
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updatePayload,
    });

    return updatedOrder;
  }

  async remove(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return { message: `Order with ID ${id} has been deleted` };
  }
}
