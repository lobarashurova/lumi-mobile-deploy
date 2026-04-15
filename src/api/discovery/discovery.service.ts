import { Injectable } from '@nestjs/common'

import { BannersService } from 'src/api/banners/banners.service'
import { CategoriesService } from 'src/api/categories/categories.service'
import { ClassesService } from 'src/api/classes/classes.service'

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly bannersService: BannersService,
    private readonly categoriesService: CategoriesService,
    private readonly classesService: ClassesService,
  ) {}

  async feed() {
    const [banners, categories, newClasses] = await Promise.all([
      this.bannersService.findAll({ page: 1, limit: 10 }),
      this.categoriesService.findAll({ page: 1, limit: 20 }),
      this.classesService.findAll({ page: 1, limit: 10 }),
    ])

    return {
      banners: banners.data,
      categories: categories.data,
      new_classes: newClasses.data,
    }
  }

  async explore(query: {
    page?: number
    limit?: number
    search?: string
    branch_id?: string
    category_id?: string
  }) {
    return this.classesService.findAll(query)
  }
}
