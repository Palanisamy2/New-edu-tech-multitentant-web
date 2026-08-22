import { getDb } from '@genyuga/database';

export class StudentService {
  /**
   * Get student dashboard data (enrollments + upcoming sessions)
   */
  static async getMyDashboard(studentId: string) {
    const db = getDb();

    // Fetch active enrollments with course details
    const enrollments = await db('enrollments')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .where({ 'enrollments.student_id': studentId, 'enrollments.access_status': 'active' })
      .select(
        'courses.id',
        'courses.title',
        'enrollments.paid_amount',
        'enrollments.total_fee',
        'enrollments.fee_status'
      );

    // Fetch upcoming sessions for all batches the student is part of
    const upcomingSessions = await db('lessons')
      .join('batch_students', 'lessons.batch_id', 'batch_students.batch_id')
      .join('batches', 'lessons.batch_id', 'batches.id')
      .where('batch_students.student_id', studentId)
      .where('lessons.scheduled_at', '>=', new Date().toISOString())
      .orderBy('lessons.scheduled_at', 'asc')
      .limit(5)
      .select(
        'lessons.id',
        'lessons.title',
        'lessons.scheduled_at',
        'lessons.status',
        'batches.name as batch_name'
      );

    return {
      enrollments,
      upcomingSessions
    };
  }

  /**
   * Get specific lesson details with link reveal logic
   */
  static async getLessonDetails(lessonId: string, studentId: string) {
    const db = getDb();

    // Verify student ownership (is in the batch)
    const lesson = await db('lessons')
      .join('batch_students', 'lessons.batch_id', 'batch_students.batch_id')
      .where({ 'lessons.id': lessonId, 'batch_students.student_id': studentId })
      .select('lessons.*')
      .first();

    if (!lesson) {
      throw new Error('Lesson not found or you are not enrolled in this batch.');
    }

    // Logic for meeting link reveal
    const now = new Date();
    const scheduledTime = new Date(lesson.scheduled_at);
    const timeDiffMinutes = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

    const isLive = lesson.status === 'live';
    const isStartingSoon = timeDiffMinutes <= 15 && timeDiffMinutes > -120; // 15 mins before to 2 hours after

    // Hide passcode/meeting link if not active/soon
    if (!isLive && !isStartingSoon) {
      return {
        ...lesson,
        meeting_data: { 
          message: 'Access opens 15 minutes before session starts or when trainer goes live.' 
        },
        content_url: null
      };
    }

    return lesson;
  }
}
