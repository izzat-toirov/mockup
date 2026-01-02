import {
  IsString,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { Size } from '@prisma/client';

export class UpdateVariantDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsEnum(Size)
  size?: Size;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  frontImage?: string;

  @IsOptional()
  @IsString()
  backImage?: string;

  @IsOptional()
  @IsNumber()
  printAreaTop?: number;

  @IsOptional()
  @IsNumber()
  printAreaLeft?: number;

  @IsOptional()
  @IsNumber()
  printAreaWidth?: number;

  @IsOptional()
  @IsNumber()
  printAreaHeight?: number;
}
