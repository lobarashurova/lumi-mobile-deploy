import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type TicketCounterDocument = HydratedDocument<TicketCounter>

/**
 * Per-day ticket number counter.
 * Each booked ticket atomically increments `last_no` for its day.
 * `date` is stored as YYYY-MM-DD (UTC) for predictable rollover.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class TicketCounter {
  @Prop({ required: true, unique: true })
  date: string

  @Prop({ required: true, default: 0 })
  last_no: number
}

export const TicketCounterSchema = SchemaFactory.createForClass(TicketCounter)
TicketCounterSchema.index({ date: 1 }, { unique: true })
