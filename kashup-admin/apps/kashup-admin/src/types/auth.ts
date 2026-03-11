export type UserRole = 'admin' | 'support' | 'partner_manager';

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  lastLoginAt?: string;
};

