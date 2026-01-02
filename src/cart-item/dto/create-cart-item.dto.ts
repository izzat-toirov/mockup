import {
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DesignDto {
  @IsOptional()
  x?: number;

  @IsOptional()
  y?: number;

  @IsOptional()
  scale?: number;

  @IsOptional()
  rotation?: number;

  @IsOptional()
  text?: string;

  @IsOptional()
  color?: string;

  @IsOptional()
  imageUrl?: string;
}

export class CreateCartItemDto {
  @IsInt()
  @Min(1)
  cartId: number;

  @IsInt()
  @Min(1)
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;

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
