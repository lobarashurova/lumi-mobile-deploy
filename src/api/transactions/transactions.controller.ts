import { Body, Controller, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { User } from 'src/common/decarators/user.decarator'
import { UserDocument } from 'src/models/user.schema'

import { PurchaseSubscriptionDTO } from './dto/purchase-subscription.dto'
import { TransactionsService } from './transactions.service'

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('/api/transaction')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('subscriptions')
  async purchaseSubscription(
    @User() user: UserDocument,
    @Body() body: PurchaseSubscriptionDTO,
  ) {
    const data = await this.transactionsService.purchaseSubscription(user, body)
    return { data }
  }
}
