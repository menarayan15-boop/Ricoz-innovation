import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserRole } from '../types/index.js';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

export const generateRefreshToken = (id: string): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ id }, config.jwt.refreshSecret, options);
};

export const verifyRefreshToken = (token: string): { id: string } => {
  return jwt.verify(token, config.jwt.refreshSecret) as { id: string };
};
