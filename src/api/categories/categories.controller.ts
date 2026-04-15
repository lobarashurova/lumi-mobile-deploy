import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'
import { ActivityCategoryType } from 'src/enums/activity-category-type.enum'

import { CategoriesService } from './categories.service'

@ApiTags('Categories')
@Controller('/api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ActivityCategoryType })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: ActivityCategoryType,
  ) {
    return this.categoriesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
    })
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.categoriesService.findOne(id)
    return { data }
  }
}
