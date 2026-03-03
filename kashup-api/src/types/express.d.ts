import { UserRole } from './domain';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        role: UserRole;
        firstName: string;
        lastName: string;
        email: string;
      };
    }
  }
}

export {};

