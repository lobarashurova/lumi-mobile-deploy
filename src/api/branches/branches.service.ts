import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Branch } from 'src/models/branch.schema'

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
  ) {}

  async findAll(query: {
    page?: number
    limit?: number
    search?: string
    partner_id?: string
  }) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit
    const filter: any = { is_deleted: false, status: 'approved' }

    if (query.partner_id && Types.ObjectId.isValid(query.partner_id)) {
      filter.partner_id = new Types.ObjectId(query.partner_id)
    }
    if (query.search) {
      const rx = new RegExp(query.search, 'i')
      filter.$or = [
        { title: rx },
        { landmark: rx },
        { 'address.uz': rx },
        { 'address.ru': rx },
        { 'address.en': rx },
      ]
    }

    const [data, total] = await Promise.all([
      this.branchModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.branchModel.countDocuments(filter),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const branch = await this.branchModel.findOne({
      _id: id,
      is_deleted: false,
      status: 'approved',
    })
    if (!branch) throw new NotFoundException('Branch not found')
    return branch
  }
}
