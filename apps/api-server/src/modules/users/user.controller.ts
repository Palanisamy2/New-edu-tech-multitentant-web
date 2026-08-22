import { Response, Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../core/middleware/auth.middleware';
import { getDb } from '@genyuga/database';

export const userRouter = Router();

// Get personal profile
userRouter.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const user = await db('users')
      .where({ id: req.user?.userId })
      .select('id', 'name', 'email', 'role', 'created_at')
      .first();

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile (Bio, etc)
userRouter.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  try {
    const db = getDb();
    await db('users')
      .where({ id: req.user?.userId })
      .update({ name });

    res.json({ success: true, message: 'Profile updated' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
