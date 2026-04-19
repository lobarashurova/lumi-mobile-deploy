import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { OrdersModule } from 'src/api/orders/orders.module'
import { Booking, BookingSchema } from 'src/models/booking.schema'
import { Order, OrderSchema } from 'src/models/order.schema'
import {
  Subscription,
  SubscriptionSchema,
} from 'src/models/subscription.schema'
import { Tariff, TariffSchema } from 'src/models/tariff.schema'

import { PaycomController } from './paycom.controller'
import { PaycomMerchantService } from './paycom.service'

@Module({
  imports: [
    forwardRef(() => OrdersModule),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Tariff.name, schema: TariffSchema },
    ]),
  ],
  controllers: [PaycomController],
  providers: [PaycomMerchantService],
})
export class PaycomApiModule {}
