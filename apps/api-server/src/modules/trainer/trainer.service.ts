import { getDb } from '@genyuga/database';

export class TrainerService {
  /**
   * List batches assigned to a trainer.
   */
  static async getAssignedBatches(trainerId: string) {
    const db = getDb();
    return await db('batches')
      .where({ trainer_id: trainerId })
      .select('*');
  }

  /**
   * Get 24-hour schedule for a trainer.
   */
  static async getDailySchedule(trainerId: string) {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await db('lessons')
      .join('batches', 'lessons.batch_id', 'batches.id')
      .join('courses', 'batches.course_id', 'courses.id')
      .where('batches.trainer_id', trainerId)
      .whereBetween('lessons.scheduled_at', [startOfDay.toISOString(), endOfDay.toISOString()])
      .select(
        'lessons.*',
        'courses.title as course_title',
        'batches.title as batch_title'
      );
  }

  /**
   * Manually activate a live session.
   */
  static async activateSession(lessonId: string, trainerId: string) {
    const db = getDb();
    
    // Verify trainer ownership through batch
    const lesson = await db('lessons')
      .join('batches', 'lessons.batch_id', 'batches.id')
      .where({ 'lessons.id': lessonId, 'batches.trainer_id': trainerId })
      .first();

    if (!lesson) throw new Error('Lesson not found or unauthorized');

    await db('lessons').where({ id: lessonId }).update({
      status: 'live',
      started_at: new Date().toISOString()
    });

    return { status: 'live', lessonId };
  }

  /**
   * Mark attendance for multiple students at once.
   */
  static async markAttendance(lessonId: string, trainerId: string, attendanceData: { studentId: string, wasPresent: boolean }[]) {
    const db = getDb();
    
    // Verify trainer ownership
    const lesson = await db('lessons')
      .join('batches', 'lessons.batch_id', 'batches.id')
      .where({ 'lessons.id': lessonId, 'batches.trainer_id': trainerId })
      .first();

    if (!lesson) throw new Error('Lesson not found or unauthorized');

    // Upsert attendance records in student_progress
    const queries = attendanceData.map(record => {
      const { studentId, wasPresent } = record;
      return db('student_progress')
        .insert({
          student_id: studentId,
          lesson_id: lessonId,
          attended: wasPresent,
          attended_at: wasPresent ? new Date().toISOString() : null,
          metadata: JSON.stringify({ markedBy: trainerId })
        })
        .onConflict(['student_id', 'lesson_id'])
        .merge(['attended', 'attended_at', 'metadata']);
    });

    await Promise.all(queries);
    return { success: true, count: attendanceData.length };
  }
}
