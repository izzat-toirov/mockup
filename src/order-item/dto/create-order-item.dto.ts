import { IsInt, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  orderId: number;

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
