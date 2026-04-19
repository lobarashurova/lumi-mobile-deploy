import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Booking, BookingSchema } from 'src/models/booking.schema'
import { Order, OrderSchema } from 'src/models/order.schema'

import { PaycomController } from './paycom.controller'
import { PaycomMerchantService } from './paycom.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [PaycomController],
  providers: [PaycomMerchantService],
})
export class PaycomApiModule {}
