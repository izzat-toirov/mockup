import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Controller('assets')
@UseGuards(JwtGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.assetService.uploadFile(file, req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAssetDto: CreateAssetDto, @Request() req) {
    // Override userId to ensure the asset belongs to the authenticated user
    createAssetDto.userId = req.user.id;
    return this.assetService.create(createAssetDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.assetService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.assetService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @Request() req,
  ) {
    // Ensure user can only update their own assets
    return this.assetService.update(+id, updateAssetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.assetService.remove(+id);
  }
}
