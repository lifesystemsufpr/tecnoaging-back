import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';

export class CreateManagerDto extends OmitType(CreateUserDto, ['role']) {}
