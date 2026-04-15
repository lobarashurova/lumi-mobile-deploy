import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'

import { User } from 'src/common/decarators/user.decarator'
import { UserDocument } from 'src/models/user.schema'

import { ChildrenService } from './children.service'
import { CreateChildDTO } from './dto/create-child.dto'
import { UpdateChildDTO } from './dto/update-child.dto'

@ApiTags('Children')
@ApiBearerAuth()
@Controller('/api/children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @User() user: UserDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.childrenService.list(user, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get(':id')
  async findOne(@User() user: UserDocument, @Param('id') id: string) {
    const data = await this.childrenService.findOne(user, id)
    return { data }
  }

  @Post()
  async create(@User() user: UserDocument, @Body() body: CreateChildDTO) {
    const data = await this.childrenService.create(user, body)
    return { data }
  }

  @Patch(':id')
  async update(
    @User() user: UserDocument,
    @Param('id') id: string,
    @Body() body: UpdateChildDTO,
  ) {
    const data = await this.childrenService.update(user, id, body)
    return { data }
  }

  @Delete(':id')
  async remove(@User() user: UserDocument, @Param('id') id: string) {
    const data = await this.childrenService.remove(user, id)
    return { data }
  }
}
