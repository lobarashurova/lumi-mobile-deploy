import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

import {
  MultiLangText,
  MultiLangTextSchema,
} from './multi-lang-text.schema'

export type TariffDocument = HydratedDocument<Tariff>

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Tariff {
  @Prop({ type: MultiLangTextSchema, required: true })
  name: MultiLangText

  @Prop({ type: MultiLangTextSchema })
  description?: MultiLangText

  @Prop({ required: true, min: 0 })
  price: number

  @Prop({ default: 'UZS' })
  currency: string

  @Prop({ required: true, min: 1 })
  duration_days: number

  @Prop({ type: [MultiLangTextSchema], default: [] })
  features: MultiLangText[]

  @Prop({ default: true })
  is_active: boolean

  @Prop({ default: 0 })
  order: number

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const TariffSchema = SchemaFactory.createForClass(Tariff)
TariffSchema.index({ is_active: 1, is_deleted: 1 })
