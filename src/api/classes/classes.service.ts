import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Activity } from 'src/models/activity.schema'

type PriceRange = { age_from: number; age_to: number; price: number }
type EnrichedActivity = Record<string, any>

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

    return {
      data: data.map((d) => this.enrich(d)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }
  }

  async findOne(id: string) {
    const activity = await this.activityModel
      .findOne({ _id: id, is_deleted: false, status: 'approved' })
      .populate('branch_id')
      .populate('category_id')
    if (!activity) throw new NotFoundException('Class not found')
    return this.enrich(activity)
  }

  private enrich(doc: any): EnrichedActivity {
    const json = doc.toObject ? doc.toObject() : doc
    const ranges = this.collectRanges(json)
    const sorted = [...ranges].sort((a, b) => a.price - b.price)

    json.prices_summary = sorted
    json.price_min = sorted.length ? sorted[0].price : json.price ?? 0
    json.price_max = sorted.length
      ? sorted[sorted.length - 1].price
      : json.price ?? 0
    json.has_multiple_prices = sorted.length > 1
    json.schedule_count = Array.isArray(json.schedule) ? json.schedule.length : 0
    json.video_url = this.normalizeVideoUrl(json)
    json.video_provider = this.detectVideoProvider(json)
    return json
  }

  private collectRanges(activity: any): PriceRange[] {
    // New format: age_tiers with nested durations [{age_from, age_to, durations:[{duration,price}]}]
    if (Array.isArray(activity.age_tiers) && activity.age_tiers.length > 0) {
      const ranges: PriceRange[] = []
      for (const tier of activity.age_tiers) {
        if (Array.isArray(tier.durations)) {
          for (const dur of tier.durations) {
            if (typeof dur.price === 'number') {
              ranges.push({
                age_from: tier.age_from ?? 0,
                age_to: tier.age_to ?? 99,
                price: dur.price,
              })
            }
          }
        }
      }
      if (ranges.length > 0) return ranges
    }

    // Legacy format: age_price_ranges
    if (
      activity.has_age_pricing &&
      Array.isArray(activity.age_price_ranges) &&
      activity.age_price_ranges.length > 0
    ) {
      return activity.age_price_ranges.map((r: any) => ({
        age_from: r.age_from,
        age_to: r.age_to,
        price: r.price,
      }))
    }

    // Flat single price
    return [
      {
        age_from: activity.age_from ?? 0,
        age_to: activity.age_to ?? 99,
        price: activity.price ?? 0,
      },
    ]
  }

  private normalizeVideoUrl(activity: any): string | null {
    if (activity.youtube_link) return activity.youtube_link
    if (activity.vimeo_link) return activity.vimeo_link
    return null
  }

  private detectVideoProvider(
    activity: any,
  ): 'youtube' | 'vimeo' | null {
    if (activity.youtube_link) return 'youtube'
    if (activity.vimeo_link) return 'vimeo'
    return null
  }
}
