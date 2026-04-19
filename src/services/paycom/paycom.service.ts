import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class PaycomService {
  constructor(private readonly config: ConfigService) {}

  get merchantId(): string {
    return this.config.get<string>('paycom.merchant_id') || ''
  }

  get apiKey(): string {
    return this.config.get<string>('paycom.api_key') || ''
  }

  get testApiKey(): string {
    return this.config.get<string>('paycom.test_api_key') || ''
  }

  get username(): string {
    return this.config.get<string>('paycom.username') || 'Paycom'
  }

  get checkoutUrl(): string {
    return (
      this.config.get<string>('paycom.checkout_url') ||
      'https://checkout.paycom.uz'
    )
  }

  get redirectUrl(): string {
    return this.config.get<string>('paycom.redirect_url') || ''
  }

  /**
   * Build Paycom GET checkout URL.
   *
   * Format: <base>/<base64(m=...;ac.<key>=<val>;a=<tiyin>;l=<lang>;c=<cb>)>
   * Amount must be in tiyin (UZS * 100).
   */
  buildCheckoutUrl(params: {
    orderId: string
    amountUzs: number
    lang?: 'uz' | 'ru' | 'en'
    returnUrl?: string
  }): string {
    const tiyin = Math.round(params.amountUzs * 100)
    const cb = params.returnUrl || this.redirectUrl
    const lang = params.lang || 'ru'

    const segments = [
      `m=${this.merchantId}`,
      `ac.transaction_id=${params.orderId}`,
      `a=${tiyin}`,
      `l=${lang}`,
    ]
    if (cb) segments.push(`c=${cb}`)

    const encoded = Buffer.from(segments.join(';'), 'utf8').toString('base64')
    return `${this.checkoutUrl}/${encoded}`
  }

  /**
   * Verify Basic auth header from Paycom webhook.
   * Paycom sends Authorization: Basic base64("Paycom:API_KEY")
   */
  verifyAuth(header?: string): boolean {
    if (!header) return false
    const [scheme, value] = header.split(' ')
    if (scheme !== 'Basic' || !value) return false
    const decoded = Buffer.from(value, 'base64').toString('utf8')
    const [user, pass] = decoded.split(':')
    if (user !== this.username) return false
    if (pass === this.apiKey && this.apiKey) return true
    if (pass === this.testApiKey && this.testApiKey) return true
    return false
  }
}
