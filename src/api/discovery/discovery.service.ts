import { Injectable } from '@nestjs/common'

import { BannersService } from 'src/api/banners/banners.service'
import { CategoriesService } from 'src/api/categories/categories.service'
import { ClassesService } from 'src/api/classes/classes.service'

type Lang = 'uz' | 'ru' | 'en'

function pickLang(lang: string | undefined): Lang {
  return lang === 'ru' || lang === 'en' ? lang : 'uz'
}

function tr(field: any, lang: Lang): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang] || field.uz || field.ru || field.en || ''
}

function assetUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  const base =
    process.env.PUBLIC_BASE_URL || 'https://lumi-mobile-backend.onrender.com'
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

function mapBanner(doc: any, lang: Lang) {
  const img = doc.image ? tr(doc.image, lang) : undefined
  return {
    id: String(doc._id),
    title: tr(doc.title, lang),
    url: assetUrl(img),
    image: assetUrl(img),
    has_photo: !!img,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}

function mapCategory(doc: any, lang: Lang) {
  return {
    id: String(doc._id),
    title: tr(doc.name, lang),
    description: '',
    image: assetUrl(doc.image),
    has_photo: !!doc.image,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}

function mapBranch(doc: any, lang: Lang) {
  if (!doc) return undefined
  return {
    id: String(doc._id),
    title: doc.title || '',
    address: tr(doc.address, lang),
    longitude: doc.location?.lng,
    latitude: doc.location?.lat,
    partner_id: doc.partner_id ? String(doc.partner_id) : undefined,
    description: tr(doc.description, lang),
    is_active: doc.status === 'approved',
    has_photo: Array.isArray(doc.images) && doc.images.length > 0,
    image: assetUrl(doc.images?.[0]),
  }
}

function mapClass(doc: any, lang: Lang) {
  const branch =
    doc.branch_id && typeof doc.branch_id === 'object'
      ? mapBranch(doc.branch_id, lang)
      : undefined
  const category =
    doc.category_id && typeof doc.category_id === 'object'
      ? tr(doc.category_id.name, lang)
      : String(doc.category_id || '')
  const image =
    doc.image || (Array.isArray(doc.images) ? doc.images[0] : undefined)

  return {
    id: String(doc._id),
    branch,
    category,
    title: tr(doc.name, lang),
    description: tr(doc.description, lang),
    price: doc.price ?? 0,
    min_age: doc.age_from,
    max_age: doc.age_to,
    gender: doc.gender,
    is_active: doc.status === 'approved',
    has_photo: !!image,
    image: assetUrl(image),
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly bannersService: BannersService,
    private readonly categoriesService: CategoriesService,
    private readonly classesService: ClassesService,
  ) {}

  async feed(query: {
    lang?: string
    newClassesPage?: number
    newClassesLimit?: number
    categoryPage?: number
    categoryLimit?: number
    nearClassPage?: number
    nearClassLimit?: number
  }) {
    const lang = pickLang(query.lang)

    const [banners, categories, newClasses, nearClasses] = await Promise.all([
      this.bannersService.findAll({ page: 1, limit: 10 }),
      this.categoriesService.findAll({
        page: query.categoryPage || 1,
        limit: query.categoryLimit || 20,
      }),
      this.classesService.findAll({
        page: query.newClassesPage || 1,
        limit: query.newClassesLimit || 10,
      }),
      this.classesService.findAll({
        page: query.nearClassPage || 1,
        limit: query.nearClassLimit || 10,
      }),
    ])

    return {
      banners: banners.data.map((d) => mapBanner(d, lang)),
      categories: {
        page: categories.page,
        limit: categories.limit,
        data: categories.data.map((d) => mapCategory(d, lang)),
      },
      new_classes: {
        page: newClasses.page,
        limit: newClasses.limit,
        data: newClasses.data.map((d) => mapClass(d, lang)),
      },
      near_classes: {
        page: nearClasses.page,
        limit: nearClasses.limit,
        data: nearClasses.data.map((d) => mapClass(d, lang)),
      },
    }
  }

  async explore(query: {
    page?: number
    limit?: number
    search?: string
    branch_id?: string
    category_id?: string
    lang?: string
  }) {
    const lang = pickLang(query.lang)
    const result = await this.classesService.findAll(query)
    return {
      ...result,
      data: result.data.map((d) => mapClass(d, lang)),
    }
  }
}
