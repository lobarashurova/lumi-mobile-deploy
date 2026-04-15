import { IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class RegisterDTO {
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Phone number must be in format +998XXXXXXXXX',
  })
  phone: string

  @IsString()
  @MinLength(2)
  first_name: string

  @IsOptional()
  @IsString()
  last_name?: string
}
