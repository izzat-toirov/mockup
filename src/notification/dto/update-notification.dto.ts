import {
  IsInt,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateNotificationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
