import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type ChildDocument = HydratedDocument<Child>

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Child {
  @Prop()
  name?: string

  @Prop({ min: 0, max: 25 })
  age?: number

  @Prop()
  first_name?: string

  @Prop()
  last_name?: string

  /** ISO date string "yyyy-MM-dd". */
  @Prop()
  dob?: string

  @Prop()
  gender?: string

  @Prop()
  avatar?: string

  @Prop()
  city?: string

  @Prop()
  district?: string

  @Prop({ default: false })
  has_photo?: boolean

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  parent_id: Types.ObjectId

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const ChildSchema = SchemaFactory.createForClass(Child)
ChildSchema.index({ parent_id: 1, is_deleted: 1 })
