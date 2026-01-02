import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VariantModule } from '../variant/variant.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, VariantModule, NotificationModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
