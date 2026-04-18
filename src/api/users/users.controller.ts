import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { User } from 'src/common/decarators/user.decarator'
import { UserDocument } from 'src/models/user.schema'

import { CreateChildUserDTO } from './dto/create-child-user.dto'
import { UpdateChildUserDTO } from './dto/update-child-user.dto'
import { UpdateUserProfileDTO } from './dto/update-user-profile.dto'
import { UsersService } from './users.service'

/**
 * Mobile client calls `/api/users/...` for aggregated profile + children data.
 * These handlers use `forbidNonWhitelisted: false` so the client can post its
 * full freezed ChildModel (with trial/flag fields we ignore) without 400s.
 */
const TOLERANT_PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
})

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('parents/profile')
  async getParentProfile(@User() user: UserDocument) {
    const data = await this.usersService.getParentProfile(user)
    return { data }
  }

  @Patch('parents/profile')
  @UsePipes(TOLERANT_PIPE)
  async updateParentProfile(
    @User() user: UserDocument,
    @Body() body: UpdateUserProfileDTO,
  ) {
    const data = await this.usersService.updateParentProfile(user, body)
    return { data }
  }

  @Post('parents/profile/children')
  @UsePipes(TOLERANT_PIPE)
  async createChild(
    @User() user: UserDocument,
    @Body() body: CreateChildUserDTO,
  ) {
    const data = await this.usersService.createChild(user, body)
    return { data }
  }

  @Get('parents/profile/children/:id')
  async findChild(@User() user: UserDocument, @Param('id') id: string) {
    const data = await this.usersService.findChild(user, id)
    return { data }
  }

  @Patch('parents/profile/children/:id')
  @UsePipes(TOLERANT_PIPE)
  async updateChild(
    @User() user: UserDocument,
    @Param('id') id: string,
    @Body() body: UpdateChildUserDTO,
  ) {
    const data = await this.usersService.updateChild(user, id, body)
    return { data }
  }

  @Get('children')
  async listChildren(@User() user: UserDocument) {
    const data = await this.usersService.listChildren(user)
    return { data }
  }
}
