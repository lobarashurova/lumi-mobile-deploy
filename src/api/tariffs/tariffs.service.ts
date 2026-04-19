import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Tariff } from 'src/models/tariff.schema'

@Injectable()
export class TariffsService {
  constructor(
    @InjectModel(Tariff.name) private readonly tariffModel: Model<Tariff>,
  ) {}

  async findAll(query: { page?: number; limit?: number; lang?: string }) {
    const page = query.page || 1
    const limit = query.limit || 20
    const lang = query.lang || 'ru'
    const skip = (page - 1) * limit
    const filter = { is_deleted: false, is_active: true }

    const [rows, total] = await Promise.all([
      this.tariffModel
        .find(filter)
        .sort({ order: 1, price: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.tariffModel.countDocuments(filter),
    ])

    return {
      data: rows.map((r) => this.mapTariff(r, lang)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }
  }

  async findOne(id: string, lang = 'ru') {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Tariff not found')
    }
    const tariff = await this.tariffModel
      .findOne({ _id: id, is_deleted: false, is_active: true })
      .lean()
    if (!tariff) throw new NotFoundException('Tariff not found')
    return this.mapTariff(tariff, lang)
  }

  /**
   * Maps a PremiumPlan row to the client's freezed Tariff shape:
   * id, title, description, price, coins, valid_days. Keeps original
   * fields around too so existing admin/webapp consumers don't break.
   */
  private mapTariff(row: any, lang: string) {
    return {
      id: row._id?.toString(),
      title: this.readLang(row.name, lang),
      description: this.readLang(row.description, lang),
      price: row.price,
      coins: row.activities_limit ?? 0,
      valid_days: row.duration_days,
      currency: row.currency ?? 'UZS',
      features: row.features ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      name: row.name,
      duration_days: row.duration_days,
      activities_limit: row.activities_limit,
    }
  }

  private readLang(field: any, lang: string): string | null {
    if (!field) return null
    if (typeof field === 'string') return field
    return field[lang] ?? field.ru ?? field.en ?? field.uz ?? null
  }
}
