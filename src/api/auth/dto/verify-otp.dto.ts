import { IsString, Length, Matches } from 'class-validator'

export class VerifyOtpDTO {
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Phone number must be in format +998XXXXXXXXX',
  })
  phone: string

  @IsString()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  code: string
}
