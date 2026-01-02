import {
  IsInt,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.ORDER;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean = false;
}
