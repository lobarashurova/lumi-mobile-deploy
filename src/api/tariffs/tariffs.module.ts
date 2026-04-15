import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Tariff, TariffSchema } from 'src/models/tariff.schema'

import { TariffsController } from './tariffs.controller'
import { TariffsService } from './tariffs.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tariff.name, schema: TariffSchema }]),
  ],
  controllers: [TariffsController],
  providers: [TariffsService],
  exports: [TariffsService],
})
export class TariffsModule {}
