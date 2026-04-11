import { IsString } from 'class-validator'

export class MultiLangTextDTO {
  @IsString()
  uz: string

  @IsString()
  ru: string

  @IsString()
  en: string
}
