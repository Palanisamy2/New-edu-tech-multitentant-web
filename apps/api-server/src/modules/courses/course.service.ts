import { getDb } from '@genyuga/database';

export class CourseService {
  /**
   * Course & Module Management
   */
  static async createCourse(data: { title: string, price: number }) {
    const db = getDb();
    const [course] = await db('courses').insert({
      title: data.title,
      price: data.price,
      status: 'draft'
    }).returning('*');
    return course;
  }

  static async getCourses() {
    return getDb()('courses').select('*');
  }

  /**
   * Batch Management
   */
  static async createBatch(courseId: string, data: { 
    title: string, 
    trainerId: string, 
    startDate: string,
    schedule: string[] // ['Monday', 'Wednesday']
  }) {
    const db = getDb();
    
    return await db.transaction(async (trx) => {
      // 1. Create the Batch
      const [batch] = await trx('batches').insert({
        course_id: courseId,
        trainer_id: data.trainerId,
        title: data.title,
        start_date: data.startDate,
        schedule: JSON.stringify(data.schedule),
        status: 'upcoming'
      }).returning('*');

      // 2. Generate Lessons placeholder for the first 4 weeks
      const lessons: any[] = [];
      const start = new Date(data.startDate);

      let current = new Date(start);
      for (let i = 0; i < 8; i++) {
        lessons.push({
          batch_id: batch.id,
          title: `Session ${i + 1}`,
          type: 'live_zoom',
          scheduled_at: current.toISOString(),
          status: 'scheduled'
        });
        
        // Move forward: alternate between 2 days and 5 days to simulate twice a week
        const daysToAdd = (i % 2 === 0) ? 2 : 5;
        current.setDate(current.getDate() + daysToAdd);
      }

      await trx('lessons').insert(lessons);

      return batch;
    });
  }

  static async getBatchRoster(batchId: string) {
    const db = getDb();
    return db('enrollments')
      .join('users', 'enrollments.student_id', '=', 'users.id')
      .where({ 'enrollments.batch_id': batchId })
      .select('users.id', 'users.name', 'users.email', 'enrollments.fee_status');
  }
}
