import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { VariantService } from '../variant/variant.service';
import { NotificationService } from '../notification/notification.service';
import { OrderStatus, NotificationType, Prisma } from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { DesignObject } from './interfaces/design-object.interface';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private variantService: VariantService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => CartService))
    private cartService: CartService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<any> {
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

      // Validate design objects if present
      if (item.frontDesign) {
        this.validateDesignObject(item.frontDesign);
      }
      if (item.backDesign) {
        this.validateDesignObject(item.backDesign);
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
              ? typeof item.frontDesign === 'string'
                ? item.frontDesign // Already a string from JSON.stringify
                : JSON.stringify(item.frontDesign) // Convert object to string
              : undefined,
            frontPreviewUrl: item.frontPreviewUrl,
            backDesign: item.backDesign
              ? typeof item.backDesign === 'string'
                ? item.backDesign // Already a string from JSON.stringify
                : JSON.stringify(item.backDesign) // Convert object to string
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

  /**
   * Convert a user's cart to an order
   * @param userId The ID of the user whose cart to convert
   * @param orderDetails Additional order details
   * @returns The created order
   */
  async createFromCart(
    userId: number,
    orderDetails: Omit<CreateOrderDto, 'items' | 'userId'>,
  ): Promise<any> {
    // Get the user's cart with items
    const cart = await this.cartService.findOne(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty or does not exist');
    }

    // Prepare order items from cart items
    const orderItems = cart.items.map((cartItem) => ({
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      price: cartItem.variant.price, // Use the variant's current price
      frontDesign: cartItem.frontDesign || undefined,
      frontPreviewUrl: cartItem.frontPreviewUrl || undefined,
      backDesign: cartItem.backDesign || undefined,
      backPreviewUrl: cartItem.backPreviewUrl || undefined,
    }));

    // Validate and check stock for each order item
    for (const item of orderItems) {
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

      // Validate design objects if present
      if (item.frontDesign) {
        this.validateDesignObject(item.frontDesign);
      }
      if (item.backDesign) {
        this.validateDesignObject(item.backDesign);
      }
    }

    // Calculate total price
    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Create the order
    const createOrderDto: CreateOrderDto = {
      userId,
      customerName: orderDetails.customerName,
      customerPhone: orderDetails.customerPhone,
      region: orderDetails.region,
      address: orderDetails.address,
      totalPrice,
      status: orderDetails.status || OrderStatus.PENDING,
      paymentStatus: orderDetails.paymentStatus || orderDetails.paymentStatus,
      items: orderItems,
    };

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // First create the order
      const newOrder = await tx.order.create({
        data: {
          userId,
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
              ? typeof item.frontDesign === 'string'
                ? item.frontDesign // Already a string from JSON.stringify
                : JSON.stringify(item.frontDesign) // Convert object to string
              : undefined,
            frontPreviewUrl: item.frontPreviewUrl,
            backDesign: item.backDesign
              ? typeof item.backDesign === 'string'
                ? item.backDesign // Already a string from JSON.stringify
                : JSON.stringify(item.backDesign) // Convert object to string
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

    // Clear the cart after successful order creation
    await this.clearCart(userId);

    return order;
  }

  /**
   * Clear a user's cart
   * @param userId The ID of the user whose cart to clear
   */
  private async clearCart(userId: number) {
    // Find the user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return; // Cart doesn't exist, nothing to clear
    }

    // Delete all cart items
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });
  }

  /**
   * Validate design object structure
   * @param design The design object to validate
   */
  private validateDesignObject(design: any): void {
    if (typeof design !== 'object' || design === null) {
      throw new BadRequestException('Design must be a valid object');
    }

    const allowedKeys = [
      'x',
      'y',
      'scale',
      'rotation',
      'text',
      'color',
      'imageUrl',
    ];
    const designKeys = Object.keys(design);

    for (const key of designKeys) {
      if (!allowedKeys.includes(key)) {
        throw new BadRequestException(`Invalid design property: ${key}`);
      }
    }

    // Validate numeric properties
    if (design.x !== undefined && typeof design.x !== 'number') {
      throw new BadRequestException('Design x property must be a number');
    }
    if (design.y !== undefined && typeof design.y !== 'number') {
      throw new BadRequestException('Design y property must be a number');
    }
    if (design.scale !== undefined && typeof design.scale !== 'number') {
      throw new BadRequestException('Design scale property must be a number');
    }
    if (design.rotation !== undefined && typeof design.rotation !== 'number') {
      throw new BadRequestException(
        'Design rotation property must be a number',
      );
    }
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

  /**
   * Admin method to get detailed print files information for an order
   * @param orderId The ID of the order
   * @returns Detailed order information with print files
   */
  async getOrderPrintDetails(orderId: number): Promise<{
    order: any;
    customer: {
      id: number;
      fullName: string;
      email: string;
      phone: string;
    };
    items: Array<{
      id: number;
      variant: {
        id: number;
        color: string;
        size: string;
        frontImage: string;
        backImage: string;
      };
      product: {
        id: string;
        name: string;
      };
      quantity: number;
      price: number;
      frontOriginalUrl: string | null;
      frontPreviewUrl: string | null;
      backOriginalUrl: string | null;
      backPreviewUrl: string | null;
      frontCoordinates: DesignObject | null;
      backCoordinates: DesignObject | null;
    }>;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
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
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (!order.user) {
      throw new NotFoundException(
        `Order with ID ${orderId} has no associated user`,
      );
    }

    // Process items to extract design information
    const processedItems = order.items.map((item) => {
      // Parse design objects
      const frontDesign = item.frontDesign
        ? JSON.parse(item.frontDesign as string)
        : null;
      const backDesign = item.backDesign
        ? JSON.parse(item.backDesign as string)
        : null;

      return {
        id: item.id,
        variant: {
          id: item.variant.id,
          color: item.variant.color,
          size: item.variant.size,
          frontImage: item.variant.frontImage,
          backImage: item.variant.backImage,
        },
        product: {
          id: item.variant.product.id.toString(),
          name: item.variant.product.name,
        },
        quantity: item.quantity,
        price: item.price,
        frontOriginalUrl: item.finalPrintFile || null,
        frontPreviewUrl: item.frontPreviewUrl || null,
        backOriginalUrl: null, // Backend would need to store this if available
        backPreviewUrl: item.backPreviewUrl || null,
        frontCoordinates: frontDesign,
        backCoordinates: backDesign,
      };
    });

    return {
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      customer: {
        id: order.user.id,
        fullName: order.user.fullName,
        email: order.user.email,
        phone: order.user.phone,
      },
      items: processedItems,
    };
  }

  /**
   * Admin method to get the final print file URL for an order item
   * @param orderItemId The ID of the order item
   * @returns The final print file URL
   */
  async getFinalPrintFile(orderItemId: number): Promise<string> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        finalPrintFile: true,
      },
    });

    if (!orderItem || !orderItem.finalPrintFile) {
      throw new NotFoundException(
        `Final print file not found for order item ID ${orderItemId}`,
      );
    }

    return orderItem.finalPrintFile;
  }

  /**
   * Get design objects for an order item
   * @param orderItemId The ID of the order item
   * @returns Object containing front and back design data
   */
  async getOrderItemDesigns(orderItemId: number): Promise<{
    frontDesign: DesignObject | null;
    backDesign: DesignObject | null;
  }> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        frontDesign: true,
        backDesign: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Order item with ID ${orderItemId} not found`,
      );
    }

    return {
      frontDesign: orderItem.frontDesign
        ? JSON.parse(orderItem.frontDesign as string)
        : null,
      backDesign: orderItem.backDesign
        ? JSON.parse(orderItem.backDesign as string)
        : null,
    };
  }
}
