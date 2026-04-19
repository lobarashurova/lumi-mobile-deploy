import { ApiProperty } from '@nestjs/swagger'
import { IsMongoId, IsOptional, IsString } from 'class-validator'

export class PurchaseSubscriptionDTO {
  @ApiProperty({ example: '68df…', description: 'Tariff / premium plan id' })
  @IsMongoId()
  tariff_id: string

  @ApiProperty({ example: 'PAYME', required: false })
  @IsOptional()
  @IsString()
  payment_method?: string
}
