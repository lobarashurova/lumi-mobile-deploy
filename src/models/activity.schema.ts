import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

import { Gender } from 'src/enums/gender.enum'

import { ActivityCategory } from './activity-category.schema'
import { Branch } from './branch.schema'
import {
  MultiLangText,
  MultiLangTextSchema,
} from './multi-lang-text.schema'

export type ActivityDocument = HydratedDocument<Activity>

@Schema({ _id: false })
export class ScheduleItem {
  @Prop({ required: true })
  day: string

  @Prop({ required: true })
  start_time: string

  @Prop({ required: true })
  end_time: string
}

export const ScheduleItemSchema = SchemaFactory.createForClass(ScheduleItem)

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Activity {
  @Prop({ type: MultiLangTextSchema, required: true })
  name: MultiLangText

  @Prop({ type: Types.ObjectId, ref: Branch.name, required: true })
  branch_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: ActivityCategory.name, required: true })
  category_id: Types.ObjectId

  @Prop({ required: true })
  age_from: number

  @Prop({ required: true })
  age_to: number

  @Prop({ required: true, enum: Gender })
  gender: Gender

  @Prop({ required: true })
  price: number

  @Prop({ default: false })
  has_age_pricing?: boolean

  @Prop({
    type: [{ age_from: Number, age_to: Number, price: Number }],
    default: [],
  })
  age_price_ranges?: Array<{ age_from: number; age_to: number; price: number }>

  @Prop({ default: 0 })
  discount_percentage: number

  @Prop({ type: [ScheduleItemSchema] })
  schedule?: ScheduleItem[]

  @Prop({ type: [ScheduleItemSchema] })
  work_hours?: ScheduleItem[]

  @Prop()
  image?: string

  @Prop({ type: [String], default: [] })
  images?: string[]

  @Prop({ type: MultiLangTextSchema })
  description?: MultiLangText

  @Prop({ type: MultiLangTextSchema })
  important_notes?: MultiLangText

  @Prop({ default: false })
  is_parent_control_required?: boolean

  @Prop()
  parent_control_age_from?: number

  @Prop()
  parent_control_age_to?: number

  @Prop({ type: MultiLangTextSchema })
  required_items?: MultiLangText

  @Prop()
  vimeo_link?: string

  @Prop()
  youtube_link?: string

  @Prop({ type: [String] })
  activity_languages?: string[]

  @Prop({ default: 'approved', enum: ['pending', 'approved', 'rejected'] })
  status?: string

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const ActivitySchema = SchemaFactory.createForClass(Activity)
ActivitySchema.index({ branch_id: 1 })
ActivitySchema.index({ category_id: 1 })
ActivitySchema.index({ is_deleted: 1 })
ActivitySchema.index({ status: 1 })
