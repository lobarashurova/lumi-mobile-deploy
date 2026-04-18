import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

/**
 * Superset DTO that tolerates the client's full ChildModel payload.
 * Unknown keys are stripped by the per-handler ValidationPipe, so we don't
 * need to model every trial/flag field the client may send.
 */
export class CreateChildUserDTO {
  @IsOptional()
  @IsString()
  first_name?: string

  @IsOptional()
  @IsString()
  last_name?: string

  /** Legacy single-name field — kept for parity with the original Child DTO. */
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(25)
  age?: number

  /** ISO date string "yyyy-MM-dd". */
  @IsOptional()
  @IsString()
  dob?: string

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  district?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsBoolean()
  has_photo?: boolean
}
