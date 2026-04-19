import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Child, ChildDocument } from 'src/models/child.schema'
import { User, UserDocument } from 'src/models/user.schema'

import { CreateChildUserDTO } from './dto/create-child-user.dto'
import { UpdateChildUserDTO } from './dto/update-child-user.dto'
import { UpdateUserProfileDTO } from './dto/update-user-profile.dto'

/**
 * Client expects trial metadata on every response even though trials aren't
 * tracked on this backend yet. These defaults keep the freezed ParentTrialSummary
 * parser happy.
 */
const DEFAULT_TRIAL_SUMMARY = {
  total_remaining_trials: 0,
  unlock_threshold_coin: 700,
  unlock_batch_trials: 3,
  children: [] as unknown[],
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Child.name) private readonly childModel: Model<Child>,
  ) {}

  async getParentProfile(user: UserDocument) {
    const profile = await this.userModel
      .findOne({ _id: user._id, is_deleted: false })
      .select('-is_deleted -deleted_at -__v')
      .lean()

    if (!profile) throw new NotFoundException('Profile not found')

    const children = await this.childModel
      .find({ parent_id: user._id, is_deleted: false })
      .sort({ created_at: -1 })
      .lean()

    return {
      profile: this.mapProfile(profile),
      children: children.map((c) => this.mapChild(c)),
      trial_summary: DEFAULT_TRIAL_SUMMARY,
    }
  }

  async updateParentProfile(user: UserDocument, dto: UpdateUserProfileDTO) {
    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: user._id, is_deleted: false },
        { $set: dto },
        { new: true },
      )
      .select('-is_deleted -deleted_at -__v')
      .lean()

    if (!updated) throw new NotFoundException('Profile not found')
    return this.mapProfile(updated)
  }

  async listChildren(user: UserDocument) {
    const children = await this.childModel
      .find({ parent_id: user._id, is_deleted: false })
      .sort({ created_at: -1 })
      .lean()
    return children.map((c) => this.mapChild(c))
  }

  async findChild(user: UserDocument, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Child not found')
    }
    const child = await this.childModel
      .findOne({ _id: id, parent_id: user._id, is_deleted: false })
      .lean()
    if (!child) throw new NotFoundException('Child not found')
    return this.mapChild(child)
  }

  async createChild(user: UserDocument, dto: CreateChildUserDTO) {
    const payload = this.normalizeChildDto(dto)
    if (!payload.first_name) {
      throw new NotFoundException('Child name is required')
    }
    const created = await this.childModel.create({
      ...payload,
      parent_id: user._id,
    })
    return this.mapChild(created.toObject())
  }

  async updateChild(user: UserDocument, id: string, dto: UpdateChildUserDTO) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Child not found')
    }
    const payload = this.normalizeChildDto(dto)
    const updated = await this.childModel
      .findOneAndUpdate(
        { _id: id, parent_id: user._id, is_deleted: false },
        { $set: payload },
        { new: true },
      )
      .lean()
    if (!updated) throw new NotFoundException('Child not found')
    return this.mapChild(updated)
  }

  /** Mirror first_name onto legacy `name` and derive age <-> dob. */
  private normalizeChildDto(
    dto: CreateChildUserDTO | UpdateChildUserDTO,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { ...dto }

    const firstName = dto.first_name?.trim()
    if (firstName) out.name = firstName

    if (dto.dob && dto.age == null) {
      const computed = this.ageFromDob(dto.dob)
      if (computed != null) out.age = computed
    }
    if (!dto.dob && dto.age != null) {
      out.dob = this.dobFromAge(dto.age)
    }

    return out
  }

  private ageFromDob(dob: string): number | null {
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return null
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    const hadBirthday =
      now.getMonth() > d.getMonth() ||
      (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate())
    if (!hadBirthday) age -= 1
    return age < 0 ? null : age
  }

  private dobFromAge(age: number): string {
    const now = new Date()
    const target = new Date(now.getFullYear() - age, now.getMonth(), now.getDate())
    const y = target.getFullYear().toString().padStart(4, '0')
    const m = (target.getMonth() + 1).toString().padStart(2, '0')
    const d = target.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  private mapProfile(profile: Record<string, any>) {
    return {
      id: profile._id?.toString(),
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
      phone: profile.phone ?? null,
      phone_number: profile.phone ?? null,
      role: profile.role ?? null,
      avatar: profile.avatar ?? null,
      city: profile.city ?? null,
      district: profile.district ?? null,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }
  }

  private mapChild(child: Record<string, any>) {
    const firstName = child.first_name ?? child.name ?? null
    return {
      id: child._id?.toString(),
      parent_id: child.parent_id?.toString(),
      first_name: firstName,
      last_name: child.last_name ?? '',
      name: child.name ?? firstName,
      age: child.age ?? null,
      dob: child.dob ?? null,
      gender: child.gender ?? null,
      avatar: child.avatar ?? null,
      city: child.city ?? null,
      district: child.district ?? null,
      has_photo: child.has_photo ?? false,
      is_eligible: true,
      is_verified: true,
      remaining_trials: 0,
      paid_coin_accumulator: 0,
      created_at: child.created_at,
      updated_at: child.updated_at,
    }
  }
}

export type { ChildDocument }
