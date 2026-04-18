import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Child, ChildSchema } from 'src/models/child.schema'
import { User, UserSchema } from 'src/models/user.schema'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Child.name, schema: ChildSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
