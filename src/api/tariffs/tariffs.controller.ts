import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'

import { TariffsService } from './tariffs.service'

@ApiTags('Tariffs')
@Controller('/api/tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tariffsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.tariffsService.findOne(id)
    return { data }
  }
}
