import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

import {
  MultiLangText,
  MultiLangTextSchema,
} from './multi-lang-text.schema'

export type BranchDocument = HydratedDocument<Branch>

@Schema({ _id: false })
export class Location {
  @Prop({ required: true })
  lat: number

  @Prop({ required: true })
  lng: number
}

export const LocationSchema = SchemaFactory.createForClass(Location)

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Branch {
  @Prop({ required: true })
  title: string

  @Prop()
  landmark?: string

  @Prop({ type: MultiLangTextSchema })
  address?: MultiLangText

  @Prop({ type: MultiLangTextSchema })
  description?: MultiLangText

  @Prop({ type: LocationSchema })
  location?: Location

  @Prop({ type: Types.ObjectId, required: true })
  partner_id: Types.ObjectId

  @Prop()
  manager_full_name?: string

  @Prop()
  manager_phone?: string

  @Prop({ type: [String], default: [] })
  images: string[]

  @Prop({ default: 'approved', enum: ['pending', 'approved', 'rejected'] })
  status?: string

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const BranchSchema = SchemaFactory.createForClass(Branch)
BranchSchema.index({ partner_id: 1 })
BranchSchema.index({ is_deleted: 1 })
BranchSchema.index({ status: 1 })
