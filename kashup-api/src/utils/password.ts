import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (plain: string) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
};

export const verifyPassword = (plain: string, hashed: string) => {
  return bcrypt.compare(plain, hashed);
};

