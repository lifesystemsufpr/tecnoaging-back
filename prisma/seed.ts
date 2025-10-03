import {
  PrismaClient,
  SystemRole,
  Gender,
  Scholarship,
  SocialEconomicLevel,
  TypeEvaluation,
} from '@prisma/client';
import { hashPassword } from '../src/shared/functions/hash-password';

const prisma = new PrismaClient();
const password = 'senha123';

async function main() {
  console.log('🌱 Iniciando o processo de seed...');

  // Limpa o banco de dados na ordem correta para evitar erros de constraint
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

  // --- CRIAÇÃO DE DADOS BASE ---
  console.log('🏥 Criando Unidades de Saúde e Instituições...');
  const healthcareUnit = await prisma.healthcareUnit.create({
    data: {
      name: 'UBS Centro de Saúde',
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
    data: { title: 'Universidade Federal do Paraná (UFPR)' },
  });
  console.log('✅ Unidades e Instituições criadas.');

  // --- CRIAÇÃO DE USUÁRIOS E PERFIS ---
  console.log('👤 Criando usuários e perfis...');

  // 1. Gerente do Sistema
  await prisma.user.create({
    data: {
      cpf: '00000000000',
      fullName: 'GERENTE DO SISTEMA',
      gender: Gender.OTHER,
      password: await hashPassword(password),
      role: SystemRole.MANAGER,
    },
  });

  // 2. Profissional de Saúde
  const healthProfessional = await prisma.user.create({
    data: {
      cpf: '11111111111',
      fullName: 'Dra. Ana Costa',
      gender: Gender.FEMALE,
      password: await hashPassword(password),
      role: SystemRole.HEALTH_PROFESSIONAL,
      healthProfessional: {
        create: {
          email: 'ana.costa@email.com',
          speciality: 'Fisioterapia', // Agora é um campo de texto
        },
      },
    },
  });

  // 3. Pesquisador
  await prisma.user.create({
    data: {
      cpf: '22222222222',
      fullName: 'Dr. Bruno Lima',
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

  // 4. Paciente
  const patient = await prisma.user.create({
    data: {
      cpf: '33333333333',
      fullName: 'Carlos Andrade',
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

  // --- CRIAÇÃO DE AVALIAÇÃO COM DADOS DE SENSOR ---
  console.log('📊 Criando avaliação com dados de sensor...');
  await prisma.evaluation.create({
    data: {
      type: TypeEvaluation.FTSTS,
      patientId: patient.id,
      healthProfessionalId: healthProfessional.id,
      healthcareUnitId: healthcareUnit.id,
      date: new Date(),
      time_init: new Date(),
      time_end: new Date(new Date().getTime() + 15000), // 15 segundos depois
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
              timestamp: new Date(new Date().getTime() + 100), // 100ms depois
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
