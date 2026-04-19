import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { User } from 'src/common/decarators/user.decarator'
import { UserDocument } from 'src/models/user.schema'

import { CheckoutDTO } from './dto/checkout.dto'
import { OrdersService } from './orders.service'

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('/api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  async checkout(@User() user: UserDocument, @Body() dto: CheckoutDTO) {
    const data = await this.ordersService.checkout(
      (user._id as any).toString(),
      dto,
    )
    return { data }
  }

  @Get()
  async list(
    @User() user: UserDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findUserOrders(
      (user._id as any).toString(),
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    )
  }

  @Get(':id')
  async findOne(@User() user: UserDocument, @Param('id') id: string) {
    const data = await this.ordersService.findOne(
      (user._id as any).toString(),
      id,
    )
    return { data }
  }

  /**
   * Dev-only helper: flips a user's PENDING order to PAID and its bookings
   * to CONFIRMED without going through Paycom. Intended for UI demos while
   * sandbox cards aren't wired up. Remove or gate behind an env flag before
   * shipping to real users.
   */
  @Patch(':id/mock-pay')
  async mockPay(@User() user: UserDocument, @Param('id') id: string) {
    const data = await this.ordersService.mockPay(
      (user._id as any).toString(),
      id,
    )
    return { data }
  }
}
