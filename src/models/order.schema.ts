import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

import { Activity } from './activity.schema'
import { User } from './user.schema'

export type OrderDocument = HydratedDocument<Order>

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELED = 'canceled',
}

export enum PaycomTransactionState {
  CREATED = 1,
  COMPLETED = 2,
  CANCELED_AFTER_CREATE = -1,
  CANCELED_AFTER_COMPLETE = -2,
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  age_from: number

  @Prop({ required: true })
  age_to: number

  @Prop({ required: true })
  unit_price: number

  @Prop({ required: true, min: 1 })
  count: number
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem)

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: Activity.name, required: true })
  activity_id: Types.ObjectId

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[]

  @Prop({ required: true })
  total_amount: number

  @Prop({ required: true, default: 0 })
  paid_amount: number

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus

  @Prop()
  paycom_transaction_id?: string

  @Prop()
  paycom_create_time?: number

  @Prop()
  paycom_perform_time?: number

  @Prop()
  paycom_cancel_time?: number

  @Prop({ type: Number })
  paycom_state?: PaycomTransactionState

  @Prop({ type: Number })
  paycom_reason?: number
}

export const OrderSchema = SchemaFactory.createForClass(Order)
OrderSchema.index({ user_id: 1, created_at: -1 })
OrderSchema.index({ activity_id: 1 })
OrderSchema.index({ paycom_transaction_id: 1 })
OrderSchema.index({ status: 1 })
