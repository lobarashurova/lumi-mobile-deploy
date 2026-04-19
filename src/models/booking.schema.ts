import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

import { Activity } from './activity.schema'
import { Order } from './order.schema'
import { User } from './user.schema'

export type BookingDocument = HydratedDocument<Booking>

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: Order.name, required: true })
  order_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: Activity.name, required: true })
  activity_id: Types.ObjectId

  @Prop({ required: true })
  age_from: number

  @Prop({ required: true })
  age_to: number

  @Prop({ required: true })
  price: number

  /** Assigned only when the order flips to PAID. Null for pending orders. */
  @Prop()
  ticket_no?: string

  @Prop({ required: true })
  ticket_date: string

  @Prop({ required: true, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus
}

export const BookingSchema = SchemaFactory.createForClass(Booking)
BookingSchema.index({ order_id: 1 })
BookingSchema.index({ user_id: 1, created_at: -1 })
BookingSchema.index({ activity_id: 1 })
BookingSchema.index({ ticket_date: 1, ticket_no: 1 }, { unique: true })
