import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type SubscriptionDocument = HydratedDocument<Subscription>

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  parent_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'PremiumPlan', required: true })
  tariff_id: Types.ObjectId

  @Prop({ required: true })
  start_date: Date

  @Prop({ required: true })
  end_date: Date

  @Prop({
    required: true,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus

  @Prop({ default: 0 })
  coins: number

  @Prop({ default: 0 })
  amount: number

  @Prop()
  payment_method?: string
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription)
SubscriptionSchema.index({ parent_id: 1, status: 1 })
SubscriptionSchema.index({ end_date: 1 })
