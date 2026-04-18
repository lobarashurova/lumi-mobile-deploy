import { PartialType } from '@nestjs/swagger'

import { CreateChildUserDTO } from './create-child-user.dto'

export class UpdateChildUserDTO extends PartialType(CreateChildUserDTO) {}
