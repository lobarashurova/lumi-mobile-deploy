import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Tariff } from 'src/models/tariff.schema'

@Injectable()
export class TariffsService {
  constructor(
    @InjectModel(Tariff.name) private readonly tariffModel: Model<Tariff>,
  ) {}

  async findAll(query: { page?: number; limit?: number }) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit
    const filter = { is_deleted: false, is_active: true }

    const [data, total] = await Promise.all([
      this.tariffModel
        .find(filter)
        .sort({ order: 1, price: 1 })
        .skip(skip)
        .limit(limit),
      this.tariffModel.countDocuments(filter),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Tariff not found')
    }
    const tariff = await this.tariffModel.findOne({
      _id: id,
      is_deleted: false,
      is_active: true,
    })
    if (!tariff) throw new NotFoundException('Tariff not found')
    return tariff
  }
}
