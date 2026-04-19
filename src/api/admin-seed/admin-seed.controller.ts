import {
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'

import { AdminSeedService } from './admin-seed.service'

@ApiTags('Admin Seed')
@Controller('/api/_admin/seed')
export class AdminSeedController {
  constructor(
    private readonly seedService: AdminSeedService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('test-class')
  async testClass(@Headers('x-admin-token') token?: string) {
    const expected = this.config.get<string>('docs_password')
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid x-admin-token')
    }
    const data = await this.seedService.seedTestClass()
    return { data }
  }
}
