import { Module } from '@nestjs/common'

import { AccessContorlService } from './access-control.service'

@Module({
  providers: [AccessContorlService],
  exports: [AccessContorlService],
})
export class SharedModule {}
