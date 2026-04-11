import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { User, UserDocument } from 'src/models/user.schema'

import { UpdateProfileDTO } from './dto/update-profile.dto'

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getProfile(user: UserDocument) {
    const profile = await this.userModel
      .findOne({ _id: user._id, is_deleted: false })
      .select('-is_deleted -deleted_at')

    if (!profile) {
      throw new NotFoundException('Profile not found')
    }

    return profile
  }

  async updateProfile(user: UserDocument, dto: UpdateProfileDTO) {
    const profile = await this.userModel.findOneAndUpdate(
      { _id: user._id, is_deleted: false },
      { $set: dto },
      { new: true },
    ).select('-is_deleted -deleted_at')

    if (!profile) {
      throw new NotFoundException('Profile not found')
    }

    return profile
  }

  async deleteAccount(user: UserDocument) {
    const profile = await this.userModel.findOneAndUpdate(
      { _id: user._id, is_deleted: false },
      { is_deleted: true, deleted_at: new Date() },
      { new: true },
    )

    if (!profile) {
      throw new NotFoundException('Profile not found')
    }

    return { message: 'Account deleted successfully' }
  }
}
