import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Order, OrderSchema } from 'src/models/order.schema'
import { User, UserSchema } from 'src/models/user.schema'

import { AdminController } from './admin.controller'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
