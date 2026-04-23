import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiHeader, ApiTags } from '@nestjs/swagger'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { Public } from 'src/common/decarators/public.decarator'
import { Order } from 'src/models/order.schema'
import { User } from 'src/models/user.schema'

import { AdminApiKeyGuard } from './admin-api-key.guard'

@ApiTags('Admin')
@ApiHeader({ name: 'x-admin-key', required: true })
@Public()
@UseGuards(AdminApiKeyGuard)
@Controller('/api/admin')
export class AdminController {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  @Get('orders')
  async listOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (p - 1) * l

    const filter: Record<string, any> = {}
    if (status) filter.status = status

    let userIds: string[] | undefined
    if (search) {
      const regex = new RegExp(search, 'i')
      const users = await this.userModel
        .find({
          $or: [{ phone: regex }, { first_name: regex }, { last_name: regex }],
        })
        .select('_id')
        .lean()
      userIds = users.map((u: any) => u._id)
      if (userIds.length === 0) {
        return { data: [], total: 0, page: p, limit: l, pages: 0 }
      }
      filter.user_id = { $in: userIds }
    }

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('user_id', 'phone first_name last_name avatar city')
        .populate('activity_id', 'name price')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      this.orderModel.countDocuments(filter),
    ])

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) }
  }

  @Get('users')
  async listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (p - 1) * l

    const filter: Record<string, any> = { is_deleted: { $ne: true } }
    if (search) {
      const regex = new RegExp(search, 'i')
      filter.$or = [
        { phone: regex },
        { first_name: regex },
        { last_name: regex },
        { city: regex },
      ]
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      this.userModel.countDocuments(filter),
    ])

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) }
  }
}
