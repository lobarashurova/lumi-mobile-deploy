import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import {
  ActivityCategory,
  ActivityCategorySchema,
} from 'src/models/activity-category.schema'
import { Activity, ActivitySchema } from 'src/models/activity.schema'
import { Branch, BranchSchema } from 'src/models/branch.schema'

import { ClassesController } from './classes.controller'
import { ClassesService } from './classes.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: Branch.name, schema: BranchSchema },
      { name: ActivityCategory.name, schema: ActivityCategorySchema },
    ]),
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
