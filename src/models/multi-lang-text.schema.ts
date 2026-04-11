import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class MultiLangText {
  @Prop({ default: '' })
  uz: string

  @Prop({ default: '' })
  ru: string

  @Prop({ default: '' })
  en: string
}

export const MultiLangTextSchema = SchemaFactory.createForClass(MultiLangText)
