import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Order, OrderStatus, OrderType } from 'src/models/order.schema'
import {
  Subscription,
  SubscriptionStatus,
} from 'src/models/subscription.schema'
import { Tariff } from 'src/models/tariff.schema'
import { UserDocument } from 'src/models/user.schema'
import { PaycomService } from 'src/services/paycom/paycom.service'

import { PurchaseSubscriptionDTO } from './dto/purchase-subscription.dto'

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(Tariff.name) private readonly tariffModel: Model<Tariff>,
    private readonly paycom: PaycomService,
  ) {}

  /**
   * Creates a PENDING subscription Order and returns a Paycom checkout URL.
   * The actual Subscription row is only created by PaycomMerchantService
   * when `PerformTransaction` fires and the order flips to PAID.
   */
  async purchaseSubscription(
    user: UserDocument,
    dto: PurchaseSubscriptionDTO,
  ) {
    if (!Types.ObjectId.isValid(dto.tariff_id)) {
      throw new NotFoundException('Tariff not found')
    }
    const tariff = await this.tariffModel.findOne({
      _id: dto.tariff_id,
      is_deleted: false,
      is_active: true,
    })
    if (!tariff) throw new NotFoundException('Tariff not found')
    if (tariff.price <= 0) {
      throw new BadRequestException('Tariff has no price configured')
    }

    const order = await this.orderModel.create({
      user_id: user._id,
      type: OrderType.SUBSCRIPTION,
      tariff_id: tariff._id,
      items: [],
      total_amount: tariff.price,
      paid_amount: 0,
      status: OrderStatus.PENDING,
    })

    const checkoutUrl = this.paycom.buildCheckoutUrl({
      orderId: (order._id as Types.ObjectId).toHexString(),
      amountUzs: tariff.price,
      lang: dto.lang,
      test: dto.test ?? false,
    })

    return {
      order_id: (order._id as Types.ObjectId).toHexString(),
      tariff_id: (tariff._id as Types.ObjectId).toString(),
      total_amount: tariff.price,
      currency: tariff.currency ?? 'UZS',
      status: order.status,
      checkout_url: checkoutUrl,
      duration_days: tariff.duration_days,
    }
  }

  /**
   * Returns the user's currently active subscription (if any), for clients
   * that want to show "Premium until <date>" chips.
   */
  async getActiveSubscription(user: UserDocument) {
    const sub = await this.subscriptionModel
      .findOne({
        parent_id: user._id,
        status: SubscriptionStatus.ACTIVE,
        end_date: { $gt: new Date() },
      })
      .sort({ end_date: -1 })
      .lean()
    if (!sub) return null
    return {
      id: sub._id.toString(),
      tariff_id: (sub.tariff_id as Types.ObjectId).toString(),
      start_date: sub.start_date.toISOString(),
      end_date: sub.end_date.toISOString(),
      status: sub.status,
      coins: sub.coins,
      amount: sub.amount,
    }
  }
}
