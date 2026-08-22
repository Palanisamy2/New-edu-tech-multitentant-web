import { Response, Router } from 'express';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../../core/middleware/auth.middleware';
import { getDb } from '@genyuga/database';
import { StudentService } from './student.service';

export const studentRouter = Router();

// Student Dashboard: Aggregated view of enrollments and upcoming classes
studentRouter.get('/dashboard', authMiddleware, requireRole(['student']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await StudentService.getMyDashboard(req.user!.userId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Student Roster for a Batch (Used by Trainers)
studentRouter.get('/batch/:batchId', authMiddleware, requireRole(['trainer', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const students = await db('batch_students')
      .join('users', 'batch_students.student_id', 'users.id')
      .where({ 'batch_students.batch_id': req.params.batchId })
      .select('users.id', 'users.name', 'users.email', 'users.avatar_url');
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Secure Lesson Access: Enforces time-locked link reveal
studentRouter.get('/lessons/:id', authMiddleware, requireRole(['student', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lessonId = req.params.id as string;
    const lesson = await StudentService.getLessonDetails(lessonId, req.user!.userId);
    res.json(lesson);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});
