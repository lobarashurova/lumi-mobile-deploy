import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

import {
  MultiLangText,
  MultiLangTextSchema,
} from './multi-lang-text.schema'

export type BannerDocument = HydratedDocument<Banner>

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Banner {
  @Prop({ type: MultiLangTextSchema, required: true })
  image: MultiLangText

  @Prop({ type: MultiLangTextSchema })
  title?: MultiLangText

  @Prop({ type: MultiLangTextSchema })
  description?: MultiLangText

  @Prop()
  link?: string

  @Prop({ type: [String], default: [] })
  tags: string[]

  @Prop({ default: true })
  is_active: boolean

  @Prop({ default: 0 })
  order: number

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const BannerSchema = SchemaFactory.createForClass(Banner)
BannerSchema.index({ is_deleted: 1 })
BannerSchema.index({ is_active: 1 })
