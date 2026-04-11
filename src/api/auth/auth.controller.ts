import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { Public } from 'src/common/decarators/public.decarator'

import { AuthService } from './auth.service'
import { RegisterDTO } from './dto/register.dto'
import { SendOtpDTO } from './dto/send-otp.dto'
import { VerifyOtpDTO } from './dto/verify-otp.dto'

@ApiTags('Auth')
@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/send-otp')
  async sendOtp(@Body() body: SendOtpDTO) {
    const data = await this.authService.sendOtp(body)
    return { data }
  }

  @Public()
  @Post('/verify-otp')
  async verifyOtp(@Body() body: VerifyOtpDTO) {
    const data = await this.authService.verifyOtp(body)
    return { data }
  }

  @Public()
  @Post('/register')
  async register(@Body() body: RegisterDTO) {
    const data = await this.authService.register(body)
    return { data }
  }
}
