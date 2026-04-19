import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

/**
 * Minimal DTO for creating/updating a child profile from the mobile app.
 * The mobile only collects first name + age; we derive `dob` from age (or
 * vice versa) on the server. Any other field the client sends is silently
 * stripped by the global ValidationPipe (whitelist=true).
 */
export class CreateChildUserDTO {
  @IsOptional()
  @IsString()
  first_name?: string

  /** ISO date string "yyyy-MM-dd". */
  @IsOptional()
  @IsString()
  dob?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(25)
  age?: number
}
