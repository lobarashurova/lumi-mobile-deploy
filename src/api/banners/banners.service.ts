import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { Banner } from 'src/models/banner.schema'

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private readonly bannerModel: Model<Banner>,
  ) {}

  async findAll(query: { page?: number; limit?: number }) {
    const page = query.page || 1
    const limit = query.limit || 10
    const skip = (page - 1) * limit
    const filter: any = { is_deleted: false, is_active: true }

    const [data, total] = await Promise.all([
      this.bannerModel
        .find(filter)
        .sort({ order: 1, created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.bannerModel.countDocuments(filter),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const banner = await this.bannerModel.findOne({
      _id: id,
      is_deleted: false,
      is_active: true,
    })
    if (!banner) throw new NotFoundException('Banner not found')
    return banner
  }
}
