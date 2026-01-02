import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
