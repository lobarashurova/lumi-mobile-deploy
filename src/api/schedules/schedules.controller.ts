import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { User } from 'src/common/decarators/user.decarator'
import { UserDocument } from 'src/models/user.schema'

import { SchedulesService } from './schedules.service'

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('/api/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('parent')
  async listForParent(
    @User() user: UserDocument,
    @Query('lang') lang?: string,
  ) {
    return this.schedulesService.listForParent(user, lang || 'ru')
  }
}
