import { ExecutionContext, createParamDecorator } from '@nestjs/common'

import { UserDocument } from 'src/models/user.schema'

export const User = createParamDecorator(
  (data: string, context: ExecutionContext) => {
    return context.switchToHttp().getRequest().user as UserDocument
  },
)
