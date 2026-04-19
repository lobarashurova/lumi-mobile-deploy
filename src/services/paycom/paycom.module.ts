import { Global, Module } from '@nestjs/common'

import { PaycomService } from './paycom.service'

@Global()
@Module({
  providers: [PaycomService],
  exports: [PaycomService],
})
export class PaycomModule {}
