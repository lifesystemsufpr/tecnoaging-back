import { PrismaClient } from '@prisma/client';
import { normalizeString } from '../src/shared/functions/normalize-string';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando script de backfill para campos normalizados...');

  await prisma.$transaction(
    async (tx) => {
      console.log('Atualizando a tabela Users...');
      const users = await tx.user.findMany({
        select: { id: true, fullName: true },
      });
      const userUpdates = users.map((user) =>
        tx.user.update({
          where: { id: user.id },
          data: { fullName_normalized: normalizeString(user.fullName) || '' },
        }),
      );
      await Promise.all(userUpdates);
      console.log(`${users.length} usuários atualizados.`);

      console.log('Atualizando a tabela HealthProfessionals...');
      const professionals = await tx.healthProfessional.findMany({
        select: { id: true, speciality: true },
      });
      const professionalUpdates = professionals.map((pro) =>
        tx.healthProfessional.update({
          where: { id: pro.id },
          data: {
            speciality_normalized: normalizeString(pro.speciality) || '',
          },
        }),
      );
      await Promise.all(professionalUpdates);
      console.log(`${professionals.length} profissionais atualizados.`);

      console.log('Atualizando a tabela Institutions...');
      const institutions = await tx.institution.findMany({
        select: { id: true, title: true },
      });
      const institutionUpdates = institutions.map((inst) =>
        tx.institution.update({
          where: { id: inst.id },
          data: { title_normalized: normalizeString(inst.title) || '' },
        }),
      );
      await Promise.all(institutionUpdates);
      console.log(`${institutions.length} instituições atualizadas.`);

      console.log('Atualizando a tabela HealthcareUnits...');
      const units = await tx.healthcareUnit.findMany({
        select: { id: true, name: true },
      });
      const unitUpdates = units.map((unit) =>
        tx.healthcareUnit.update({
          where: { id: unit.id },
          data: { name_normalized: normalizeString(unit.name) || '' },
        }),
      );
      await Promise.all(unitUpdates);
      console.log(`${units.length} unidades de saúde atualizadas.`);
    },
    {
      maxWait: 10000,
      timeout: 60000,
    },
  );

  console.log('Backfill concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o backfill:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
