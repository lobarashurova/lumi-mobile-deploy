import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator'

export class PurchaseSubscriptionDTO {
  @ApiProperty({ example: '68df…', description: 'Tariff / premium plan id' })
  @IsMongoId()
  tariff_id: string

  @ApiProperty({ example: 'PAYME', required: false })
  @IsOptional()
  @IsString()
  payment_method?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lang?: 'uz' | 'ru' | 'en'

  @ApiProperty({
    required: false,
    description:
      'If true, routes Paycom checkout through the sandbox (test.paycom.uz).',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  test?: boolean
}
