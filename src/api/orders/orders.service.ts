import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import {
  Booking,
  BookingDocument,
  BookingStatus,
} from 'src/models/booking.schema'
import { Activity } from 'src/models/activity.schema'
import { Order, OrderDocument, OrderStatus } from 'src/models/order.schema'
import { TicketCounter } from 'src/models/ticket-counter.schema'
import { PaycomService } from 'src/services/paycom/paycom.service'

import { CheckoutDTO, CheckoutItemDTO } from './dto/checkout.dto'

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger('OrdersService')

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,
    @InjectModel(TicketCounter.name)
    private readonly ticketCounterModel: Model<TicketCounter>,
    private readonly paycom: PaycomService,
  ) {}

  /**
   * Drop the pre-partial `ticket_date_1_ticket_no_1` unique index if it's
   * still lingering from an older deploy where ticket_no was required. The
   * new schema definition uses a partialFilterExpression; Mongoose's
   * auto-index will recreate it correctly once the old one is gone.
   */
  async onModuleInit() {
    try {
      const indexes = await this.bookingModel.collection.indexes()
      const legacy = indexes.find(
        (i) =>
          i.name === 'ticket_date_1_ticket_no_1' &&
          !('partialFilterExpression' in (i as any)),
      )
      if (legacy) {
        await this.bookingModel.collection.dropIndex(
          'ticket_date_1_ticket_no_1',
        )
        this.logger.log(
          'Dropped legacy non-partial ticket_date_1_ticket_no_1 index',
        )
      }
      await this.bookingModel.syncIndexes()
    } catch (err) {
      this.logger.warn(
        `Booking index reconciliation failed: ${(err as Error).message}`,
      )
    }
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10)
  }

  /** Public helper: reserve a contiguous range of ticket numbers for a date. */
  async reserveTicketNumbers(count: number, date: string): Promise<string[]> {
    const counter = await this.ticketCounterModel.findOneAndUpdate(
      { date },
      { $inc: { last_no: count } },
      { new: true, upsert: true },
    )
    const last = counter.last_no
    const start = last - count + 1
    const numbers: string[] = []
    for (let n = start; n <= last; n++) {
      const wrapped = ((n - 1) % 9999) + 1
      numbers.push(String(wrapped).padStart(4, '0'))
    }
    return numbers
  }

  /**
   * Assigns ticket numbers to every booking of a PAID activity order (in the
   * same order they were created) and flips them to CONFIRMED. Idempotent:
   * bookings that already have a ticket_no are skipped.
   */
  async assignTicketsForPaidOrder(orderId: Types.ObjectId): Promise<string[]> {
    const bookings = await this.bookingModel
      .find({ order_id: orderId })
      .sort({ _id: 1 })
    if (bookings.length === 0) return []
    const missing = bookings.filter((b) => !b.ticket_no)
    if (missing.length === 0) {
      // Already assigned; return in order.
      return bookings.map((b) => b.ticket_no!).filter(Boolean)
    }
    const date = missing[0].ticket_date
    const numbers = await this.reserveTicketNumbers(missing.length, date)
    for (let i = 0; i < missing.length; i++) {
      await this.bookingModel.updateOne(
        { _id: missing[i]._id },
        {
          $set: {
            ticket_no: numbers[i],
            status: BookingStatus.CONFIRMED,
          },
        },
      )
    }
    // Ensure every booking (already-assigned included) is CONFIRMED.
    await this.bookingModel.updateMany(
      { order_id: orderId },
      { $set: { status: BookingStatus.CONFIRMED } },
    )
    const all = await this.bookingModel
      .find({ order_id: orderId })
      .sort({ _id: 1 })
    return all.map((b) => b.ticket_no ?? '')
  }

  /**
   * Validates a user-picked `ticket_date` against an activity's recurring
   * schedule. Throws BadRequest on invalid format, past date, or weekday
   * that the class doesn't run on. Returns the chosen date and (if present)
   * the matching schedule slot's start/end times.
   */
  private validateTicketDate(
    activity: any,
    ticketDate: string,
  ): { date: string; slot?: { day: string; start_time: string; end_time: string } } {
    // Match DTO already enforces format, but be defensive in case this is
    // called from a different caller in the future.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ticketDate)) {
      throw new BadRequestException('Invalid ticket_date format (YYYY-MM-DD)')
    }
    const picked = new Date(`${ticketDate}T00:00:00Z`)
    if (Number.isNaN(picked.getTime())) {
      throw new BadRequestException('Invalid ticket_date')
    }
    const today = new Date(`${this.todayKey()}T00:00:00Z`)
    if (picked.getTime() < today.getTime()) {
      throw new BadRequestException('ticket_date must be today or in the future')
    }

    const schedule = (activity.schedule ?? []) as Array<{
      day: string
      start_time: string
      end_time: string
    }>
    if (schedule.length === 0) {
      // Class has no weekly schedule — accept any future date.
      return { date: ticketDate }
    }

    const pickedKey = this.weekdayKey(picked.getUTCDay())
    const slot = schedule.find(
      (s) => this.normalizeDay(s.day) === pickedKey,
    )
    if (!slot) {
      const allowed = Array.from(
        new Set(schedule.map((s) => this.normalizeDay(s.day))),
      ).join(', ')
      throw new BadRequestException(
        `Class doesn't run on ${pickedKey}. Available: ${allowed}`,
      )
    }
    return { date: ticketDate, slot }
  }

  private weekdayKey(utcDay: number): string {
    // 0 = Sunday ... 6 = Saturday
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][utcDay]
  }

  private normalizeDay(day: string): string {
    return (day || '').trim().toUpperCase().slice(0, 3)
  }

  async checkout(userId: string, dto: CheckoutDTO) {
    if (!Types.ObjectId.isValid(dto.activity_id)) {
      throw new BadRequestException('Invalid activity_id')
    }

    const activity = await this.activityModel.findOne({
      _id: dto.activity_id,
      is_deleted: false,
      status: 'approved',
    })
    if (!activity) throw new NotFoundException('Class not found')

    const { date: ticketDate } = this.validateTicketDate(
      activity,
      dto.ticket_date,
    )

    const validatedItems = this.matchItemsToActivity(activity, dto.items)
    const totalAmount = validatedItems.reduce(
      (sum, it) => sum + it.unit_price * it.count,
      0,
    )
    if (totalAmount <= 0) {
      throw new BadRequestException('Total amount must be greater than 0')
    }

    const order = await this.orderModel.create({
      user_id: new Types.ObjectId(userId),
      activity_id: activity._id,
      items: validatedItems,
      total_amount: totalAmount,
      paid_amount: 0,
      status: OrderStatus.PENDING,
    })

    // Bookings are created in PENDING with no ticket_no — ticket numbers are
    // only reserved when the order flips to PAID (via webhook or mockPay).
    const bookingDocs: Partial<Booking>[] = []
    for (const it of validatedItems) {
      for (let i = 0; i < it.count; i++) {
        bookingDocs.push({
          order_id: order._id as any,
          user_id: new Types.ObjectId(userId),
          activity_id: activity._id as any,
          age_from: it.age_from,
          age_to: it.age_to,
          price: it.unit_price,
          ticket_date: ticketDate,
          status: BookingStatus.PENDING,
        })
      }
    }
    await this.bookingModel.insertMany(bookingDocs)

    const checkoutUrl = this.paycom.buildCheckoutUrl({
      orderId: (order._id as Types.ObjectId).toHexString(),
      amountUzs: totalAmount,
      lang: dto.lang,
      returnUrl: dto.return_url,
      test: dto.test ?? false,
    })

    return {
      order_id: (order._id as Types.ObjectId).toHexString(),
      total_amount: totalAmount,
      currency: 'UZS',
      status: order.status,
      checkout_url: checkoutUrl,
      ticket_date: ticketDate,
      ticket_numbers: [] as string[],
    }
  }

  private matchItemsToActivity(
    activity: any,
    items: CheckoutItemDTO[],
  ): { age_from: number; age_to: number; unit_price: number; count: number }[] {
    const ranges: Array<{ age_from: number; age_to: number; price: number }> =
      activity.has_age_pricing && Array.isArray(activity.age_price_ranges) && activity.age_price_ranges.length > 0
        ? activity.age_price_ranges
        : [
            {
              age_from: activity.age_from,
              age_to: activity.age_to,
              price: activity.price,
            },
          ]

    return items.map((item) => {
      const match = ranges.find(
        (r) => r.age_from === item.age_from && r.age_to === item.age_to,
      )
      if (!match) {
        throw new BadRequestException(
          `Price range ${item.age_from}-${item.age_to} not available for this class`,
        )
      }
      return {
        age_from: match.age_from,
        age_to: match.age_to,
        unit_price: match.price,
        count: item.count,
      }
    })
  }

  async findUserOrders(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const filter = { user_id: new Types.ObjectId(userId) }
    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('activity_id', 'name image price images')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ])
    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(userId: string, orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException('Order not found')
    }
    const order = await this.orderModel
      .findOne({ _id: orderId, user_id: new Types.ObjectId(userId) })
      .populate(
        'activity_id',
        'name image price images age_price_ranges branch_id schedule',
      )
    if (!order) throw new NotFoundException('Order not found')
    const bookings = await this.bookingModel.find({ order_id: order._id })
    // For still-PENDING orders the client needs a live Paycom URL to resume
    // the payment flow from the booking detail screen.
    let checkoutUrl: string | undefined
    if (order.status === OrderStatus.PENDING) {
      checkoutUrl = this.paycom.buildCheckoutUrl({
        orderId: (order._id as Types.ObjectId).toHexString(),
        amountUzs: order.total_amount,
      })
    }
    return { order, bookings, checkout_url: checkoutUrl }
  }

  /** Dev helper — see controller comment. */
  async mockPay(userId: string, orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException('Order not found')
    }
    const order = await this.orderModel.findOne({
      _id: orderId,
      user_id: new Types.ObjectId(userId),
    })
    if (!order) throw new NotFoundException('Order not found')

    const now = Date.now()
    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          status: OrderStatus.PAID,
          paid_amount: order.total_amount,
          paycom_transaction_id: `mock_${now}`,
          paycom_create_time: now,
          paycom_perform_time: now,
          paycom_state: 2,
        },
      },
    )
    const ticketNumbers = await this.assignTicketsForPaidOrder(
      order._id as Types.ObjectId,
    )
    return {
      order_id: (order._id as Types.ObjectId).toHexString(),
      status: 'paid',
      ticket_numbers: ticketNumbers,
    }
  }

  /**
   * Dev seeding helper — creates a pre-paid activity order with N confirmed
   * tickets for the authenticated user. Used by /api/dev/seed-paid-order to
   * populate demo data so the Calendar tab has something to render.
   */
  async seedPaidOrder(
    userId: string,
    opts: { activityId?: string; count?: number; ticketDate?: string } = {},
  ) {
    const count = Math.max(1, Math.min(opts.count ?? 3, 10))
    const ticketDate = opts.ticketDate ?? this.todayKey()

    let activity: any
    if (opts.activityId && Types.ObjectId.isValid(opts.activityId)) {
      activity = await this.activityModel.findOne({
        _id: opts.activityId,
        is_deleted: false,
        status: 'approved',
      })
    }
    activity ??= await this.activityModel.findOne({
      is_deleted: false,
      status: 'approved',
    })
    if (!activity) throw new NotFoundException('No activity available to seed')

    const unitPrice: number = activity.price ?? 0
    const items = [
      {
        age_from: activity.age_from,
        age_to: activity.age_to,
        unit_price: unitPrice,
        count,
      },
    ]
    const totalAmount = unitPrice * count

    const now = Date.now()
    const order = await this.orderModel.create({
      user_id: new Types.ObjectId(userId),
      activity_id: activity._id,
      items,
      total_amount: totalAmount,
      paid_amount: totalAmount,
      status: OrderStatus.PAID,
      paycom_transaction_id: `seed_${now}`,
      paycom_create_time: now,
      paycom_perform_time: now,
      paycom_state: 2,
    })
    const ticketNumbers = await this.reserveTicketNumbers(count, ticketDate)
    const bookings: Partial<Booking>[] = []
    for (let i = 0; i < count; i++) {
      bookings.push({
        order_id: order._id as any,
        user_id: new Types.ObjectId(userId),
        activity_id: activity._id as any,
        age_from: activity.age_from,
        age_to: activity.age_to,
        price: unitPrice,
        ticket_no: ticketNumbers[i],
        ticket_date: ticketDate,
        status: BookingStatus.CONFIRMED,
      })
    }
    await this.bookingModel.insertMany(bookings)

    return {
      order_id: (order._id as Types.ObjectId).toHexString(),
      activity_id: (activity._id as Types.ObjectId).toString(),
      total_amount: totalAmount,
      ticket_date: ticketDate,
      ticket_numbers: ticketNumbers,
      status: 'paid',
    }
  }
}
