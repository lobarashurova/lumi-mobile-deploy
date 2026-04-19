import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { ActivityCategory } from 'src/models/activity-category.schema'
import { Activity } from 'src/models/activity.schema'
import { Branch } from 'src/models/branch.schema'
import { Gender } from 'src/enums/gender.enum'
import { ActivityCategoryType } from 'src/enums/activity-category-type.enum'

@Injectable()
export class AdminSeedService {
  constructor(
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(ActivityCategory.name)
    private readonly categoryModel: Model<ActivityCategory>,
  ) {}

  async seedTestClass() {
    let category = await this.categoryModel.findOne({ 'name.en': 'Test Sport' })
    if (!category) {
      category = await this.categoryModel.create({
        name: { uz: 'Test sport', ru: 'Тестовый спорт', en: 'Test Sport' },
        type: ActivityCategoryType.TIMED_ACTIVITY,
        image: '/uploads/category-default.jpg',
        is_deleted: false,
      })
    }

    let branch = await this.branchModel.findOne({ title: 'Lumi Test Branch' })
    if (!branch) {
      branch = await this.branchModel.create({
        title: 'Lumi Test Branch',
        landmark: 'Test landmark',
        address: {
          uz: 'Toshkent, Test koʻchasi 1',
          ru: 'Ташкент, Тестовая улица 1',
          en: 'Tashkent, Test street 1',
        },
        description: {
          uz: 'Sinov filiali',
          ru: 'Тестовый филиал',
          en: 'Test branch',
        },
        location: { lat: 41.3111, lng: 69.2797 },
        partner_id: new Types.ObjectId(),
        manager_full_name: 'Test Manager',
        manager_phone: '+998901234567',
        images: [],
        status: 'approved',
        is_deleted: false,
      })
    }

    let activity = await this.activityModel.findOne({
      'name.en': 'Test Multi-Price Class',
    })

    const ageRanges = [
      { age_from: 4, age_to: 7, price: 200000 },
      { age_from: 8, age_to: 11, price: 300000 },
      { age_from: 12, age_to: 16, price: 400000 },
    ]

    if (!activity) {
      activity = await this.activityModel.create({
        name: {
          uz: 'Sinov klassi (turli narxlar)',
          ru: 'Тестовый класс (разные цены)',
          en: 'Test Multi-Price Class',
        },
        branch_id: branch._id,
        category_id: category._id,
        age_from: 4,
        age_to: 16,
        gender: Gender.BOTH,
        price: 200000,
        has_age_pricing: true,
        age_price_ranges: ageRanges,
        discount_percentage: 0,
        schedule: [
          { day: 'mon', start_time: '10:00', end_time: '11:00' },
          { day: 'wed', start_time: '10:00', end_time: '11:00' },
          { day: 'fri', start_time: '10:00', end_time: '11:00' },
        ],
        work_hours: [
          { day: 'mon', start_time: '09:00', end_time: '20:00' },
          { day: 'tue', start_time: '09:00', end_time: '20:00' },
          { day: 'wed', start_time: '09:00', end_time: '20:00' },
          { day: 'thu', start_time: '09:00', end_time: '20:00' },
          { day: 'fri', start_time: '09:00', end_time: '20:00' },
        ],
        description: {
          uz: 'Bu sinov uchun yaratilgan klass. Toʻlovni Paycom orqali sinab koʼring.',
          ru: 'Этот класс создан для теста. Проверьте оплату через Paycom.',
          en: 'This class is for end-to-end testing of the Paycom checkout.',
        },
        important_notes: {
          uz: 'Iltimos, mashgʻulotdan 10 daqiqa oldin keling.',
          ru: 'Пожалуйста, приходите за 10 минут до занятия.',
          en: 'Please arrive 10 minutes before class.',
        },
        required_items: {
          uz: 'Sport kiyimi va suv',
          ru: 'Спортивная одежда и вода',
          en: 'Sports clothes and water',
        },
        is_parent_control_required: false,
        youtube_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        activity_languages: ['uz', 'ru', 'en'],
        status: 'approved',
        is_deleted: false,
      })
    } else {
      activity.has_age_pricing = true
      activity.age_price_ranges = ageRanges
      activity.youtube_link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      activity.status = 'approved'
      activity.is_deleted = false
      await activity.save()
    }

    return {
      message: 'Test data ready',
      class_id: (activity._id as Types.ObjectId).toHexString(),
      class_name: 'Test Multi-Price Class',
      branch_id: (branch._id as Types.ObjectId).toHexString(),
      category_id: (category._id as Types.ObjectId).toHexString(),
      price_ranges: ageRanges,
      total_min_price: ageRanges[0].price,
      sample_booking: {
        endpoint: 'POST /api/orders/checkout',
        body: {
          activity_id: (activity._id as Types.ObjectId).toHexString(),
          items: [
            { age_from: 4, age_to: 7, count: 1 },
            { age_from: 8, age_to: 11, count: 2 },
          ],
        },
        expected_total: 200000 + 2 * 300000,
      },
    }
  }
}
