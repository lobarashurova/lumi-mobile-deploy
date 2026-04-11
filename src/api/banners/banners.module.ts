import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { Banner, BannerSchema } from 'src/models/banner.schema'

import { BannersController } from './banners.controller'
import { BannersService } from './banners.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
  ],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
