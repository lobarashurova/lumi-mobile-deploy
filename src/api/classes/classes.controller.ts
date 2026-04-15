import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'

import { ClassesService } from './classes.service'

@ApiTags('Classes')
@Controller('/api/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'branch_id', required: false })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branch_id') branch_id?: string,
    @Query('category_id') category_id?: string,
    @Query('search') search?: string,
  ) {
    return this.classesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      branch_id,
      category_id,
      search,
    })
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.classesService.findOne(id)
    return { data }
  }
}
