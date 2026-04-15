import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import {
  ActivityCategory,
  ActivityCategorySchema,
} from 'src/models/activity-category.schema'

import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityCategory.name, schema: ActivityCategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
