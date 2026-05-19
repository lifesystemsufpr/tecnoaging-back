import {
  PrismaClient,
  QuestionType,
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando o Seed Completo...');

  // ==================================================
  // 1. LIMPEZA DO IVCF-20 (Ordem importa por causa das FKs)
  // ==================================================
  console.log('🗑️ Limpando dados antigos do IVCF-20...');

  const existingIvcf = await prisma.questionnaire.findUnique({
    where: { slug: 'ivcf-20' },
    select: { id: true },
  });

  if (existingIvcf) {
    await prisma.answer.deleteMany({
      where: {
        questionnaireResponse: { questionnaireId: existingIvcf.id },
      },
    });

    await prisma.questionnaireResponse.deleteMany({
      where: { questionnaireId: existingIvcf.id },
    });

    await prisma.questionOption.deleteMany({
      where: {
        question: {
          OR: [
            { group: { questionnaireId: existingIvcf.id } },
            { subGroup: { group: { questionnaireId: existingIvcf.id } } },
          ],
        },
      },
    });

    await prisma.question.deleteMany({
      where: {
        OR: [
          { group: { questionnaireId: existingIvcf.id } },
          { subGroup: { group: { questionnaireId: existingIvcf.id } } },
        ],
      },
    });

    await prisma.questionSubGroup.deleteMany({
      where: { group: { questionnaireId: existingIvcf.id } },
    });

    await prisma.questionGroup.deleteMany({
      where: { questionnaireId: existingIvcf.id },
    });

    await prisma.questionnaire.deleteMany({ where: { id: existingIvcf.id } });
  }

  // ==================================================
  // 2. QUESTIONÁRIO IVCF-20 (Criação da Estrutura)
  // ==================================================
  console.log('📝 Criando Questionário IVCF-20 Estrutural...');

  await prisma.questionnaire.create({
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
                      { label: 'Sim', score: 1, order: 2 },
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
                      { label: 'Sim', score: 1, order: 2 },
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
                      { label: 'Sim', score: 2, order: 2 },
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
                      { label: 'Sim', score: 2, order: 2 },
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
                          {
                            label: 'Perda de peso maior que 4,5 kg no último ano',
                            score: 2,
                            order: 1,
                          },
                          { label: 'IMC menor que 22 kg/m²', score: 2, order: 2 },
                          {
                            label: 'Circunferência da panturrilha menor que 31 cm',
                            score: 2,
                            order: 3,
                          },
                          {
                            label: 'Tempo de marcha (4 m) maior que 5 segundos',
                            score: 2,
                            order: 4,
                          },
                          { label: 'Nenhuma das condições', score: 0, order: 5 },
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
                        'Você tem problemas de visão capazes de impedir a realização de alguma atividade do cotidiano? É permitido o uso de óculos ou lentes de contato.',
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
                        'Você tem problemas de audição capazes de impedir a realização de alguma atividade do cotidiano? É permitido o uso de aparelhos de audição.',
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
                    {
                      label: 'Cinco ou mais doenças crônicas (polipatologia)',
                      score: 4,
                      order: 1,
                    },
                    {
                      label: 'Uso de cinco ou mais medicamentos (polifarmácia)',
                      score: 4,
                      order: 2,
                    },
                    {
                      label: 'Internação hospitalar nos últimos 6 meses',
                      score: 4,
                      order: 3,
                    },
                    { label: 'Nenhuma das condições', score: 0, order: 4 },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  });

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });