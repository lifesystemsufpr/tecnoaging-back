import { ApiProperty } from '@nestjs/swagger';
import {
    AgeGroup,
    RiskClassification,
    SelfPerceptionHealth,
} from '@prisma/client';

export class RespostaAvaliacaoIvcf20Dto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    patientId: string;

    @ApiProperty()
    healthProfessionalId: string;

    @ApiProperty()
    evaluationId: string;

    @ApiProperty()
    date: Date;

    @ApiProperty()
    totalScore: number;

    @ApiProperty({ enum: RiskClassification })
    riskClassification: RiskClassification;

    @ApiProperty({ enum: AgeGroup })
    ageGroup: AgeGroup;

    @ApiProperty({ enum: SelfPerceptionHealth })
    selfPerceptionHealth: SelfPerceptionHealth;

    @ApiProperty()
    avdInstrumentalShopping: boolean;

    @ApiProperty()
    avdInstrumentalFinance: boolean;

    @ApiProperty()
    avdInstrumentalHousework: boolean;

    @ApiProperty()
    avdBasicBathing: boolean;

    @ApiProperty()
    cognitionFamilyAlert: boolean;

    @ApiProperty()
    cognitionWorsening: boolean;

    @ApiProperty()
    cognitionImpediment: boolean;

    @ApiProperty()
    humorDespair: boolean;

    @ApiProperty()
    humorLossOfInterest: boolean;

    @ApiProperty()
    mobilityFineMotor: boolean;

    @ApiProperty()
    mobilityWalkingDifficulty: boolean;

    @ApiProperty()
    mobilityFalls: boolean;

    @ApiProperty()
    communicationHearing: boolean;

    @ApiProperty()
    communicationSpeaking: boolean;

    @ApiProperty()
    comorbiditiesFiveOrMore: boolean;

    @ApiProperty()
    comorbiditiesFiveOrMoreMeds: boolean;

    @ApiProperty()
    alertSignsIncontinence: boolean;

    @ApiProperty()
    alertSignsWeightLoss: boolean;

    @ApiProperty()
    alertSignsLowBMI: boolean;

    @ApiProperty()
    alertSignsLowCalfCircumference: boolean;

    @ApiProperty()
    alertSignsSlowGaitSpeed: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
