import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
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

  @ApiProperty({ required: false, description: 'Optional language for Paycom checkout (uz|ru|en)' })
  @IsOptional()
  lang?: 'uz' | 'ru' | 'en'

  @ApiProperty({ required: false, description: 'Optional return URL after Paycom checkout' })
  @IsOptional()
  return_url?: string
}
