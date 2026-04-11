import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type OtpDocument = HydratedDocument<Otp>

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Otp {
  @Prop({ required: true })
  phone: string

  @Prop({ required: true })
  code: string

  @Prop({ required: true })
  expires_at: Date

  @Prop({ default: false })
  is_used: boolean
}

export const OtpSchema = SchemaFactory.createForClass(Otp)
OtpSchema.index({ phone: 1 })
OtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
