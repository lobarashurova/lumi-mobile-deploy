import { Controller, Get, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'

import { DiscoveryService } from './discovery.service'

@ApiTags('Discovery')
@Controller('/api/discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get('feed')
  async feed() {
    const data = await this.discoveryService.feed()
    return { data }
  }

  @Public()
  @Get('explore')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'branch_id', required: false })
  @ApiQuery({ name: 'category_id', required: false })
  async explore(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('branch_id') branch_id?: string,
    @Query('category_id') category_id?: string,
  ) {
    return this.discoveryService.explore({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      branch_id,
      category_id,
    })
  }
}
