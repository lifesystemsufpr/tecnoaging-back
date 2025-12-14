import {
  PrismaClient,
  SystemRole,
  Gender,
  Scholarship,
  SocialEconomicLevel,
  TypeEvaluation,
  QuestionType, // <--- Importante: Adicionado enum QuestionType
} from '@prisma/client';
import { hashPassword } from '../src/shared/functions/hash-password';
import { normalizeString } from '../src/shared/functions/normalize-string';
import { fakerPT_BR as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o Seed Completo...');

  // ==================================================
  // 1. LIMPEZA (Ordem importa por causa das FKs)
  // ==================================================
  console.log('🗑️ Limpando dados antigos...');

  // Limpa respostas e questionários
  await prisma.answer.deleteMany({});
  await prisma.questionnaireResponse.deleteMany({});
  await prisma.questionOption.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.questionSubGroup.deleteMany({});
  await prisma.questionGroup.deleteMany({});
  await prisma.questionnaire.deleteMany({});

  // Limpa dados clínicos e usuários
  await prisma.sensorData.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.evaluationIndicators.deleteMany({}); // Caso exista
  await prisma.participant.deleteMany({});
  await prisma.researcher.deleteMany({});
  await prisma.healthProfessional.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.institution.deleteMany({});
  await prisma.healthcareUnit.deleteMany({});

  // ==================================================
  // 2. QUESTIONÁRIO IVCF-20 (COMPLETO BASEADO NO PDF)
  // ==================================================
  console.log('📝 Criando Questionário IVCF-20 Completo...');

  const ivcf = await prisma.questionnaire.create({
    data: {
      title: 'IVCF-20',
      slug: 'ivcf-20',
      description:
        'Índice de Vulnerabilidade Clínico-Funcional-20. Versão profissional de saúde.',
      version: '1.0',
      active: true,
      groups: {
        create: [
          // ===================================
          // GRUPO 1: IDADE
          // ===================================
          {
            title: 'Idade',
            order: 1,
            questions: {
              create: {
                statement: 'Qual é a sua idade?',
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                options: {
                  create: [
                    { label: '60 a 74 anos', score: 0, order: 1 },
                    { label: '75 a 84 anos', score: 1, order: 2 },
                    { label: '≥ 85 anos', score: 3, order: 3 },
                  ],
                },
              },
            },
          },

          // ===================================
          // GRUPO 2: AUTOPERCEPÇÃO DA SAÚDE
          // ===================================
          {
            title: 'Autopercepção da Saúde',
            order: 2,
            questions: {
              create: {
                statement:
                  'Em geral, comparando com outras pessoas de sua idade, você diria que sua saúde é:',
                order: 2,
                type: QuestionType.MULTIPLE_CHOICE,
                options: {
                  create: [
                    {
                      label: 'Excelente, muito boa ou boa',
                      score: 0,
                      order: 1,
                    },
                    { label: 'Regular ou ruim', score: 1, order: 2 },
                  ],
                },
              },
            },
          },

          // ===================================
          // GRUPO 3: AVD INSTRUMENTAL (AVD-I)
          // ===================================
          {
            title: 'Atividades de Vida Diária (AVD Instrumental)',
            description:
              'Pontuação máxima do grupo: 4 pontos (independente de quantas respostas "Sim").',
            order: 3,
            questions: {
              create: [
                {
                  statement:
                    'Por causa de sua saúde ou condição física, você deixou de fazer compras?',
                  order: 3,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      {
                        label: 'Não (ou não faz por outros motivos)',
                        score: 0,
                        order: 1,
                      },
                      { label: 'Sim', score: 4, order: 2 }, // Nota: Lógica de teto deve ser tratada no backend
                    ],
                  },
                },
                {
                  statement:
                    'Por causa de sua saúde ou condição física, você deixou de controlar seu dinheiro, gastos ou pagar as contas de sua casa?',
                  order: 4,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      {
                        label: 'Não (ou não controla por outros motivos)',
                        score: 0,
                        order: 1,
                      },
                      { label: 'Sim', score: 4, order: 2 },
                    ],
                  },
                },
                {
                  statement:
                    'Por causa de sua saúde ou condição física, você deixou de realizar pequenos trabalhos domésticos, como lavar louça, arrumar a casa ou fazer limpeza leve?',
                  order: 5,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      {
                        label: 'Não (ou não faz por outros motivos)',
                        score: 0,
                        order: 1,
                      },
                      { label: 'Sim', score: 4, order: 2 },
                    ],
                  },
                },
              ],
            },
          },

          // ===================================
          // GRUPO 4: AVD BÁSICA
          // ===================================
          {
            title: 'Atividades de Vida Diária (AVD Básica)',
            order: 4,
            questions: {
              create: {
                statement:
                  'Por causa de sua saúde ou condição física, você deixou de tomar banho sozinho?',
                order: 6,
                type: QuestionType.MULTIPLE_CHOICE,
                options: {
                  create: [
                    { label: 'Não', score: 0, order: 1 },
                    { label: 'Sim', score: 6, order: 2 }, // Peso alto no IVCF
                  ],
                },
              },
            },
          },

          // ===================================
          // GRUPO 5: COGNIÇÃO
          // ===================================
          {
            title: 'Cognição',
            order: 5,
            questions: {
              create: [
                {
                  statement:
                    'Algum familiar ou amigo falou que você está ficando esquecido?',
                  order: 7,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 0, order: 2 }, // Gatilho
                    ],
                  },
                },
                {
                  statement:
                    'Este esquecimento está piorando nos últimos meses?',
                  order: 8,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 0, order: 2 }, // Gatilho
                    ],
                  },
                },
                {
                  statement:
                    'Este esquecimento está impedindo a realização de alguma atividade do cotidiano?',
                  order: 9,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 4, order: 2 }, // Pontua aqui
                    ],
                  },
                },
              ],
            },
          },

          // ===================================
          // GRUPO 6: HUMOR
          // ===================================
          {
            title: 'Humor',
            order: 6,
            questions: {
              create: [
                {
                  statement:
                    'No último mês, você ficou com desânimo, tristeza ou desesperança?',
                  order: 10,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 0, order: 2 }, // Gatilho para pontuação combinada ou individual
                    ],
                  },
                },
                {
                  statement:
                    'No último mês, você perdeu o interesse ou prazer em atividades anteriormente prazerosas?',
                  order: 11,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 2, order: 2 }, // Pontua se sim em alguma das duas (verificar lógica no service)
                    ],
                  },
                },
              ],
            },
          },

          // ===================================
          // GRUPO 7: MOBILIDADE (Com Subgrupos)
          // ===================================
          {
            title: 'Mobilidade',
            order: 7,
            subGroups: {
              create: [
                {
                  title: 'Alcance, preensão e pinça',
                  order: 1,
                  questions: {
                    create: [
                      {
                        statement:
                          'Você é incapaz de elevar os braços acima do nível do ombro?',
                        order: 12,
                        type: QuestionType.MULTIPLE_CHOICE,
                        options: {
                          create: [
                            { label: 'Não (Consegue)', score: 0, order: 1 },
                            { label: 'Sim (Incapaz)', score: 1, order: 2 },
                          ],
                        },
                      },
                      {
                        statement:
                          'Você é incapaz de manusear ou segurar pequenos objetos?',
                        order: 13,
                        type: QuestionType.MULTIPLE_CHOICE,
                        options: {
                          create: [
                            { label: 'Não (Consegue)', score: 0, order: 1 },
                            { label: 'Sim (Incapaz)', score: 1, order: 2 },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  title: 'Capacidade aeróbica e força muscular',
                  order: 2,
                  questions: {
                    create: {
                      statement:
                        'Você tem alguma das quatro condições abaixo? (Perda de peso não intencional >4.5kg no ano; IMC < 22; Circunferência panturrilha < 31; Teste marcha > 5 seg)',
                      order: 14,
                      type: QuestionType.MULTIPLE_CHOICE,
                      options: {
                        create: [
                          { label: 'Não', score: 0, order: 1 },
                          { label: 'Sim', score: 2, order: 2 },
                        ],
                      },
                    },
                  },
                },
                {
                  title: 'Marcha',
                  order: 3,
                  questions: {
                    create: [
                      {
                        statement:
                          'Você tem dificuldade para caminhar capaz de impedir a realização de alguma atividade do cotidiano?',
                        order: 15,
                        type: QuestionType.MULTIPLE_CHOICE,
                        options: {
                          create: [
                            { label: 'Não', score: 0, order: 1 },
                            { label: 'Sim', score: 2, order: 2 },
                          ],
                        },
                      },
                      {
                        statement:
                          'Você teve duas ou mais quedas no último ano?',
                        order: 16,
                        type: QuestionType.MULTIPLE_CHOICE,
                        options: {
                          create: [
                            { label: 'Não', score: 0, order: 1 },
                            { label: 'Sim', score: 2, order: 2 },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  title: 'Continência esfincteriana',
                  order: 4,
                  questions: {
                    create: {
                      statement:
                        'Você perde urina ou fezes, sem querer, em algum momento?',
                      order: 17,
                      type: QuestionType.MULTIPLE_CHOICE,
                      options: {
                        create: [
                          { label: 'Não', score: 0, order: 1 },
                          { label: 'Sim', score: 2, order: 2 },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },

          // ===================================
          // GRUPO 8: COMUNICAÇÃO (Com Subgrupos)
          // ===================================
          {
            title: 'Comunicação',
            order: 8,
            subGroups: {
              create: [
                {
                  title: 'Visão',
                  order: 1,
                  questions: {
                    create: {
                      statement:
                        'Você tem problemas de visão capazes de impedir a realização de alguma atividade do cotidiano? (É permitido o uso de óculos)',
                      order: 18,
                      type: QuestionType.MULTIPLE_CHOICE,
                      options: {
                        create: [
                          { label: 'Não', score: 0, order: 1 },
                          { label: 'Sim', score: 2, order: 2 },
                        ],
                      },
                    },
                  },
                },
                {
                  title: 'Audição',
                  order: 2,
                  questions: {
                    create: {
                      statement:
                        'Você tem problemas de audição capazes de impedir a realização de alguma atividade do cotidiano? (É permitido uso de aparelho)',
                      order: 19,
                      type: QuestionType.MULTIPLE_CHOICE,
                      options: {
                        create: [
                          { label: 'Não', score: 0, order: 1 },
                          { label: 'Sim', score: 2, order: 2 },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },

          // ===================================
          // GRUPO 9: COMORBIDADES MÚLTIPLAS
          // ===================================
          {
            title: 'Comorbidades Múltiplas',
            description: 'Polipatologia, Polifarmácia e Internação Recente',
            order: 9,
            questions: {
              create: {
                statement:
                  'Você tem alguma das três condições abaixo? (5 ou mais doenças crônicas; 5 ou mais medicamentos diários; Internação nos últimos 6 meses)',
                order: 20,
                type: QuestionType.MULTIPLE_CHOICE,
                options: {
                  create: [
                    { label: 'Não', score: 0, order: 1 },
                    { label: 'Sim', score: 4, order: 2 },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  });

  // ==================================================
  // 3. PREPARAÇÃO DE SENHA
  // ==================================================
  const passwordHash = await hashPassword('senha123');

  // ==================================================
  // 4. USUÁRIOS FIXOS (PARA LOGIN)
  // ==================================================

  console.log('👑 Criando Usuários Fixos...');

  // 4.1 ADMIN (Manager)
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

  // 4.2 MÉDICO FIXO
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
          speciality: 'Geriatria',
          speciality_normalized: 'geriatria',
        },
      },
    },
    include: { healthProfessional: true },
  });

  const healthProsIds: string[] = [];
  if (fixedDoctor.healthProfessional) {
    healthProsIds.push(fixedDoctor.healthProfessional.id);
  }

  // ==================================================
  // 5. ESTRUTURA (INSTITUIÇÃO E UNIDADES)
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
  // 6. DADOS ALEATÓRIOS (VOLUME)
  // ==================================================

  // 6.1 Profissionais Aleatórios
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

  // 6.2 Pacientes e Avaliações
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

    // --- Simulação: Paciente responde ao IVCF-20 ---
    // Vamos simular que alguns responderam
    if (Math.random() > 0.3) {
      // 70% de chance de ter respondido
      // Aqui poderíamos criar uma QuestionnaireResponse fake,
      // mas como requer lógica de calcular score baseada nas opções,
      // deixaremos apenas o formulário pronto (Questions) e o paciente criado.
    }

    // --- Simulação: Avaliação Física (Sensor) ---
    const numEvals = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < numEvals; j++) {
      const randomHPId =
        healthProsIds[Math.floor(Math.random() * healthProsIds.length)];
      const randomUnit = units[Math.floor(Math.random() * units.length)];
      const date = faker.date.recent({ days: 60 });
      const timeInit = new Date(date);
      const timeEnd = new Date(date.getTime() + 30000);

      const sensorDataMock = Array.from({ length: 100 }).map((_, idx) => {
        const wave = Math.sin(idx * 0.2);
        return {
          timestamp: new Date(timeInit.getTime() + idx * 20),
          accel_x: wave * 0.5,
          accel_y: faker.number.float({ min: -0.1, max: 0.1 }),
          accel_z: 1.0 + wave * 0.5,
          gyro_x: faker.number.float({ min: -0.1, max: 0.1 }),
          gyro_y: wave * 2.0,
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
  console.log('🔑 CREDENCIAIS:');
  console.log('   ADMIN:   CPF 00000000000 / senha123');
  console.log('   MÉDICO:  CPF 11111111111 / senha123');
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
