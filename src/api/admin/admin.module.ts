import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Child, ChildSchema } from 'src/models/child.schema'
import { Order, OrderSchema } from 'src/models/order.schema'
import { User, UserSchema } from 'src/models/user.schema'

import { AdminController } from './admin.controller'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Child.name, schema: ChildSchema },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
