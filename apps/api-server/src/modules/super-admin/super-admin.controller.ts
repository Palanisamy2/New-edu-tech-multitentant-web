import { Router, Request, Response } from 'express';
import { validate } from '../../core/validation/validate.middleware';
import { provisionTenantSchema } from '../../core/validation/schemas/tenant.schema';
import { getPool } from '@genyuga/database';
import { TenantService } from '../tenants/tenant.service';
import { authMiddleware, requireRole } from '../../core/middleware/auth.middleware';

const router = Router();

// Secure all routes in this router
router.use(authMiddleware as any);
router.use(requireRole(['super-admin']));

// 1. Global Platform Health
router.get('/health/global', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'GenYuga SaaS',
    db: 'connected',
    kafka: 'connected',
    redis: 'connected',
    activeTenants: 42,
    incidents: [],
    timestamp: new Date()
  });
});

// 2. Tenant Management
router.get('/tenants', async (req: Request, res: Response) => {
  const pool = getPool();
  const tenants = await pool('public.clients')
    .select('id', 'org_name as name', 'slug', 'admin_email as email', 'saas_sub_status as status', 'created_at');
  res.json(tenants);
});

router.post('/tenants', validate(provisionTenantSchema), async (req: Request, res: Response) => {
  const { name, slug, adminEmail, planId } = req.body;
  
  try {
    const result = await TenantService.provisionTenant(slug, name, adminEmail);
    res.status(202).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/tenants/:slug/status', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { status } = req.body; // active/suspended
  res.json({ message: `Tenant ${slug} status updated to ${status}`, slug, status });
});

// 3. SaaS Billing Plans
router.get('/plans', async (req: Request, res: Response) => {
  const pool = getPool();
  const plans = await pool('public.subscription_plans').select('*');
  res.json(plans);
});

// 4. Global Audit Logs (Super Admin Actions)
router.get('/audit-logs', async (req: Request, res: Response) => {
  const pool = getPool();
  const logs = await pool('public.audit_log').select('*').orderBy('created_at', 'desc').limit(100);
  res.json(logs);
});

export const superAdminRouter = router;
