import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateChildDTO {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  name: string

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Max(25)
  age: number

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string

  @ApiPropertyOptional({ example: '/uploads/abc.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string
}
