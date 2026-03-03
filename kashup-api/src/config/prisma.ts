import { PrismaClient } from '@prisma/client';
import env from './env';

// Créer l'instance PrismaClient avec configuration de logging
const prismaInstance = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// Type d'export explicite pour forcer TypeScript à reconnaître tous les delegates
// Cela inclut powensConnection, userConsent, et tous les autres modèles
export type PrismaClientType = typeof prismaInstance & {
  powensConnection: typeof prismaInstance.powensConnection;
  userConsent: typeof prismaInstance.userConsent;
};

// Cast explicite pour que TypeScript reconnaisse tous les delegates
const prisma = prismaInstance as unknown as PrismaClientType;

export default prisma;

