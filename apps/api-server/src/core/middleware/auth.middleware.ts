import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../security/jwt';
import { getTenantSlug } from '@genyuga/shared-context';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    tenantSlug: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    const currentTenant = getTenantSlug();

    // Cross-tenant protection: 
    // Ensure the token was issued for the tenant currently being accessed
    if (payload.tenantSlug !== currentTenant && currentTenant !== 'public') {
      return res.status(403).json({ error: 'Forbidden: Accessing mismatched tenant' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
