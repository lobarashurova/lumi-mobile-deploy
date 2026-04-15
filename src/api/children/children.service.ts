import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Child } from 'src/models/child.schema'
import { UserDocument } from 'src/models/user.schema'

import { CreateChildDTO } from './dto/create-child.dto'
import { UpdateChildDTO } from './dto/update-child.dto'

@Injectable()
export class ChildrenService {
  constructor(
    @InjectModel(Child.name) private readonly childModel: Model<Child>,
  ) {}

  async list(user: UserDocument, query: { page?: number; limit?: number }) {
    const page = query.page || 1
    const limit = query.limit || 50
    const skip = (page - 1) * limit
    const filter = { parent_id: user._id, is_deleted: false }

    const [data, total] = await Promise.all([
      this.childModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.childModel.countDocuments(filter),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(user: UserDocument, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Child not found')
    }
    const child = await this.childModel.findOne({
      _id: id,
      parent_id: user._id,
      is_deleted: false,
    })
    if (!child) throw new NotFoundException('Child not found')
    return child
  }

  async create(user: UserDocument, dto: CreateChildDTO) {
    return this.childModel.create({ ...dto, parent_id: user._id })
  }

  async update(user: UserDocument, id: string, dto: UpdateChildDTO) {
    await this.findOne(user, id)
    return this.childModel.findOneAndUpdate(
      { _id: id, parent_id: user._id, is_deleted: false },
      { $set: dto },
      { new: true },
    )
  }

  async remove(user: UserDocument, id: string) {
    await this.findOne(user, id)
    await this.childModel.updateOne(
      { _id: id, parent_id: user._id },
      { $set: { is_deleted: true, deleted_at: new Date() } },
    )
    return { message: 'Child deleted successfully' }
  }
}
