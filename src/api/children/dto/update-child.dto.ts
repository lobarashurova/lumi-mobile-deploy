import { PartialType } from '@nestjs/swagger'

import { CreateChildDTO } from './create-child.dto'

export class UpdateChildDTO extends PartialType(CreateChildDTO) {}
