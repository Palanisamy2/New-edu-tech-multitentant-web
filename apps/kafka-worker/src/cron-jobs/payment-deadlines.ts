import { getPool } from '@genyuga/database';

export const runPaymentDeadlineCheck = async (producer: any) => {
  console.log('🕒 [CronJob] Starting payment deadline check across all tenants...');
  const pool = getPool();

  try {
    // 1. Get all active tenants from public schema
    const activeTenants = await pool('public.clients')
      .where('saas_sub_status', 'active')
      .select('slug');

    for (const { slug } of activeTenants) {
      try {
        console.log(`🔍 Checking dues for tenant: ${slug}`);
        
        // 2. Scan each tenant's enrollment table for overdue payments
        const overdueEnrollments = await pool('enrollments')
          .withSchema(slug)
          .join('users', 'enrollments.student_id', '=', 'users.id')
          .join('courses', 'enrollments.course_id', '=', 'courses.id')
          .where('enrollments.next_due_date', '<=', new Date())
          .andWhere('enrollments.fee_status', '!=', 'paid')
          .select(
            'users.id as userId',
            'users.name as studentName',
            'enrollments.pending_amount as amount',
            'courses.title as course'
          );

        for (const due of overdueEnrollments) {
          // 3. Publish notification event for each overdue student
          await producer.send({
            topic: 'SEND_NOTIFICATION',
            messages: [{
              value: JSON.stringify({
                type: 'PAYMENT_REMINDER',
                userId: due.userId,
                tenantSlug: slug,
                data: due
              })
            }]
          });
          console.log(`✅ Queued reminder for ${due.studentName} (${slug})`);
        }
      } catch (err) {
        console.error(`❌ Error scanning tenant ${slug}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error fetching tenants for cron job:', err);
  }

  console.log('🏁 [CronJob] Deadline check complete.');
};
