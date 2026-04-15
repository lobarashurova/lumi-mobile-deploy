import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Otp } from 'src/models/otp.schema'
import { User } from 'src/models/user.schema'
import { SmsService } from 'src/services/sms/sms.service'

import { RegisterDTO } from './dto/register.dto'
import { SendOtpDTO } from './dto/send-otp.dto'
import { VerifyOtpDTO } from './dto/verify-otp.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(dto: SendOtpDTO) {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const expires_at = new Date(Date.now() + 3 * 60 * 1000) // 3 minutes

    await this.otpModel.updateMany(
      { phone: dto.phone, is_used: false },
      { is_used: true },
    )

    await this.otpModel.create({
      phone: dto.phone,
      code,
      expires_at,
    })

    const message = `Tasdiqlash kodi Lumi Pass (lumipass.uz) ilovasiga kirish uchun: ${code} | Kod podtverjdeniya dlya vhoda v prilojenie Lumi Pass (lumipass.uz): ${code}`

    try {
      await this.smsService.sendMessage(dto.phone, message)
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${dto.phone}`, error as Error)
    }

    return { message: 'OTP sent successfully', expires_in: 180, code }
  }

  async verifyOtp(dto: VerifyOtpDTO) {
    const otp = await this.otpModel.findOne({
      phone: dto.phone,
      code: dto.code,
      is_used: false,
    })

    if (!otp) {
      throw new BadRequestException('Invalid OTP code')
    }

    if (otp.expires_at < new Date()) {
      throw new BadRequestException('OTP code has expired')
    }

    otp.is_used = true
    await otp.save()

    const user = await this.userModel.findOne({
      phone: dto.phone,
      is_deleted: false,
    })

    if (user) {
      const access_token = await this.jwtService.signAsync({ user: user._id })
      return {
        is_new_user: false,
        access_token,
        user: {
          _id: user._id,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
      }
    }

    return {
      is_new_user: true,
      access_token: null,
      user: null,
    }
  }

  async register(dto: RegisterDTO) {
    const existing = await this.userModel.findOne({
      phone: dto.phone,
      is_deleted: false,
    })

    if (existing) {
      throw new BadRequestException('User with this phone already exists')
    }

    const recent_otp = await this.otpModel.findOne({
      phone: dto.phone,
      is_used: true,
    }).sort({ updated_at: -1 })

    if (!recent_otp) {
      throw new BadRequestException(
        'Phone number must be verified before registration',
      )
    }

    const user = await this.userModel.create({
      phone: dto.phone,
      first_name: dto.first_name,
      last_name: dto.last_name,
    })

    const access_token = await this.jwtService.signAsync({ user: user._id })

    return {
      access_token,
      user: {
        _id: user._id,
        phone: user.phone,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    }
  }

  async getUser(id: Types.ObjectId) {
    const user = await this.userModel.findOne({
      _id: id,
      is_deleted: false,
    })

    return user
  }
}
