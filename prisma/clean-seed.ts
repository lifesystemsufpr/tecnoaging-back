import { PrismaClient, SystemRole, Gender } from '@prisma/client';
import { hashPassword } from '../src/shared/functions/hash-password';

const prisma = new PrismaClient();

async function execute() {
  const passwordHash = await hashPassword('rodacki@tecnoaging123');

  await prisma.user.create({
    data: {
      cpf: '00000000000',
      fullName: 'Andre Luiz Felix Rodacki',
      fullName_normalized: 'andre luiz felix rodacki',
      gender: Gender.MALE,
      password: passwordHash,
      role: SystemRole.MANAGER,
    },
  });
}

execute()
  .then(() => {
    console.log('Sucesso');
  })
  .catch((error) => {
    console.log(error);
  });
