import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY } from 'src/common/decarators/public.decarator'
import { ROLES_KEY } from 'src/common/decarators/role.decarator'
import { Role } from 'src/enums/role.enum'
import { AccessContorlService } from 'src/shared/access-control.service'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControlService: AccessContorlService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const is_public = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (is_public) {
      return true
    }

    const required_roles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || []

    if (required_roles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request['user']

    for (const role of required_roles) {
      const result = this.accessControlService.isAuthorized({
        requiredRole: role,
        currentRole: user.role,
      })

      if (result) {
        return true
      }
    }

    throw new ForbiddenException('You do not have permission to this route')
  }
}
