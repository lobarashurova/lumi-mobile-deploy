import { Module } from '@nestjs/common'

import { BannersModule } from 'src/api/banners/banners.module'
import { BranchesModule } from 'src/api/branches/branches.module'
import { CategoriesModule } from 'src/api/categories/categories.module'
import { ClassesModule } from 'src/api/classes/classes.module'

import { DiscoveryController } from './discovery.controller'
import { DiscoveryService } from './discovery.service'

@Module({
  imports: [BannersModule, BranchesModule, CategoriesModule, ClassesModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
