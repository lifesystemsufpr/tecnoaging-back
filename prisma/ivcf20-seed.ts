import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Seed de Produção (IVCF-20)...');

  // 1. TRAVA DE SEGURANÇA: Verificar se já existe
  const existingIvcf = await prisma.questionnaire.findUnique({
    where: { slug: 'ivcf-20' },
  });

  if (existingIvcf) {
    console.log(
      '⚠️ O questionário IVCF-20 já existe no banco. Operação cancelada para evitar duplicidade.',
    );
    return;
  }

  // 2. CRIAÇÃO DA ESTRUTURA
  console.log('📝 Criando estrutura do IVCF-20...');

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
          // --- GRUPO 1: IDADE ---
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
          // --- GRUPO 2: PERCEPÇÃO ---
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
          // --- GRUPO 3: AVD INSTRUMENTAL (Teto 4 pts) ---
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
                      {
                        label: 'Não (ou não faz por outros motivos)',
                        score: 0,
                        order: 1,
                      },
                      { label: 'Sim', score: 4, order: 2 },
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
          // --- GRUPO 4: AVD BÁSICA ---
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
          // --- GRUPO 5: COGNIÇÃO ---
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
                  statement:
                    'Este esquecimento está piorando nos últimos meses?',
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
          // --- GRUPO 6: HUMOR ---
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
          // --- GRUPO 7: MOBILIDADE (SUBGRUPOS) ---
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
                        'Você tem alguma das quatro condições abaixo? (Perda de peso >4.5kg; IMC < 22; Panturrilha < 31; Marcha > 5s)',
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
          // --- GRUPO 8: COMUNICAÇÃO (SUBGRUPOS) ---
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
          // --- GRUPO 9: COMORBIDADES ---
          {
            title: 'Comorbidades Múltiplas',
            description:
              'Polipatologia, Polifarmácia e Internação Recente (Teto 4 pts)',
            order: 9,
            questions: {
              create: {
                statement:
                  'Você tem alguma das três condições abaixo? (5+ doenças; 5+ medicamentos; Internação < 6 meses)',
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

  console.log('✅ Questionário IVCF-20 populado com sucesso em PROD!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
