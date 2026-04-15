import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { ActivityCategoryType } from 'src/enums/activity-category-type.enum'
import { ActivityCategory } from 'src/models/activity-category.schema'

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(ActivityCategory.name)
    private readonly categoryModel: Model<ActivityCategory>,
  ) {}

  async findAll(query: {
    page?: number
    limit?: number
    type?: ActivityCategoryType
  }) {
    const page = query.page || 1
    const limit = query.limit || 50
    const skip = (page - 1) * limit
    const filter: any = { is_deleted: false }
    if (query.type) filter.type = query.type

    const [data, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.categoryModel.countDocuments(filter),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findOne({
      _id: id,
      is_deleted: false,
    })
    if (!category) throw new NotFoundException('Category not found')
    return category
  }
}
