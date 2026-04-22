import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface EskizTokenResponse {
  data?: { token?: string }
}

interface EskizSendResponse {
  id?: string
  message?: string
  status?: string
}

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name)
  private token: string | null = null

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const email = this.configService.get<string>('sms.email')
    const password = this.configService.get<string>('sms.password')
    const from = this.configService.get<string>('sms.from')
    if (!email || !password) {
      this.logger.error(
        'SMS DISABLED: SMS_EMAIL and/or SMS_PASSWORD are empty. OTPs will NOT be sent. Set these in the Render dashboard.',
      )
      return
    }
    if (!from || from === '4546') {
      this.logger.warn(
        `SMS_FROM="${from ?? ''}" looks like Eskiz's test nickname. Custom OTP template will be rejected by Eskiz. Set SMS_FROM to your approved branded sender.`,
      )
    }
    this.logger.log(`SMS configured (email=${email}, from=${from})`)
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    const base_url = this.configService.get<string>('sms.url')
    const email = this.configService.get<string>('sms.email')
    const password = this.configService.get<string>('sms.password')
    const from = this.configService.get<string>('sms.from')
    const callback_url = this.configService.get<string>('sms.callback_url')

    if (!base_url || !email || !password) {
      this.logger.error(
        `SMS not configured (SMS_EMAIL/SMS_PASSWORD missing); OTP to ${phone} NOT sent. Code=${message}`,
      )
      return
    }

    const token = await this.getToken()
    const mobile_phone = phone.replace(/^\+/, '')

    const body: Record<string, string> = {
      mobile_phone,
      message,
      from: from || '4546',
    }
    if (callback_url) body.callback_url = callback_url

    const send = async (auth_token: string) =>
      fetch(`${this.trim(base_url)}/api/message/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth_token}`,
        },
        body: JSON.stringify(body),
      })

    let res = await send(token)

    if (res.status === 401) {
      this.token = null
      const retry_token = await this.getToken()
      res = await send(retry_token)
    }

    const raw = await res.text()
    if (!res.ok) {
      throw new Error(`Eskiz send failed: ${res.status} ${raw}`)
    }

    let data: EskizSendResponse
    try {
      data = JSON.parse(raw) as EskizSendResponse
    } catch {
      throw new Error(`Eskiz send returned non-JSON (status ${res.status}): ${raw}`)
    }

    // Eskiz returns HTTP 200 even when it rejects (e.g. unapproved template,
    // zero balance, bad sender). Detect that here so the caller sees a real error.
    if (data.status === 'error' || !data.id) {
      throw new Error(
        `Eskiz rejected SMS (from=${body.from}): status=${data.status ?? 'unknown'} message=${data.message ?? raw}`,
      )
    }

    this.logger.log(
      `SMS sent to ${phone} (eskiz id=${data.id}, from=${body.from})`,
    )
  }

  private async getToken(): Promise<string> {
    if (this.token && !this.isTokenExpired(this.token)) {
      return this.token
    }
    if (this.token) {
      try {
        await this.refresh()
        return this.token!
      } catch (e) {
        this.logger.warn(`Eskiz token refresh failed, re-logging in: ${e}`)
        this.token = null
      }
    }
    await this.login()
    return this.token!
  }

  private async login(): Promise<void> {
    const base_url = this.configService.get<string>('sms.url')
    const email = this.configService.get<string>('sms.email')
    const password = this.configService.get<string>('sms.password')

    const res = await fetch(`${this.trim(base_url)}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Eskiz login failed: ${res.status} ${text}`)
    }

    const data = (await res.json()) as EskizTokenResponse
    const token = data.data?.token
    if (!token) throw new Error('Eskiz login returned no token')
    this.token = token
  }

  private async refresh(): Promise<void> {
    const base_url = this.configService.get<string>('sms.url')
    const res = await fetch(`${this.trim(base_url)}/api/auth/refresh`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Eskiz refresh failed: ${res.status} ${text}`)
    }
    const data = (await res.json()) as EskizTokenResponse
    const token = data.data?.token
    if (!token) throw new Error('Eskiz refresh returned no token')
    this.token = token
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return true
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf8'),
      ) as { exp?: number }
      if (!payload.exp) return true
      // refresh 60s before real expiry
      return payload.exp - 60 < Math.floor(Date.now() / 1000)
    } catch {
      return true
    }
  }

  private trim(url: string): string {
    return url.replace(/\/+$/, '')
  }
}
