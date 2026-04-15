import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'

import { BranchesService } from './branches.service'

@ApiTags('Branches')
@Controller('/api/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'partner_id', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('partner_id') partner_id?: string,
  ) {
    return this.branchesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      partner_id,
    })
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.branchesService.findOne(id)
    return { data }
  }
}
