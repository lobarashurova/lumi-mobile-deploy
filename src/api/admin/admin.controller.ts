import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiHeader, ApiTags } from '@nestjs/swagger'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

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

    const matchStage: Record<string, any> = { is_deleted: { $ne: true } }
    if (search) {
      const regex = new RegExp(search, 'i')
      matchStage.$or = [
        { phone: regex },
        { first_name: regex },
        { last_name: regex },
        { city: regex },
      ]
    }

    const pipeline: any[] = [
      { $match: matchStage },
      { $sort: { created_at: -1 } },
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user_id', '$$userId'] },
                status: 'paid',
                type: 'subscription',
              },
            },
            { $limit: 1 },
          ],
          as: 'paid_subscriptions',
        },
      },
      {
        $addFields: {
          is_premium: { $gt: [{ $size: '$paid_subscriptions' }, 0] },
        },
      },
      { $project: { paid_subscriptions: 0 } },
    ]

    const [data, total] = await Promise.all([
      this.userModel.aggregate([...pipeline, { $skip: skip }, { $limit: l }]),
      this.userModel.countDocuments(matchStage),
    ])

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) }
  }

  @Get('paid-users')
  async listPaidUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (p - 1) * l

    const userMatchStage: Record<string, any> = { is_deleted: { $ne: true } }
    if (search) {
      const regex = new RegExp(search, 'i')
      userMatchStage.$or = [
        { phone: regex },
        { first_name: regex },
        { last_name: regex },
        { city: regex },
      ]
    }

    // Aggregate: find all users who have at least one paid order
    const pipeline: any[] = [
      {
        $match: {
          status: 'paid',
        },
      },
      {
        $group: {
          _id: '$user_id',
          orders_count: { $sum: 1 },
          total_paid: { $sum: '$paid_amount' },
          last_paid_at: { $max: '$paycom_perform_time' },
          last_order_at: { $max: '$created_at' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $match: { 'user.is_deleted': { $ne: true } } },
    ]

    if (search) {
      const regex = new RegExp(search, 'i')
      pipeline.push({
        $match: {
          $or: [
            { 'user.phone': regex },
            { 'user.first_name': regex },
            { 'user.last_name': regex },
            { 'user.city': regex },
          ],
        },
      })
    }

    const countPipeline = [...pipeline, { $count: 'total' }]
    const dataPipeline = [
      ...pipeline,
      { $sort: { total_paid: -1 } },
      { $skip: skip },
      { $limit: l },
      {
        $project: {
          _id: 0,
          user_id: '$_id',
          orders_count: 1,
          total_paid: 1,
          last_paid_at: 1,
          last_order_at: 1,
          phone: '$user.phone',
          first_name: '$user.first_name',
          last_name: '$user.last_name',
          avatar: '$user.avatar',
          city: '$user.city',
          district: '$user.district',
          registered_at: '$user.created_at',
        },
      },
    ]

    const [data, countResult] = await Promise.all([
      this.orderModel.aggregate(dataPipeline),
      this.orderModel.aggregate(countPipeline),
    ])

    const total = countResult[0]?.total ?? 0
    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) }
  }
}
