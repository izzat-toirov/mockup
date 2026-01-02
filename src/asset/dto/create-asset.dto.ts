import { IsString, IsInt, Min } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  url: string;

  @IsInt()
  @Min(1)
  userId: number;
}
