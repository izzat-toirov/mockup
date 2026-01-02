import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('cart')
@UseGuards(JwtGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCartDto: CreateCartDto, @Request() req) {
    // Override userId to ensure the cart belongs to the authenticated user
    createCartDto.userId = req.user.id;
    return this.cartService.create(createCartDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findOne(@Request() req) {
    return this.cartService.findOne(req.user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.update(+id, updateCartDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.cartService.remove(+id);
  }
}
