import { IsString, Matches } from 'class-validator'

export class SendOtpDTO {
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Phone number must be in format +998XXXXXXXXX',
  })
  phone: string
}
