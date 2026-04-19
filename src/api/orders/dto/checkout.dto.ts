import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator'

export class CheckoutItemDTO {
  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(0)
  age_from: number

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(0)
  age_to: number

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  count: number
}

export class CheckoutDTO {
  @ApiProperty({ example: '67890abc...' })
  @IsMongoId()
  activity_id: string

  @ApiProperty({ type: [CheckoutItemDTO] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDTO)
  items: CheckoutItemDTO[]

  @ApiProperty({
    example: '2026-05-12',
    description:
      'YYYY-MM-DD — the date the tickets are valid for. Must match one of the activity.schedule[].day weekdays and be today or in the future.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'ticket_date must be YYYY-MM-DD' })
  ticket_date: string

  @ApiProperty({ required: false, description: 'Optional language for Paycom checkout (uz|ru|en)' })
  @IsOptional()
  lang?: 'uz' | 'ru' | 'en'

  @ApiProperty({ required: false, description: 'Optional return URL after Paycom checkout' })
  @IsOptional()
  return_url?: string

  @ApiProperty({
    required: false,
    description:
      'If true, generate the sandbox checkout URL (https://test.paycom.uz) so test cards can be used.',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  test?: boolean
}
