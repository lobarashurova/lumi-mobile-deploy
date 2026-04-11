import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'

import { AuthService } from 'src/api/auth/auth.service'

import { IS_PUBLIC_KEY } from 'src/common/decarators/public.decarator'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const is_public = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (is_public) {
      return true
    }

    const jwt_secret = this.configService.get<string>('jwt_secret')

    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException('Unauthorized')
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwt_secret,
      })

      const user = await this.authService.getUser(payload.user)

      if (!user) {
        throw new UnauthorizedException('Unauthorized')
      }

      request['user'] = user
    } catch {
      throw new UnauthorizedException('Unauthorized')
    }

    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
