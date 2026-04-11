import { Body, Controller, Delete, Get, Patch } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { User } from 'src/common/decarators/user.decarator'
import { UserDocument } from 'src/models/user.schema'

import { UpdateProfileDTO } from './dto/update-profile.dto'
import { ProfileService } from './profile.service'

@ApiTags('Profile')
@Controller('/api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@User() user: UserDocument) {
    const data = await this.profileService.getProfile(user)
    return { data }
  }

  @Patch()
  async updateProfile(
    @User() user: UserDocument,
    @Body() body: UpdateProfileDTO,
  ) {
    const data = await this.profileService.updateProfile(user, body)
    return { data }
  }

  @Delete()
  async deleteAccount(@User() user: UserDocument) {
    const data = await this.profileService.deleteAccount(user)
    return { data }
  }
}
