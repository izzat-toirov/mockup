import {
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DesignDto } from './create-cart-item.dto';

export class UpdateCartItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  cartId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignDto)
  frontDesign?: DesignDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignDto)
  backDesign?: DesignDto;

  @IsOptional()
  @IsString()
  frontPreviewUrl?: string;

  @IsOptional()
  @IsString()
  backPreviewUrl?: string;
}
