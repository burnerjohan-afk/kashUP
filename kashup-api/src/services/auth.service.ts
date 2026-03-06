import prisma from '../config/prisma';
import { ForgotPasswordInput, LoginInput, RegisterInput, RefreshInput, AppleSignInInput, GoogleSignInInput } from '../schemas/auth.schema';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { getAccessTokenTTL, getRefreshTokenTTL, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { UserRole } from '../types/domain';
import jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const publicUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  territory?: string | null;
  partnerId?: string | null;
}) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role as UserRole,
  territory: user.territory ?? null,
  partnerId: user.partnerId ?? null
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
        gender: input.gender ?? null,
        ageRange: input.ageRange ?? null,
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
        territory: true,
        partnerId: true
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
    select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true, partnerId: true }
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

/** Vérifie le token Apple et retourne sub (appleId) et email si présents */
async function verifyAppleIdentityToken(identityToken: string): Promise<{ sub: string; email?: string | null; firstName?: string; lastName?: string }> {
  const decodedHeader = jwt.decode(identityToken, { complete: true }) as { header: { kid: string }; payload: jwt.JwtPayload } | null;
  if (!decodedHeader?.header?.kid) throw new AppError('Token Apple invalide (header)', 401);
  const client = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
  });
  const key = await client.getSigningKey(decodedHeader.header.kid);
  const signingKey = key.getPublicKey();
  const decoded = jwt.verify(identityToken, signingKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
  }) as jwt.JwtPayload;
  const sub = decoded.sub;
  if (!sub) throw new AppError('Token Apple invalide (sub manquant)', 401);
  return {
    sub,
    email: decoded.email ?? null,
    firstName: decoded.given_name ?? undefined,
    lastName: decoded.family_name ?? undefined,
  };
}

/** Vérifie le token Google et retourne sub (googleId) et email */
async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string; firstName?: string; lastName?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError('Configuration Google manquante (GOOGLE_CLIENT_ID)', 500);
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new AppError('Token Google invalide', 401);
  const email = payload.email ?? payload.sub + '@google.oauth';
  return {
    sub: payload.sub,
    email: email.toLowerCase(),
    firstName: payload.given_name ?? undefined,
    lastName: payload.family_name ?? undefined,
  };
}

/** Mot de passe factice pour les comptes OAuth (non utilisable en login classique) */
const OAUTH_PLACEHOLDER_PASSWORD = 'oauth-no-password-login';

export const signInWithApple = async (input: AppleSignInInput) => {
  const { sub: appleId, email, firstName, lastName } = await verifyAppleIdentityToken(input.identityToken);
  let user = await prisma.user.findUnique({
    where: { appleId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true },
  });
  if (!user && email) {
    user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { appleId },
      });
    }
  }
  if (!user) {
    if (!email) throw new AppError('Impossible de créer le compte : email non fourni par Apple. Réessayez en autorisant l’email.', 400);
    const hashedPlaceholder = await hashPassword(OAUTH_PLACEHOLDER_PASSWORD + appleId);
    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        hashedPassword: hashedPlaceholder,
        appleId,
        firstName: firstName ?? email.split('@')[0] ?? 'Utilisateur',
        lastName: lastName ?? 'KashUP',
        territory: 'Martinique',
        wallet: { create: {} },
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true },
    });
    user = created;
  }
  return {
    user: publicUser(user),
    tokens: buildTokens(user),
  };
};

export const signInWithGoogle = async (input: GoogleSignInInput) => {
  const { sub: googleId, email, firstName, lastName } = await verifyGoogleIdToken(input.idToken);
  let user = await prisma.user.findUnique({
    where: { googleId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true },
  });
  if (!user) {
    user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }
  }
  if (!user) {
    const hashedPlaceholder = await hashPassword(OAUTH_PLACEHOLDER_PASSWORD + googleId);
    const created = await prisma.user.create({
      data: {
        email,
        hashedPassword: hashedPlaceholder,
        googleId,
        firstName: firstName ?? email.split('@')[0] ?? 'Utilisateur',
        lastName: lastName ?? 'KashUP',
        territory: 'Martinique',
        wallet: { create: {} },
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, territory: true },
    });
    user = created;
  }
  return {
    user: publicUser(user),
    tokens: buildTokens(user),
  };
};

