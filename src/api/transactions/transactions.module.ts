import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Order, OrderSchema } from 'src/models/order.schema'
import {
  Subscription,
  SubscriptionSchema,
} from 'src/models/subscription.schema'
import { Tariff, TariffSchema } from 'src/models/tariff.schema'
import { PaycomModule } from 'src/services/paycom/paycom.module'

import { TransactionsController } from './transactions.controller'
import { TransactionsService } from './transactions.service'

@Module({
  imports: [
    PaycomModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Tariff.name, schema: TariffSchema },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
