import { SystemRole } from '@prisma/client';

export interface AccessToken {
  access_token: string;
  refresh_token: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  cpf: string;
  role: SystemRole;
}

export interface Payload {
  id: string;
  cpf: string;
  fullName: string;
  role: SystemRole;
}
