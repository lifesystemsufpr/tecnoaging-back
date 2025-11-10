import {
  PrismaClient,
  SystemRole,
  Gender,
  Scholarship,
  SocialEconomicLevel,
  TypeEvaluation,
} from '@prisma/client';
import { hashPassword } from '../src/shared/functions/hash-password';
import { normalizeString } from '../src/shared/functions/normalize-string';

const prisma = new PrismaClient();
const password = 'senha123';

async function main() {
  console.log('🌱 Iniciando o processo de seed...');

  console.log('🗑️ Limpando dados existentes...');
  await prisma.sensorData.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.researcher.deleteMany({});
  await prisma.healthProfessional.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.institution.deleteMany({});
  await prisma.healthcareUnit.deleteMany({});
  console.log('✅ Dados limpos.');

  console.log('🏥 Criando Unidades de Saúde e Instituições...');

  const healthcareUnitName = 'UBS Centro de Saúde';
  const institutionTitle = 'Universidade Federal do Paraná (UFPR)';

  const healthcareUnit = await prisma.healthcareUnit.create({
    data: {
      name: healthcareUnitName,
      name_normalized: normalizeString(healthcareUnitName),
      zipCode: '80020000',
      street: 'Rua XV de Novembro',
      number: '123',
      complement: 'Sala 1',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
    },
  });

  const institution = await prisma.institution.create({
    data: {
      title: institutionTitle,
      title_normalized: normalizeString(institutionTitle),
    },
  });
  console.log('✅ Unidades e Instituições criadas.');

  console.log('👤 Criando usuários e perfis...');

  const managerName = 'GERENTE DO SISTEMA';
  await prisma.user.create({
    data: {
      cpf: '00000000000',
      fullName: managerName,
      fullName_normalized: normalizeString(managerName),
      gender: Gender.OTHER,
      password: await hashPassword(password),
      role: SystemRole.MANAGER,
    },
  });

  const healthProName = 'Dra. Ana Costa';
  const healthProSpeciality = 'Fisioterapia';
  const healthProfessional = await prisma.user.create({
    data: {
      cpf: '11111111111',
      fullName: healthProName,
      fullName_normalized: normalizeString(healthProName),
      gender: Gender.FEMALE,
      password: await hashPassword(password),
      role: SystemRole.HEALTH_PROFESSIONAL,
      healthProfessional: {
        create: {
          email: 'ana.costa@email.com',
          speciality: healthProSpeciality,
          speciality_normalized: normalizeString(healthProSpeciality),
        },
      },
    },
  });

  const researcherName = 'Dr. Bruno Lima';
  await prisma.user.create({
    data: {
      cpf: '22222222222',
      fullName: researcherName,
      fullName_normalized: normalizeString(researcherName),
      gender: Gender.MALE,
      password: await hashPassword(password),
      role: SystemRole.RESEARCHER,
      researcher: {
        create: {
          email: 'bruno.lima@email.com',
          fieldOfStudy: 'Engenharia Biomédica',
          institutionId: institution.id,
        },
      },
    },
  });

  const patientName = 'Carlos Andrade';
  const patient = await prisma.user.create({
    data: {
      cpf: '33333333333',
      fullName: patientName,
      fullName_normalized: normalizeString(patientName),
      gender: Gender.MALE,
      password: await hashPassword(password),
      role: SystemRole.PATIENT,
      patient: {
        create: {
          birthday: new Date('1953-07-15T00:00:00.000Z'),
          scholarship: Scholarship.HIGHER_EDUCATION_COMPLETE,
          socio_economic_level: SocialEconomicLevel.B,
          weight: 78,
          height: 175,
          zipCode: '80040000',
          street: 'Rua das Palmeiras',
          number: '789',
          neighborhood: 'Alto da Glória',
          city: 'Curitiba',
          state: 'PR',
        },
      },
    },
  });
  console.log('✅ Usuários e perfis criados.');

  console.log('📊 Criando avaliação com dados de sensor...');
  await prisma.evaluation.create({
    data: {
      type: TypeEvaluation.FTSTS,
      patientId: patient.id,
      healthProfessionalId: healthProfessional.id,
      healthcareUnitId: healthcareUnit.id,
      date: new Date(),
      time_init: new Date(),
      time_end: new Date(new Date().getTime() + 15000),
      sensorData: {
        createMany: {
          data: [
            {
              timestamp: new Date(),
              accel_x: 0.1,
              accel_y: 0.2,
              gyro_x: 0.3,
              gyro_y: 0.4,
              gyro_z: 0.5,
            },
            {
              timestamp: new Date(new Date().getTime() + 100),
              accel_x: 0.12,
              accel_y: 0.23,
              gyro_x: 0.34,
              gyro_y: 0.45,
              gyro_z: 0.56,
            },
          ],
        },
      },
    },
  });
  console.log('✅ Avaliação criada.');

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
