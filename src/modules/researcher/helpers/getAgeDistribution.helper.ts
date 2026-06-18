import { ResearcherParticipantsData } from '../interfaces/researcher.interface';
import { getAge } from './getAge';

export const getAgeDistribution = (
  participants: ResearcherParticipantsData[],
) => {
  const buckets = {
    '60-64': 0,
    '65-69': 0,
    '70-74': 0,
    '75-79': 0,
    '80-84': 0,
    '85-89': 0,
    '90+': 0,
  };

  participants.forEach((participant) => {
    const age = getAge(participant.birthday);

    if (age >= 60 && age <= 64) {
      buckets['60-64']++;
    } else if (age >= 65 && age <= 69) {
      buckets['65-69']++;
    } else if (age >= 70 && age <= 74) {
      buckets['70-74']++;
    } else if (age >= 75 && age <= 79) {
      buckets['75-79']++;
    } else if (age >= 80 && age <= 84) {
      buckets['80-84']++;
    } else if (age >= 85 && age <= 89) {
      buckets['85-89']++;
    } else if (age >= 90) {
      buckets['90+']++;
    }
  });

  return Object.entries(buckets).map(([label, value]) => ({
    label,
    value,
  }));
};
