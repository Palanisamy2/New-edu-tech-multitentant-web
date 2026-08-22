import { getDb } from '@genyuga/database';

export class LiveClassService {
  /**
   * Fetches lesson details. 
   * Obfuscates meeting passcodes if requested >15 mins before start time.
   */
  static async getLessonSecurely(lessonId: string) {
    const db = getDb();
    const lesson = await db('lessons').where({ id: lessonId }).first();

    if (!lesson) throw new Error('Lesson not found');

    // Only for live classes
    if (lesson.type === 'live_zoom' || lesson.type === 'live_meet') {
      const scheduledAt = new Date(lesson.scheduled_at).getTime();
      const now = Date.now();
      const fifteenMinutesInMillis = 15 * 60 * 1000;

      // If more than 15 mins away, hide the meeting data
      if (scheduledAt - now > fifteenMinutesInMillis) {
        return {
          ...lesson,
          meeting_data: { 
            message: "Meeting details will be available 15 minutes before the start time." 
          }
        };
      }
    }

    return lesson;
  }

  /**
   * Marks a student as attended for a specific session.
   */
  static async markAttendance(studentId: string, lessonId: string) {
    const db = getDb();
    
    // UPSERT into student_progress
    const existing = await db('student_progress').where({ student_id: studentId, lesson_id: lessonId }).first();

    if (existing) {
       await db('student_progress').where({ id: existing.id }).update({ attended: true });
    } else {
       await db('student_progress').insert({
         student_id: studentId,
         lesson_id: lessonId,
         attended: true,
         status: 'completed'
       });
    }

    return { status: 'marked' };
  }
}
