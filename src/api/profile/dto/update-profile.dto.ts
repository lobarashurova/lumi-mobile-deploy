import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateProfileDTO {
  @IsOptional()
  @IsString()
  @MinLength(2)
  first_name?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string

  @IsOptional()
  @IsString()
  avatar?: string
}
