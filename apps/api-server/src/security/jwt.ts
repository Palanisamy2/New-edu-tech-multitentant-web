import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  userId: string;
  role: string;
  tenantSlug: string;
}

export function generateToken(payload: JWTPayload): string {
  // Access tokens should be short-lived (15 minutes)
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });
}

export function generateRefreshToken(): string {
  // Random secure string for the refresh token
  return require('crypto').randomBytes(40).toString('hex');
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
}
