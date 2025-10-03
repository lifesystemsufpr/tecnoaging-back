import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const rounds = 10;
  return await bcrypt.hashSync(password, rounds);
}

export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
