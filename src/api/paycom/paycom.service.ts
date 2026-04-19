import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import {
  Booking,
  BookingStatus,
} from 'src/models/booking.schema'
import {
  Order,
  OrderStatus,
  OrderType,
  PaycomTransactionState,
} from 'src/models/order.schema'
import {
  Subscription,
  SubscriptionStatus,
} from 'src/models/subscription.schema'
import { Tariff } from 'src/models/tariff.schema'

import { PAYCOM_ERRORS } from './paycom.errors'

const TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000

@Injectable()
export class PaycomMerchantService {
  private readonly logger = new Logger('PaycomMerchantService')

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(Tariff.name) private readonly tariffModel: Model<Tariff>,
  ) {}

  /**
   * Side effects after an order flips to PAID. Activity orders confirm
   * bookings; subscription orders supersede any active subscription and
   * create a new one that expires at now + tariff.duration_days.
   */
  private async onOrderPaid(order: any) {
    if (order.type === OrderType.SUBSCRIPTION && order.tariff_id) {
      const tariff = await this.tariffModel.findOne({
        _id: order.tariff_id,
      })
      if (!tariff) {
        this.logger.warn(
          `onOrderPaid: subscription order ${order._id} references missing tariff ${order.tariff_id}`,
        )
        return
      }
      await this.subscriptionModel.updateMany(
        {
          parent_id: order.user_id,
          status: SubscriptionStatus.ACTIVE,
        },
        { $set: { status: SubscriptionStatus.EXPIRED } },
      )
      const startDate = new Date()
      const endDate = new Date(
        startDate.getTime() + tariff.duration_days * 24 * 60 * 60 * 1000,
      )
      await this.subscriptionModel.create({
        parent_id: order.user_id,
        tariff_id: tariff._id,
        start_date: startDate,
        end_date: endDate,
        status: SubscriptionStatus.ACTIVE,
        coins: (tariff as any).activities_limit ?? 0,
        amount: tariff.price,
        payment_method: 'PAYME',
      })
      this.logger.log(
        `Subscription activated for user=${order.user_id} until=${endDate.toISOString()}`,
      )
      return
    }
    // Default: activity — confirm all tickets.
    await this.bookingModel.updateMany(
      { order_id: order._id },
      { $set: { status: BookingStatus.CONFIRMED } },
    )
  }

  private err(error: { code: number; message: any }, data?: any) {
    return { error: { ...error, data } }
  }

  private async loadOrder(orderId?: string) {
    if (!orderId) {
      this.logger.warn('loadOrder: missing transaction_id in account')
      return null
    }
    if (!Types.ObjectId.isValid(orderId)) {
      this.logger.warn(`loadOrder: invalid ObjectId format "${orderId}"`)
      return null
    }
    const order = await this.orderModel.findById(orderId)
    if (!order) {
      this.logger.warn(
        `loadOrder: no order with _id=${orderId} in collection "${this.orderModel.collection.collectionName}" db="${this.orderModel.db.name}"`,
      )
    }
    return order
  }

  async checkPerformTransaction(params: any) {
    const orderId: string | undefined = params?.account?.transaction_id
    const amount: number | undefined = params?.amount
    const order = await this.loadOrder(orderId)
    if (!order) return this.err(PAYCOM_ERRORS.ORDER_NOT_FOUND, 'transaction_id')
    if (order.status === OrderStatus.PAID) {
      return this.err(PAYCOM_ERRORS.ORDER_UNAVAILABLE, 'transaction_id')
    }
    if (Math.round(order.total_amount * 100) !== amount) {
      return this.err(PAYCOM_ERRORS.INVALID_AMOUNT)
    }
    return { result: { allow: true } }
  }

  async createTransaction(params: any) {
    const txId: string = params?.id
    const time: number = params?.time
    const amount: number = params?.amount
    const orderId: string | undefined = params?.account?.transaction_id
    if (!txId || !time || !amount) return this.err(PAYCOM_ERRORS.PARSE)

    const order = await this.loadOrder(orderId)
    if (!order) return this.err(PAYCOM_ERRORS.ORDER_NOT_FOUND, 'transaction_id')
    if (order.status === OrderStatus.PAID) {
      return this.err(PAYCOM_ERRORS.ORDER_UNAVAILABLE, 'transaction_id')
    }
    if (Math.round(order.total_amount * 100) !== amount) {
      return this.err(PAYCOM_ERRORS.INVALID_AMOUNT)
    }

    if (order.paycom_transaction_id && order.paycom_transaction_id !== txId) {
      return this.err(PAYCOM_ERRORS.CANNOT_PERFORM)
    }

    if (order.paycom_transaction_id === txId) {
      if (order.paycom_state !== PaycomTransactionState.CREATED) {
        return this.err(PAYCOM_ERRORS.CANNOT_PERFORM)
      }
      if (Date.now() - (order.paycom_create_time || 0) > TRANSACTION_TIMEOUT_MS) {
        await this.orderModel.updateOne(
          { _id: order._id },
          {
            $set: {
              status: OrderStatus.CANCELED,
              paycom_state: PaycomTransactionState.CANCELED_AFTER_CREATE,
              paycom_cancel_time: Date.now(),
              paycom_reason: 4,
            },
          },
        )
        return this.err(PAYCOM_ERRORS.CANNOT_PERFORM)
      }
      return {
        result: {
          create_time: order.paycom_create_time,
          transaction: (order._id as Types.ObjectId).toHexString(),
          state: PaycomTransactionState.CREATED,
        },
      }
    }

    const createTime = Date.now()
    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          paycom_transaction_id: txId,
          paycom_create_time: createTime,
          paycom_state: PaycomTransactionState.CREATED,
        },
      },
    )

    return {
      result: {
        create_time: createTime,
        transaction: (order._id as Types.ObjectId).toHexString(),
        state: PaycomTransactionState.CREATED,
      },
    }
  }

  async performTransaction(params: any) {
    const txId: string = params?.id
    if (!txId) return this.err(PAYCOM_ERRORS.PARSE)
    const order = await this.orderModel.findOne({
      paycom_transaction_id: txId,
    })
    if (!order) return this.err(PAYCOM_ERRORS.TRANSACTION_NOT_FOUND)

    if (order.paycom_state === PaycomTransactionState.COMPLETED) {
      return {
        result: {
          transaction: (order._id as Types.ObjectId).toHexString(),
          perform_time: order.paycom_perform_time,
          state: PaycomTransactionState.COMPLETED,
        },
      }
    }

    if (order.paycom_state !== PaycomTransactionState.CREATED) {
      return this.err(PAYCOM_ERRORS.CANNOT_PERFORM)
    }

    if (Date.now() - (order.paycom_create_time || 0) > TRANSACTION_TIMEOUT_MS) {
      await this.orderModel.updateOne(
        { _id: order._id },
        {
          $set: {
            status: OrderStatus.CANCELED,
            paycom_state: PaycomTransactionState.CANCELED_AFTER_CREATE,
            paycom_cancel_time: Date.now(),
            paycom_reason: 4,
          },
        },
      )
      return this.err(PAYCOM_ERRORS.CANNOT_PERFORM)
    }

    const performTime = Date.now()
    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          status: OrderStatus.PAID,
          paid_amount: order.total_amount,
          paycom_perform_time: performTime,
          paycom_state: PaycomTransactionState.COMPLETED,
        },
      },
    )
    await this.onOrderPaid(order)

    return {
      result: {
        transaction: (order._id as Types.ObjectId).toHexString(),
        perform_time: performTime,
        state: PaycomTransactionState.COMPLETED,
      },
    }
  }

  async cancelTransaction(params: any) {
    const txId: string = params?.id
    const reason: number = params?.reason ?? 0
    if (!txId) return this.err(PAYCOM_ERRORS.PARSE)
    const order = await this.orderModel.findOne({
      paycom_transaction_id: txId,
    })
    if (!order) return this.err(PAYCOM_ERRORS.TRANSACTION_NOT_FOUND)

    if (
      order.paycom_state === PaycomTransactionState.CANCELED_AFTER_CREATE ||
      order.paycom_state === PaycomTransactionState.CANCELED_AFTER_COMPLETE
    ) {
      return {
        result: {
          transaction: (order._id as Types.ObjectId).toHexString(),
          cancel_time: order.paycom_cancel_time,
          state: order.paycom_state,
        },
      }
    }

    const cancelTime = Date.now()
    const newState =
      order.paycom_state === PaycomTransactionState.COMPLETED
        ? PaycomTransactionState.CANCELED_AFTER_COMPLETE
        : PaycomTransactionState.CANCELED_AFTER_CREATE

    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          status: OrderStatus.CANCELED,
          paycom_cancel_time: cancelTime,
          paycom_state: newState,
          paycom_reason: reason,
        },
      },
    )
    await this.bookingModel.updateMany(
      { order_id: order._id },
      { $set: { status: BookingStatus.CANCELED } },
    )

    return {
      result: {
        transaction: (order._id as Types.ObjectId).toHexString(),
        cancel_time: cancelTime,
        state: newState,
      },
    }
  }

  async checkTransaction(params: any) {
    const txId: string = params?.id
    if (!txId) return this.err(PAYCOM_ERRORS.PARSE)
    const order = await this.orderModel.findOne({
      paycom_transaction_id: txId,
    })
    if (!order) return this.err(PAYCOM_ERRORS.TRANSACTION_NOT_FOUND)
    return {
      result: {
        create_time: order.paycom_create_time || 0,
        perform_time: order.paycom_perform_time || 0,
        cancel_time: order.paycom_cancel_time || 0,
        transaction: (order._id as Types.ObjectId).toHexString(),
        state: order.paycom_state,
        reason: order.paycom_reason ?? null,
      },
    }
  }

  async getStatement(params: any) {
    const from: number = params?.from
    const to: number = params?.to
    if (!from || !to) return this.err(PAYCOM_ERRORS.PARSE)
    const orders = await this.orderModel
      .find({
        paycom_create_time: { $gte: from, $lte: to },
        paycom_transaction_id: { $exists: true },
      })
      .sort({ paycom_create_time: 1 })
    return {
      result: {
        transactions: orders.map((o) => ({
          id: o.paycom_transaction_id,
          time: o.paycom_create_time,
          amount: Math.round(o.total_amount * 100),
          account: { transaction_id: (o._id as Types.ObjectId).toHexString() },
          create_time: o.paycom_create_time || 0,
          perform_time: o.paycom_perform_time || 0,
          cancel_time: o.paycom_cancel_time || 0,
          transaction: (o._id as Types.ObjectId).toHexString(),
          state: o.paycom_state,
          reason: o.paycom_reason ?? null,
        })),
      },
    }
  }
}
