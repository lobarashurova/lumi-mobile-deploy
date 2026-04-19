import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Activity, ActivityDocument } from 'src/models/activity.schema'
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from 'src/models/booking.schema'
import { Branch } from 'src/models/branch.schema'
import { UserDocument } from 'src/models/user.schema'

/**
 * Mobile client's ScheduleItem expects keys from recurring class schedules,
 * but on this backend a "schedule entry" = a CONFIRMED ticket Booking.
 * This service joins Booking → Activity (+ Branch) and reshapes the row into
 * the ScheduleItem contract the freezed models parse.
 */
@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(Activity.name)
    private readonly activityModel: Model<Activity>,
    @InjectModel(Branch.name)
    private readonly branchModel: Model<Branch>,
  ) {}

  async listForParent(user: UserDocument, lang = 'ru') {
    const bookings = await this.bookingModel
      .find({
        user_id: user._id,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      })
      .sort({ ticket_date: -1, created_at: -1 })
      .lean()

    if (bookings.length === 0) {
      return { success: true, data: [], page: 1, pages: 1, limit: 0, total: 0 }
    }

    const activityIds = Array.from(
      new Set(bookings.map((b) => b.activity_id.toString())),
    ).map((id) => new Types.ObjectId(id))

    const activities = await this.activityModel
      .find({ _id: { $in: activityIds } })
      .lean()

    const branchIds = Array.from(
      new Set(
        activities
          .map((a) => a.branch_id?.toString())
          .filter((v): v is string => !!v),
      ),
    ).map((id) => new Types.ObjectId(id))

    const branches = await this.branchModel
      .find({ _id: { $in: branchIds } })
      .lean()

    const activityMap = new Map(activities.map((a) => [a._id.toString(), a]))
    const branchMap = new Map(branches.map((b) => [b._id.toString(), b]))

    const items = bookings.map((b) => {
      const activity = activityMap.get(b.activity_id.toString())
      const branch = activity
        ? branchMap.get(activity.branch_id?.toString() ?? '')
        : undefined
      return this.toScheduleItem(b, activity, branch, lang)
    })

    return {
      success: true,
      data: items,
      page: 1,
      pages: 1,
      limit: items.length,
      total: items.length,
    }
  }

  private toScheduleItem(
    booking: any,
    activity: any | undefined,
    branch: any | undefined,
    lang: string,
  ) {
    const firstSchedule = activity?.schedule?.[0]
    const title = this.readLang(activity?.name, lang)
    const description = this.readLang(activity?.description, lang)
    const branchTitle = this.readLang(branch?.name, lang) ?? null

    return {
      id: booking._id.toString(),
      class: activity
        ? {
            id: activity._id.toString(),
            branch: branchTitle,
            category: null,
            title,
            description,
            duration: null,
            price: activity.price,
            trial_price: null,
            min_age: activity.age_from,
            max_age: activity.age_to,
            gender: activity.gender,
            is_active: true,
            has_photo: Boolean(activity.image || (activity.images ?? []).length),
          }
        : null,
      day_of_week: firstSchedule?.day ?? null,
      for_date: booking.ticket_date,
      start_time: firstSchedule?.start_time ?? null,
      end_time: firstSchedule?.end_time ?? null,
      start_date: booking.ticket_date,
      end_date: booking.ticket_date,
      capacity: null,
      status: booking.status,
      notes: null,
      for_child: null,
      related_bookings: [
        {
          id: booking._id.toString(),
          booking_status: booking.status?.toUpperCase(),
          charged_coin_amount: booking.price,
          is_trial_booking: false,
          ticket_no: booking.ticket_no,
          ticket_date: booking.ticket_date,
        },
      ],
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    }
  }

  private readLang(field: any, lang: string): string | null {
    if (!field) return null
    if (typeof field === 'string') return field
    return field[lang] ?? field.ru ?? field.en ?? field.uz ?? null
  }
}
