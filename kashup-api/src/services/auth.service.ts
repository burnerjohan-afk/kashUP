import prisma from '../config/prisma';
import { ForgotPasswordInput, LoginInput, RegisterInput, RefreshInput } from '../schemas/auth.schema';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { getAccessTokenTTL, getRefreshTokenTTL, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { UserRole } from '../types/domain';

const publicUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  territory?: string | null;
}) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role as UserRole,
  territory: user.territory ?? null
});

const buildTokens = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}, rememberMe = false) => {
  const payload = {
    sub: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload, rememberMe),
    expiresIn: getAccessTokenTTL(),
    refreshExpiresIn: getRefreshTokenTTL(rememberMe),
    tokenType: 'Bearer'
  };
};

export const registerUser = async (input: RegisterInput) => {
  try {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new AppError('Un compte existe déjà avec cet email', 409);
    }

    const hashedPassword = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        territory: input.territory ?? 'Martinique',
        phone: input.phone,
        wallet: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        territory: true
      }
    });

    return {
      user: publicUser(user),
      tokens: buildTokens(user)
    };
  } catch (error) {
    // Si c'est déjà une AppError, on la relance telle quelle
    if (error instanceof AppError) {
      throw error;
    }
    
    // Sinon, on encapsule l'erreur Prisma avec plus de détails
    const prismaError = error as any;
    if (prismaError?.code === 'P2002') {
      throw new AppError('Un compte existe déjà avec cet email', 409);
    }
    if (prismaError?.code === 'P2003') {
      throw new AppError('Erreur de référence dans la base de données', 500);
    }
    
    // Erreur générique avec les détails pour le debugging
    throw new AppError(
      `Erreur lors de la création de l'utilisateur: ${prismaError?.message || String(error)}`,
      500
    );
  }
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (!user) {
    throw new AppError('Identifiants invalides', 401);
  }

  const isValid = await verifyPassword(input.password, user.hashedPassword);
  if (!isValid) {
    throw new AppError('Identifiants invalides', 401);
  }

  return {
    user: publicUser(user),
    tokens: buildTokens(user, input.rememberMe)
  };
};

export const refreshUserSession = async (input: RefreshInput) => {
  let payload: { sub: string; email: string; firstName: string; lastName: string; role: string };
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw new AppError('Token de rafraîchissement invalide ou expiré', 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true }
  });
  if (!user) {
    throw new AppError('Utilisateur introuvable', 401);
  }
  return {
    user: publicUser(user),
    tokens: buildTokens(user)
  };
};

export const requestPasswordReset = async (input: ForgotPasswordInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  if (!user) {
    return { sent: true };
  }

  // TODO: intégrer un vrai provider d’e-mail ou notification via Powens/Ses.
  return { sent: true };
};

