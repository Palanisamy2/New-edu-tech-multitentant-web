import { Response, Router } from 'express';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../../core/middleware/auth.middleware';
import { TrainerService } from './trainer.service';

export const trainerRouter = Router();

// List assigned batches for the logged-in trainer
trainerRouter.get('/batches', authMiddleware, requireRole(['trainer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await TrainerService.getAssignedBatches(req.user?.userId as string);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch 24-hour live class schedule
trainerRouter.get('/daily-schedule', authMiddleware, requireRole(['trainer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schedule = await TrainerService.getDailySchedule(req.user?.userId as string);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Activate "Join" button for students manually
trainerRouter.post('/lessons/:id/start-live', authMiddleware, requireRole(['trainer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await TrainerService.activateSession(req.params.id as string, req.user?.userId as string);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk mark attendance for a lesson
trainerRouter.post('/lessons/:id/attendance', authMiddleware, requireRole(['trainer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { attendanceData } = req.body; 
    const result = await TrainerService.markAttendance(
      req.params.id as string, 
      req.user?.userId as string, 
      attendanceData
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
