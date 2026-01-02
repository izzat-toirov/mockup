import {
  IsInt,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  ValidateNested,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  frontDesign?: any;

  @IsOptional()
  @IsString()
  frontPreviewUrl?: string;

  @IsOptional()
  backDesign?: any;

  @IsOptional()
  @IsString()
  backPreviewUrl?: string;

  @IsOptional()
  @IsString()
  finalPrintFile?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @IsString()
  customerName: string;

  @IsPhoneNumber('UZ')
  customerPhone: string;

  @IsString()
  region: string;

  @IsString()
  address: string;

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus = OrderStatus.PENDING;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus = PaymentStatus.UNPAID;

  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
