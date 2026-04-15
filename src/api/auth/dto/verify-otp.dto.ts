import { IsString, Length, Matches } from 'class-validator'

export class VerifyOtpDTO {
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Phone number must be in format +998XXXXXXXXX',
  })
  phone: string

  @IsString()
  @Length(4, 4, { message: 'OTP code must be 4 digits' })
  code: string
}
