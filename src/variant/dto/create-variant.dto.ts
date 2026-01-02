import {
  IsString,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Size } from '@prisma/client';

export class CreateVariantDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsString()
  color: string;

  @IsEnum(Size)
  size: Size;

  @IsInt()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  frontImage: string;

  @IsString()
  backImage: string;

  @IsNumber()
  printAreaTop: number;

  @IsNumber()
  printAreaLeft: number;

  @IsNumber()
  printAreaWidth: number;

  @IsNumber()
  printAreaHeight: number;
}
