import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import {
  ActivityCategory,
  ActivityCategorySchema,
} from 'src/models/activity-category.schema'
import { Activity, ActivitySchema } from 'src/models/activity.schema'
import { Branch, BranchSchema } from 'src/models/branch.schema'

import { AdminSeedController } from './admin-seed.controller'
import { AdminSeedService } from './admin-seed.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: Branch.name, schema: BranchSchema },
      { name: ActivityCategory.name, schema: ActivityCategorySchema },
    ]),
  ],
  controllers: [AdminSeedController],
  providers: [AdminSeedService],
})
export class AdminSeedModule {}
