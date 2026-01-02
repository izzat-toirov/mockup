import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { AssetModule } from './asset/asset.module';
import { OrderItemModule } from './order-item/order-item.module';
import { VariantModule } from './variant/variant.module';
import { CartModule } from './cart/cart.module';
import { CartItemModule } from './cart-item/cart-item.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { PrintFileModule } from './print-file/print-file.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ProductModule,
    OrderModule,
    AssetModule,
    OrderItemModule,
    VariantModule,
    CartModule,
    CartItemModule,
    FileUploadModule,
    PrintFileModule,
    NotificationModule,
  ],
})
export class AppModule {}
