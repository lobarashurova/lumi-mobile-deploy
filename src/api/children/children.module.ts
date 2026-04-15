import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Child, ChildSchema } from 'src/models/child.schema'

import { ChildrenController } from './children.controller'
import { ChildrenService } from './children.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Child.name, schema: ChildSchema }]),
  ],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
