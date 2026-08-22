import { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage } from '@genyuga/shared-context';

export function tenantResolver(req: Request, res: Response, next: NextFunction) {
  // 1. Extract tenant slug from Host header or custom header for testing
  const host = req.headers.host || '';
  let tenantSlug = '';

  // Example: client.platform.com -> tenantSlug = client
  // For local development, we can use a header like 'x-tenant-slug'
  const xTenantSlug = req.headers['x-tenant-slug'];

  if (xTenantSlug && typeof xTenantSlug === 'string') {
    tenantSlug = xTenantSlug;
  } else if (host.includes('.')) {
    // Basic logic: treat first subdomain as slug
    tenantSlug = host.split('.')[0];
  }

  // 2. Default to 'public' for super-admin or public endpoints if no slug found
  // Note: Certain routes like /api/v1/super-admin should always use 'public'
  if (req.path.startsWith('/api/v1/super-admin') || req.path.startsWith('/api/v1/system/health')) {
    tenantSlug = 'public';
  }

  if (!tenantSlug && !req.path.startsWith('/api/v1/auth/')) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'Missing x-tenant-slug header or tenant subdomain' } 
    });
  }

  // 3. Run the remainder of the request within the tenant context
  tenantLocalStorage.run({ tenantSlug }, () => {
    next();
  });
}
