import { Module } from '@nestjs/common'

import {
  UploadsController,
  UploadsServeController,
} from './uploads.controller'

@Module({
  controllers: [UploadsController, UploadsServeController],
})
export class UploadsModule {}
