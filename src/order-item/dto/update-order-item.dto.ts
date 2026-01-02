import { IsInt, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class UpdateOrderItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

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
