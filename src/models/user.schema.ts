import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

import { Role } from 'src/enums/role.enum'

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class User {
  @Prop({ required: true, unique: true })
  phone: string

  @Prop()
  first_name?: string

  @Prop()
  last_name?: string

  @Prop({ required: true, enum: Role, default: Role.USER })
  role: Role

  @Prop()
  avatar?: string

  @Prop()
  city?: string

  @Prop()
  district?: string

  @Prop({ default: false })
  is_deleted?: boolean

  @Prop()
  deleted_at?: Date
}

export const UserSchema = SchemaFactory.createForClass(User)
UserSchema.index({ phone: 1 }, { unique: true })
UserSchema.index({ is_deleted: 1 })
