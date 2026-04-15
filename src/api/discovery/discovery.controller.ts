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
  @ApiQuery({ name: 'lang', required: false })
  @ApiQuery({ name: 'new_classes_page', required: false })
  @ApiQuery({ name: 'new_classes_limit', required: false })
  @ApiQuery({ name: 'category_page', required: false })
  @ApiQuery({ name: 'category_limit', required: false })
  @ApiQuery({ name: 'near_class_page', required: false })
  @ApiQuery({ name: 'near_class_limit', required: false })
  async feed(
    @Query('lang') lang?: string,
    @Query('new_classes_page') newClassesPage?: string,
    @Query('new_classes_limit') newClassesLimit?: string,
    @Query('category_page') categoryPage?: string,
    @Query('category_limit') categoryLimit?: string,
    @Query('near_class_page') nearClassPage?: string,
    @Query('near_class_limit') nearClassLimit?: string,
  ) {
    const data = await this.discoveryService.feed({
      lang,
      newClassesPage: newClassesPage ? parseInt(newClassesPage, 10) : undefined,
      newClassesLimit: newClassesLimit
        ? parseInt(newClassesLimit, 10)
        : undefined,
      categoryPage: categoryPage ? parseInt(categoryPage, 10) : undefined,
      categoryLimit: categoryLimit ? parseInt(categoryLimit, 10) : undefined,
      nearClassPage: nearClassPage ? parseInt(nearClassPage, 10) : undefined,
      nearClassLimit: nearClassLimit
        ? parseInt(nearClassLimit, 10)
        : undefined,
    })
    return { data }
  }

  @Public()
  @Get('classes')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'branch_id', required: false })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiQuery({ name: 'lang', required: false })
  async classes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('branch_id') branch_id?: string,
    @Query('category_id') category_id?: string,
    @Query('lang') lang?: string,
  ) {
    return this.discoveryService.classes({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      branch_id,
      category_id,
      lang,
    })
  }

  @Public()
  @Get('branches')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'lang', required: false })
  async branches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('lang') lang?: string,
  ) {
    return this.discoveryService.branches({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      lang,
    })
  }

  @Public()
  @Get('explore')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'branch_id', required: false })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiQuery({ name: 'lang', required: false })
  async explore(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('branch_id') branch_id?: string,
    @Query('category_id') category_id?: string,
    @Query('lang') lang?: string,
  ) {
    return this.discoveryService.explore({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      branch_id,
      category_id,
      lang,
    })
  }
}
