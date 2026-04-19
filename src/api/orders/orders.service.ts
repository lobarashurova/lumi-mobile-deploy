import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,
    @InjectModel(TicketCounter.name)
    private readonly ticketCounterModel: Model<TicketCounter>,
    private readonly paycom: PaycomService,
  ) {}

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private async reserveTicketNumbers(count: number): Promise<string[]> {
    const date = this.todayKey()
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

    const totalCount = validatedItems.reduce((s, it) => s + it.count, 0)
    const ticketNumbers = await this.reserveTicketNumbers(totalCount)
    const ticketDate = this.todayKey()

    const bookingDocs: Partial<Booking>[] = []
    let cursor = 0
    for (const it of validatedItems) {
      for (let i = 0; i < it.count; i++) {
        bookingDocs.push({
          order_id: order._id as any,
          user_id: new Types.ObjectId(userId),
          activity_id: activity._id as any,
          age_from: it.age_from,
          age_to: it.age_to,
          price: it.unit_price,
          ticket_no: ticketNumbers[cursor++],
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
      ticket_numbers: ticketNumbers,
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
      .populate('activity_id', 'name image price images age_price_ranges')
    if (!order) throw new NotFoundException('Order not found')
    const bookings = await this.bookingModel.find({ order_id: order._id })
    return { order, bookings }
  }
}
