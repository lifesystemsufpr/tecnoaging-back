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
// Certifique-se de ter instalado: npm install @faker-js/faker
import { fakerPT_BR as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o Seed Completo...');

  // 1. Limpeza
  console.log('🗑️ Limpando dados antigos...');
  await prisma.sensorData.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.participant.deleteMany({});
  await prisma.researcher.deleteMany({});
  await prisma.healthProfessional.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.institution.deleteMany({});
  await prisma.healthcareUnit.deleteMany({});

  // 2. Preparação: Senha padrão
  const passwordHash = await hashPassword('senha123');

  // ==================================================
  // 3. USUÁRIOS FIXOS (PARA LOGIN)
  // ==================================================

  console.log('👑 Criando Usuários Fixos...');

  // 3.1 ADMIN (Manager)
  await prisma.user.create({
    data: {
      cpf: '00000000000',
      fullName: 'Admin do Sistema',
      fullName_normalized: 'admin do sistema',
      gender: Gender.OTHER,
      password: passwordHash,
      role: SystemRole.MANAGER,
    },
  });

  // 3.2 MÉDICO FIXO (Para testar a visão do profissional)
  const fixedDoctor = await prisma.user.create({
    data: {
      cpf: '11111111111',
      fullName: 'Dra. Ana Fixa',
      fullName_normalized: 'dra. ana fixa',
      gender: Gender.FEMALE,
      password: passwordHash,
      role: SystemRole.HEALTH_PROFESSIONAL,
      healthProfessional: {
        create: {
          email: 'ana.fixa@teste.com',
          speciality: 'Geral',
          speciality_normalized: 'geral',
        },
      },
    },
    include: { healthProfessional: true },
  });

  // Lista de IDs de profissionais para distribuir pacientes (começa com a fixa)
  const healthProsIds: string[] = [];
  if (fixedDoctor.healthProfessional) {
    healthProsIds.push(fixedDoctor.healthProfessional.id);
  }

  // ==================================================
  // 4. ESTRUTURA (INSTITUIÇÃO E UNIDADES)
  // ==================================================
  console.log('🏥 Criando Estrutura...');

  await prisma.institution.create({
    data: {
      title: 'UFPR',
      title_normalized: normalizeString('UFPR') || 'ufpr',
    },
  });

  const units = await Promise.all([
    prisma.healthcareUnit.create({
      data: {
        name: 'UBS Centro',
        name_normalized: normalizeString('UBS Centro') || 'ubs centro',
        zipCode: '80000000',
        street: 'Rua XV',
        number: '10',
        city: 'Curitiba',
        state: 'PR',
        neighborhood: 'Centro',
      },
    }),
    prisma.healthcareUnit.create({
      data: {
        name: 'Hospital de Clínicas',
        name_normalized:
          normalizeString('Hospital de Clínicas') || 'hospital de clinicas',
        zipCode: '80060000',
        street: 'General Carneiro',
        number: '181',
        city: 'Curitiba',
        state: 'PR',
        neighborhood: 'Alto da Glória',
      },
    }),
  ]);

  // ==================================================
  // 5. DADOS ALEATÓRIOS (VOLUME)
  // ==================================================

  // 5.1 Criar mais 5 Profissionais aleatórios
  console.log('👨‍⚕️ Criando Profissionais Aleatórios...');
  for (let i = 0; i < 5; i++) {
    const name = faker.person.fullName();
    const hpUser = await prisma.user.create({
      data: {
        cpf: faker.string.numeric(11),
        fullName: name,
        fullName_normalized: normalizeString(name) || name.toLowerCase(),
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        password: passwordHash,
        role: SystemRole.HEALTH_PROFESSIONAL,
        healthProfessional: {
          create: {
            email: faker.internet.email(),
            speciality: 'Fisioterapia',
            speciality_normalized:
              normalizeString('Fisioterapia') || 'fisioterapia',
          },
        },
      },
      include: { healthProfessional: true },
    });

    if (hpUser.healthProfessional) {
      healthProsIds.push(hpUser.healthProfessional.id);
    }
  }

  // 5.2 Criar 20 Pacientes e suas Avaliações
  console.log('👴 Criando 20 Pacientes e Avaliações...');

  for (let i = 0; i < 20; i++) {
    const sex = i % 2 === 0 ? 'male' : 'female';
    const name = faker.person.fullName({ sex });

    const participantUser = await prisma.user.create({
      data: {
        cpf: faker.string.numeric(11),
        fullName: name,
        fullName_normalized: normalizeString(name) || name.toLowerCase(),
        gender: sex === 'male' ? Gender.MALE : Gender.FEMALE,
        password: passwordHash,
        role: SystemRole.PARTICIPANT,
        participant: {
          create: {
            birthday: faker.date.birthdate({ min: 60, max: 90, mode: 'age' }),
            weight: faker.number.int({ min: 50, max: 100 }),
            height: faker.number.int({ min: 150, max: 190 }),
            zipCode: '80000000',
            street: faker.location.street(),
            number: String(faker.number.int({ min: 1, max: 1000 })),
            city: 'Curitiba',
            state: 'PR',
            neighborhood: 'Batel',
            socio_economic_level: SocialEconomicLevel.C,
            scholarship: Scholarship.HIGH_SCHOOL_COMPLETE,
          },
        },
      },
      include: { participant: true },
    });

    if (!participantUser.participant) continue;
    const participantId = participantUser.participant.id;

    // Cria de 1 a 3 avaliações por paciente
    const numEvals = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < numEvals; j++) {
      // Sorteia um profissional (pode cair na Dra. Ana Fixa) e uma unidade
      const randomHPId =
        healthProsIds[Math.floor(Math.random() * healthProsIds.length)];
      const randomUnit = units[Math.floor(Math.random() * units.length)];

      // Datas recentes
      const date = faker.date.recent({ days: 60 });
      const timeInit = new Date(date);
      const timeEnd = new Date(date.getTime() + 30000); // +30s

      // 100 pontos de dados de sensor (Simulação)
      const sensorDataMock = Array.from({ length: 300 }).map((_, idx) => {
        // Cria uma onda senoidal para simular o movimento repetitivo
        // O movimento de sentar/levantar altera o ângulo (Giroscópio) e a aceleração
        const wave = Math.sin(idx * 0.2);

        return {
          timestamp: new Date(timeInit.getTime() + idx * 20), // 20ms = 50Hz

          // Simula movimento forte no eixo X (tronco indo pra frente/trás)
          accel_x: wave * 0.5,
          accel_y: faker.number.float({ min: -0.1, max: 0.1 }),
          // Aceleração vertical variando em torno da gravidade (1G)
          accel_z: 1.0 + wave * 0.5,

          // Simula rotação (Giroscópio) acompanhando o movimento
          gyro_x: faker.number.float({ min: -0.1, max: 0.1 }),
          gyro_y: wave * 2.0, // Rotação forte no eixo Y (Pitch - inclinação)
          gyro_z: faker.number.float({ min: -0.1, max: 0.1 }),

          filtered: false,
        };
      });

      await prisma.evaluation.create({
        data: {
          type: TypeEvaluation.FTSTS,
          date: date,
          time_init: timeInit,
          time_end: timeEnd,
          participantId: participantId,
          healthProfessionalId: randomHPId,
          healthcareUnitId: randomUnit.id,
          sensorData: {
            createMany: {
              data: sensorDataMock,
            },
          },
        },
      });
    }
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log('------------------------------------------------');
  console.log('🔑 CREDENCIAIS PARA LOGIN:');
  console.log('   ADMIN:   CPF: 00000000000 / Senha: senha123');
  console.log('   MÉDICO:  CPF: 11111111111 / Senha: senha123');
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
