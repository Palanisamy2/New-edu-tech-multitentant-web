import { Request, Response, Router } from 'express';
import { CourseService } from './course.service';
import { authMiddleware, AuthenticatedRequest } from '../../core/middleware/auth.middleware';

export const courseRouter = Router();

// Public/Student: List courses
courseRouter.get('/', async (req: Request, res: Response) => {
  try {
    const courses = await CourseService.getCourses();
    res.json(courses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create course
courseRouter.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const course = await CourseService.createCourse(req.body);
    res.status(201).json(course);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
