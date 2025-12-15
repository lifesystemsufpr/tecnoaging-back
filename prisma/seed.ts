import {
  PrismaClient,
  SystemRole,
  Gender,
  Scholarship,
  SocialEconomicLevel,
  TypeEvaluation,
  QuestionType,
} from '@prisma/client';
import { hashPassword } from '../src/shared/functions/hash-password'; // Ajuste o caminho conforme seu projeto
import { normalizeString } from '../src/shared/functions/normalize-string'; // Ajuste o caminho conforme seu projeto
import { fakerPT_BR as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o Seed Completo...');

  // ==================================================
  // 1. LIMPEZA (Ordem importa por causa das FKs)
  // ==================================================
  console.log('🗑️ Limpando dados antigos...');

  await prisma.answer.deleteMany({});
  await prisma.questionnaireResponse.deleteMany({});
  await prisma.questionOption.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.questionSubGroup.deleteMany({});
  await prisma.questionGroup.deleteMany({});
  await prisma.questionnaire.deleteMany({});

  await prisma.sensorData.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.evaluationIndicators.deleteMany({});
  await prisma.participant.deleteMany({});
  await prisma.researcher.deleteMany({});
  await prisma.healthProfessional.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.institution.deleteMany({});
  await prisma.healthcareUnit.deleteMany({});

  // ==================================================
  // 2. QUESTIONÁRIO IVCF-20 (Criação da Estrutura)
  // ==================================================
  console.log('📝 Criando Questionário IVCF-20 Estrutural...');

  const createdIvcf = await prisma.questionnaire.create({
    data: {
      title: 'IVCF-20',
      slug: 'ivcf-20',
      description:
        'Índice de Vulnerabilidade Clínico-Funcional-20. Versão profissional de saúde.',
      version: '1.0',
      active: true,
      groups: {
        create: [
          // GRUPO 1: IDADE
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
          // GRUPO 2: AUTOPERCEPÇÃO
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
                    { label: 'Excelente, muito boa ou boa', score: 0, order: 1 },
                    { label: 'Regular ou ruim', score: 1, order: 2 },
                  ],
                },
              },
            },
          },
          // GRUPO 3: AVD INSTRUMENTAL
          {
            title: 'Atividades de Vida Diária (AVD Instrumental)',
            description: 'Pontuação máxima do grupo: 4 pontos.',
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
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 4, order: 2 },
                    ],
                  },
                },
                {
                  statement:
                    'Por causa de sua saúde ou condição física, você deixou de controlar seu dinheiro?',
                  order: 4,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 4, order: 2 },
                    ],
                  },
                },
                {
                  statement:
                    'Por causa de sua saúde ou condição física, você deixou de realizar pequenos trabalhos domésticos?',
                  order: 5,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 4, order: 2 },
                    ],
                  },
                },
              ],
            },
          },
          // GRUPO 4: AVD BÁSICA
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
                    { label: 'Sim', score: 6, order: 2 },
                  ],
                },
              },
            },
          },
          // GRUPO 5: COGNIÇÃO
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
                      { label: 'Sim', score: 0, order: 2 },
                    ],
                  },
                },
                {
                  statement: 'Este esquecimento está piorando nos últimos meses?',
                  order: 8,
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    create: [
                      { label: 'Não', score: 0, order: 1 },
                      { label: 'Sim', score: 0, order: 2 },
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
                      { label: 'Sim', score: 4, order: 2 },
                    ],
                  },
                },
              ],
            },
          },
          // GRUPO 6: HUMOR
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
                      { label: 'Sim', score: 0, order: 2 },
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
                      { label: 'Sim', score: 2, order: 2 },
                    ],
                  },
                },
              ],
            },
          },
          // GRUPO 7: MOBILIDADE
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
                            { label: 'Não', score: 0, order: 1 },
                            { label: 'Sim', score: 1, order: 2 },
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
                            { label: 'Não', score: 0, order: 1 },
                            { label: 'Sim', score: 1, order: 2 },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  title: 'Capacidade aeróbica / Muscular',
                  order: 2,
                  questions: {
                    create: {
                      statement:
                        'Você tem alguma das quatro condições abaixo? (Perda de peso, IMC baixo, etc)',
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
                        statement: 'Você teve duas ou mais quedas no último ano?',
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
                  title: 'Continência',
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
          // GRUPO 8: COMUNICAÇÃO
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
                        'Você tem problemas de visão capazes de impedir a realização de alguma atividade do cotidiano?',
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
                        'Você tem problemas de audição capazes de impedir a realização de alguma atividade do cotidiano?',
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
          // GRUPO 9: COMORBIDADES
          {
            title: 'Comorbidades Múltiplas',
            order: 9,
            questions: {
              create: {
                statement:
                  'Você tem alguma das três condições? (Polipatologia, Polifarmácia, Internação recente)',
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

  // =========================================================================
  // 2.1 RECUPERAR A ESTRUTURA PARA USAR NO LOOP (FLATTENING QUESTIONS)
  // =========================================================================
  // Precisamos buscar de volta para ter os IDs gerados das Questions e Options
  const ivcfFull = await prisma.questionnaire.findUnique({
    where: { id: createdIvcf.id },
    include: {
      groups: {
        include: {
          questions: { include: { options: true } },
          subGroups: {
            include: {
              questions: { include: { options: true } },
            },
          },
        },
      },
    },
  });

  // Cria uma lista plana de todas as questões para facilitar a iteração na hora de responder
  const flatQuestions: any[] = [];
  if (ivcfFull?.groups) {
    ivcfFull.groups.forEach((group) => {
      // Questões diretas do grupo
      if (group.questions) {
        flatQuestions.push(...group.questions);
      }
      // Questões dentro de subgrupos
      if (group.subGroups) {
        group.subGroups.forEach((sub) => {
          if (sub.questions) {
            flatQuestions.push(...sub.questions);
          }
        });
      }
    });
  }

  // ==================================================
  // 3. SENHA PADRÃO E USUÁRIOS FIXOS
  // ==================================================
  const passwordHash = await hashPassword('senha123');

  console.log('👑 Criando Usuários Fixos...');

  // 3.1 ADMIN
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

  // 3.2 MÉDICO FIXO
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
  // 5. PROFISSIONAIS ALEATÓRIOS
  // ==================================================
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
            speciality_normalized: 'fisioterapia',
          },
        },
      },
      include: { healthProfessional: true },
    });

    if (hpUser.healthProfessional) {
      healthProsIds.push(hpUser.healthProfessional.id);
    }
  }

  // ==================================================
  // 6. PACIENTES E DADOS CLÍNICOS (Questionários e Sensores)
  // ==================================================
  console.log('👴 Criando 20 Pacientes com Avaliações e Questionários...');

  for (let i = 0; i < 20; i++) {
    const sex = i % 2 === 0 ? 'male' : 'female';
    const name = faker.person.fullName({ sex });

    // Cria o paciente
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
    const randomHPId =
      healthProsIds[Math.floor(Math.random() * healthProsIds.length)];

    // ------------------------------------------------------------------
    // 6.1 RESPONDER QUESTIONÁRIO (Simulação)
    // ------------------------------------------------------------------
    // Vamos simular que 80% dos pacientes responderam ao IVCF-20
    if (Math.random() > 0.2 && ivcfFull) {
      const responseDate = faker.date.recent({ days: 90 });
      let totalScore = 0;

      // Prepara os dados das respostas (Answers)
      const answersData = flatQuestions
        .map((question) => {
          // Seleciona uma opção aleatória (simulando resposta do paciente)
          if (!question.options || question.options.length === 0) return null;

          // Ponderação simples: dar preferência para pontuação 0 (saudável) na maioria das vezes para não gerar só idosos frágeis
          const isHealthy = Math.random() > 0.4;
          const selectedOption = isHealthy
            ? question.options.find((o: any) => o.score === 0) ||
              question.options[0]
            : question.options[
                Math.floor(Math.random() * question.options.length)
              ];

          // Acumula o score
          totalScore += selectedOption.score;

          return {
            questionId: question.id,
            selectedOptionId: selectedOption.id,
          };
        })
        .filter((a) => a !== null); // Remove nulos caso alguma questao nao tenha opcao

      // Define classificação baseada na soma (Lógica aproximada do IVCF-20)
      // 0-6: Robusto | 7-14: Em Risco de Fragilização | >=15: Frágil
      let classification = 'Robusto';
      if (totalScore >= 7 && totalScore <= 14) {
        classification = 'Em Risco de Fragilização';
      } else if (totalScore >= 15) {
        classification = 'Frágil';
      }

      // Cria a Response com as Answers aninhadas
      await prisma.questionnaireResponse.create({
        data: {
          participantId: participantId,
          healthProfessionalId: randomHPId,
          questionnaireId: ivcfFull.id,
          date: responseDate,
          totalScore: totalScore,
          classification: classification,
          answers: {
            create: answersData as any, // "as any" apenas para simplificar tipagem complexa no seed
          },
        },
      });
    }

    // ------------------------------------------------------------------
    // 6.2 AVALIAÇÃO FÍSICA (Sensor)
    // ------------------------------------------------------------------
    const numEvals = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < numEvals; j++) {
      const randomUnit = units[Math.floor(Math.random() * units.length)];
      const date = faker.date.recent({ days: 60 });
      const timeInit = new Date(date);
      const timeEnd = new Date(date.getTime() + 30000); // 30 segundos depois

      // Gera dados fake de acelerômetro
      const sensorDataMock = Array.from({ length: 50 }).map((_, idx) => {
        const wave = Math.sin(idx * 0.2);
        return {
          timestamp: new Date(timeInit.getTime() + idx * 100), // 10Hz aprox
          accel_x: wave * 0.5,
          accel_y: faker.number.float({ min: -0.1, max: 0.1 }),
          accel_z: 1.0 + wave * 0.5,
          gyro_x: faker.number.float({ min: -0.1, max: 0.1 }),
          gyro_y: wave * 2.0,
          gyro_z: faker.number.float({ min: -0.1, max: 0.1 }),
          filtered: false,
        };
      });

      // Cria a avaliação com os dados do sensor
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
          // Opcional: Criar indicadores calculados
          indicators: {
            create: {
              repetitionCount: faker.number.int({ min: 3, max: 10 }),
              meanPower: faker.number.float({ min: 100, max: 300 }),
              totalEnergy: faker.number.float({ min: 500, max: 2000 }),
              classification: 'Normal',
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