import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Activity, ActivitySchema } from 'src/models/activity.schema'
import { Booking, BookingSchema } from 'src/models/booking.schema'
import { Order, OrderSchema } from 'src/models/order.schema'
import {
  TicketCounter,
  TicketCounterSchema,
} from 'src/models/ticket-counter.schema'

import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: TicketCounter.name, schema: TicketCounterSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
