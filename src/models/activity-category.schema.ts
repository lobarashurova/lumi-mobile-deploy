import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

import { ActivityCategoryType } from 'src/enums/activity-category-type.enum'

import {
  MultiLangText,
  MultiLangTextSchema,
} from './multi-lang-text.schema'

export type ActivityCategoryDocument = HydratedDocument<ActivityCategory>

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ActivityCategory {
  @Prop({ type: MultiLangTextSchema, required: true })
  name: MultiLangText

  @Prop({ required: true, enum: ActivityCategoryType })
  type: ActivityCategoryType

  @Prop()
  image?: string

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const ActivityCategorySchema =
  SchemaFactory.createForClass(ActivityCategory)
ActivityCategorySchema.index({ type: 1 })
ActivityCategorySchema.index({ is_deleted: 1 })
