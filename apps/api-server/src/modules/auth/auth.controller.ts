import { Request, Response, Router } from 'express';
import { AuthService } from './auth.service';
import { getTenantSlug } from '@genyuga/shared-context';
import { validate } from '../../core/validation/validate.middleware';
import { loginSchema, googleLoginSchema } from '../../core/validation/schemas/auth.schema';
import { authMiddleware, AuthenticatedRequest } from '../../core/middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const tenantSlug = getTenantSlug();

  try {
    const result = await AuthService.loginLocal(email, password, tenantSlug);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const result = await AuthService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

authRouter.put('/password', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await AuthService.changePassword(userId, currentPassword, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const tenantSlug = getTenantSlug();

  if (!email) return res.status(400).json({ error: 'Email is required' });

  const result = await AuthService.forgotPassword(email, tenantSlug);
  res.json(result);
});

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const result = await AuthService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/google', validate(googleLoginSchema), async (req: Request, res: Response) => {
  const { googleId, email } = req.body;
  const tenantSlug = getTenantSlug();

  try {
    const result = await AuthService.loginGoogle(googleId, email, tenantSlug);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});
