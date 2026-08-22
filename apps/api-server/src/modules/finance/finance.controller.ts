import { Request, Response, Router } from 'express';
import { FinanceService } from './finance.service';
import { authMiddleware, AuthenticatedRequest } from '../../core/middleware/auth.middleware';
import { getDb } from '@genyuga/database';

export const financeRouter = Router();

// Student: Enroll in a course
financeRouter.post('/enroll', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { courseId } = req.body;
  const userId = req.user?.userId;

  if (!userId) return res.status(401).json({ error: 'User not found' });

  try {
    const enrollment = await FinanceService.enrollStudent(userId, courseId);
    res.status(201).json(enrollment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Log a cash payment
financeRouter.post('/cash-payment', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { enrollmentId, amount } = req.body;
  const adminId = req.user?.userId;

  // RBAC: Only admin can log cash
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only admins can log cash payments' });
  }

  if (!adminId) return res.status(401).json({ error: 'Admin identity lost' });

  try {
    const result = await FinanceService.logCashPayment(enrollmentId, amount, adminId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

financeRouter.get('/analytics', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const data = await FinanceService.getExecutiveDashboard();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

financeRouter.get('/dues', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const data = await FinanceService.getOutstandingDues();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

financeRouter.get('/export/csv', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const data = await FinanceService.exportLedgerData();
    if (!data.length) return res.send("Date,Receipt,Student,Course,Amount,Mode,Gateway,Status\n");
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row: any) => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger_export.csv');
    res.send(headers + '\n' + rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
