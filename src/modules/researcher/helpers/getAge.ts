export function getAge(birthday: string | Date) {
  const birthDate = new Date(birthday);

  const ageDifMs = Date.now() - birthDate.getTime();
  const ageDate = new Date(ageDifMs);

  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
