import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import {
  Subscription,
  SubscriptionStatus,
} from 'src/models/subscription.schema'
import { Tariff } from 'src/models/tariff.schema'
import { UserDocument } from 'src/models/user.schema'

import { PurchaseSubscriptionDTO } from './dto/purchase-subscription.dto'

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(Tariff.name) private readonly tariffModel: Model<Tariff>,
  ) {}

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

    const startDate = new Date()
    const endDate = new Date(
      startDate.getTime() + tariff.duration_days * 24 * 60 * 60 * 1000,
    )

    // Supersede any currently active subscription for this user.
    await this.subscriptionModel.updateMany(
      { parent_id: user._id, status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.EXPIRED } },
    )

    const sub = await this.subscriptionModel.create({
      parent_id: user._id,
      tariff_id: tariff._id,
      start_date: startDate,
      end_date: endDate,
      status: SubscriptionStatus.ACTIVE,
      coins: (tariff as any).activities_limit ?? 0,
      amount: tariff.price,
      payment_method: dto.payment_method ?? 'PAYME',
    })

    // Match the client's PurchaseResponse freezed shape (snake_case keys).
    return {
      id: sub._id.toString(),
      parent_id: (sub.parent_id as Types.ObjectId).toString(),
      tariff_id: (sub.tariff_id as Types.ObjectId).toString(),
      start_date: sub.start_date.toISOString(),
      end_date: sub.end_date.toISOString(),
      status: sub.status,
      coins: sub.coins,
      amount: sub.amount,
    }
  }
}
