import jwt from 'jsonwebtoken';
import env from '../config/env';
import { UserRole } from '../types/domain';

export type JwtPayload = {
  sub: string;
  role: UserRole | string;
  firstName: string;
  lastName: string;
  email: string;
};

const ACCESS_TOKEN_EXPIRATION = '15m';
const REFRESH_TOKEN_EXPIRATION_SHORT = '7d';
const REFRESH_TOKEN_EXPIRATION_LONG = '30d';

export const signAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

export const signRefreshToken = (payload: JwtPayload, rememberMe = false) => {
  const expiresIn = rememberMe ? REFRESH_TOKEN_EXPIRATION_LONG : REFRESH_TOKEN_EXPIRATION_SHORT;
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as JwtPayload;
};

export const getAccessTokenTTL = () => ACCESS_TOKEN_EXPIRATION;
export const getRefreshTokenTTL = (rememberMe = false) =>
  rememberMe ? REFRESH_TOKEN_EXPIRATION_LONG : REFRESH_TOKEN_EXPIRATION_SHORT;

