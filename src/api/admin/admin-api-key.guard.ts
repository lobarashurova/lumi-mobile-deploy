import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('admin_api_key')
    if (!expected) throw new ForbiddenException('Admin API not configured')

    const req = context.switchToHttp().getRequest<Request>()
    const provided = req.headers['x-admin-key']

    if (!provided || provided !== expected) {
      throw new ForbiddenException('Invalid admin API key')
    }
    return true
  }
}
