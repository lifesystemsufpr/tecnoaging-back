import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateManagerDto } from './create-manager.dto';

/**
 * DTO for updating the Administrator's own profile information.
 * Extends PartialType to make all fields optional.
 * Excludes CPF since it's not editable (primary identifier).
 * Excludes role since administrators cannot change their own role.
 */
export class UpdateManagerProfileDto extends PartialType(
  OmitType(CreateManagerDto, ['cpf']),
) {}
