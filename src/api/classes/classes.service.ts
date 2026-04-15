import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Activity } from 'src/models/activity.schema'

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,
  ) {}

  async findAll(query: {
    page?: number
    limit?: number
    branch_id?: string
    category_id?: string
    search?: string
  }) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit
    const filter: any = { is_deleted: false, status: 'approved' }

    if (query.branch_id && Types.ObjectId.isValid(query.branch_id)) {
      filter.branch_id = new Types.ObjectId(query.branch_id)
    }
    if (query.category_id && Types.ObjectId.isValid(query.category_id)) {
      filter.category_id = new Types.ObjectId(query.category_id)
    }
    if (query.search) {
      const rx = new RegExp(query.search, 'i')
      filter.$or = [
        { 'name.uz': rx },
        { 'name.ru': rx },
        { 'name.en': rx },
      ]
    }

    const [data, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .populate('branch_id')
        .populate('category_id')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.activityModel.countDocuments(filter),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const activity = await this.activityModel
      .findOne({ _id: id, is_deleted: false, status: 'approved' })
      .populate('branch_id')
      .populate('category_id')
    if (!activity) throw new NotFoundException('Class not found')
    return activity
  }
}
