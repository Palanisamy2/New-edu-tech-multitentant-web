import { Request, Response, Router } from 'express';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../../core/middleware/auth.middleware';
import { getDb } from '@genyuga/database';

export const systemRouter = Router();

/**
 * Dashboard Stats
 */
systemRouter.get('/dashboard-stats', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    
    const [studentCount] = await db('users').where('role', 'student').count('id as count');
    const [batchCount] = await db('batches').count('id as count');
    
    // In a real app, revenue would be summed from enrollments
    // For now, let's just get a count of successful enrollments
    const [enrollmentCount] = await db('enrollments').where('fee_status', 'paid').count('id as count');

    res.json({
      students: Number(studentCount?.count || 0),
      batches: Number(batchCount?.count || 0),
      revenue: Number(enrollmentCount?.count || 0) * 500, // Mock revenue logic
      upcomingClasses: 12 // Still mock for now
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Branding & Custom Domain
systemRouter.patch('/branding', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
  const { themeTokens } = req.body;
  // Real implement: UPDATE client_slug.layout_config SET theme_tokens = themeTokens
  console.log('🎨 [Branding] Theme updated:', themeTokens);
  res.json({ message: 'Branding updated successfully', themeTokens });
});

systemRouter.post('/custom-domain', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain || !domain.includes('.')) return res.status(400).json({ error: 'Invalid domain format' });
  
  console.log(`🌐 [Domain] Provisioning requested for: ${domain}`);
  // await kafkaProducer.sendEvent('DOMAIN_PROVISION_REQUESTED', { domain, tenantSlug: 'current' });

  res.json({ 
    message: 'Domain provisioning started', 
    domain, 
    status: 'verifying',
    dnsRecords: [
      { type: 'CNAME', host: 'learn', value: 'proxy.genyuga.io' }
    ]
  });
});

/**
 * Health Check
 */
systemRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * Get Audit Logs (Admin only)
 */
systemRouter.get('/audit-logs', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const db = getDb();
    
    const logs = await db('tenant_audit_log')
      .join('users', 'tenant_audit_log.user_id', 'users.id')
      .select(
        'tenant_audit_log.*',
        'users.name as user_name',
        'users.email as user_email'
      )
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);

    const countResult = await db('tenant_audit_log').count('id as cnt').first();
    const total = Number(countResult?.cnt || 0);

    res.json({
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Tenant Settings
 */
systemRouter.get('/settings', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const settings = await db('tenants').where({ slug: req.headers['x-tenant-slug'] }).first();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
