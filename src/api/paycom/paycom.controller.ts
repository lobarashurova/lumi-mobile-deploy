import { Body, Controller, Headers, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'
import { PaycomService } from 'src/services/paycom/paycom.service'

import { PAYCOM_ERRORS } from './paycom.errors'
import { PaycomMerchantService } from './paycom.service'

@ApiTags('Paycom')
@Controller('/api/paycom')
export class PaycomController {
  constructor(
    private readonly merchant: PaycomMerchantService,
    private readonly paycom: PaycomService,
  ) {}

  @Public()
  @Post('merchant')
  async handle(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    const id = body?.id ?? null
    if (!this.paycom.verifyAuth(authorization)) {
      return { jsonrpc: '2.0', id, error: PAYCOM_ERRORS.AUTH }
    }
    if (!body?.method) {
      return { jsonrpc: '2.0', id, error: PAYCOM_ERRORS.PARSE }
    }

    let outcome: { result?: any; error?: any }
    switch (body.method) {
      case 'CheckPerformTransaction':
        outcome = await this.merchant.checkPerformTransaction(body.params)
        break
      case 'CreateTransaction':
        outcome = await this.merchant.createTransaction(body.params)
        break
      case 'PerformTransaction':
        outcome = await this.merchant.performTransaction(body.params)
        break
      case 'CancelTransaction':
        outcome = await this.merchant.cancelTransaction(body.params)
        break
      case 'CheckTransaction':
        outcome = await this.merchant.checkTransaction(body.params)
        break
      case 'GetStatement':
        outcome = await this.merchant.getStatement(body.params)
        break
      default:
        outcome = { error: PAYCOM_ERRORS.METHOD }
    }

    return { jsonrpc: '2.0', id, ...outcome }
  }
}
