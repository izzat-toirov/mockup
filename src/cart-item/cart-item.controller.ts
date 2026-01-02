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
import { CartItemService } from './cart-item.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CartService } from '../cart/cart.service';

@Controller('cart-items')
@UseGuards(JwtGuard)
export class CartItemController {
  constructor(
    private readonly cartItemService: CartItemService,
    private readonly cartService: CartService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCartItemDto: CreateCartItemDto, @Request() req) {
    // Get user's cart
    const cart = await this.cartService.findOne(req.user.id);

    // Assign the user's cart ID to the DTO
    createCartItemDto.cartId = cart.id;
    return this.cartItemService.create(createCartItemDto);
  }

  @Get('cart/:cartId')
  @HttpCode(HttpStatus.OK)
  findAll(@Param('cartId') cartId: string) {
    return this.cartItemService.findAll(+cartId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.cartItemService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartItemService.update(+id, updateCartItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.cartItemService.remove(+id);
  }

  @Delete('cart/:cartId')
  @HttpCode(HttpStatus.OK)
  clearCart(@Param('cartId') cartId: string) {
    return this.cartItemService.clearCart(+cartId);
  }
}
