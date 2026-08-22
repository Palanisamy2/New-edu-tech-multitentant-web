import { getDb } from '@genyuga/database';
import { getTenantSlug } from '@genyuga/shared-context';
import { kafkaProducer } from '../../core/kafka/producer.service';

export class FinanceService {
  /**
   * Enroll a student in a course and initialize the ledger.
   */
  static async enrollStudent(studentId: string, courseId: string, adminId?: string) {
    const db = getDb();
    
    // Get course price
    const course = await db('courses').where({ id: courseId }).first();
    if (!course) throw new Error('Course not found');

    const [enrollment] = await db('enrollments').insert({
      student_id: studentId,
      course_id: courseId,
      total_fee: course.price,
      paid_amount: 0,
      fee_status: 'unpaid',
      access_status: 'active'
    }).returning('*');

    // Log to tenant audit log if we have an adminId
    if (adminId) {
      await db('tenant_audit_log').insert({
        user_id: adminId,
        action_type: 'STUDENT_ENROLLED',
        entity_id: enrollment.id,
        details: `Student ${studentId} enrolled in ${course.title}. Total fee: ${course.price}`
      });
    }

    // 4. Trigger Notification via Kafka
    await kafkaProducer.sendEvent('SEND_NOTIFICATION', {
      type: 'COURSE_ENROLLED',
      userId: studentId,
      tenantSlug: getTenantSlug(), // Use the dynamic slug from context
      data: {
        studentName: 'Student Name', // Mocked lookup
        course: 'Physics 101' // Mocked lookup
      }
    });

    return enrollment;
  }

  /**
   * Log a cash payment (Admin function).
   */
  static async logCashPayment(enrollmentId: string, amount: number, adminId: string) {
    const db = getDb();

    const enrollment = await db('enrollments').where({ id: enrollmentId }).first();
    if (!enrollment) throw new Error('Enrollment not found');

    return await db.transaction(async (trx) => {
      // 1. Generate sequential receipt number
      // Logic: Count all existing payments for this tenant and increment
      const count = await trx('payments').count('id as cnt').first();
      const receiptNo = `REC-${String(Number(count?.cnt || 0) + 1).padStart(6, '0')}`;

      // 2. Create payment record
      const [payment] = await trx('payments').insert({
        enrollment_id: enrollmentId,
        student_id: enrollment.student_id,
        receipt_number: receiptNo,
        amount,
        payment_mode: 'cash',
        status: 'success',
        collected_by: adminId
      }).returning('*');

      // 3. Update enrollment ledger
      const newPaidAmount = Number(enrollment.paid_amount) + Number(amount);
      const newStatus = newPaidAmount >= enrollment.total_fee ? 'paid' : 'partial';

      await trx('enrollments').where({ id: enrollmentId }).update({
        paid_amount: newPaidAmount,
        fee_status: newStatus
      });

      // 4. Log to tenant audit log
      await trx('tenant_audit_log').insert({
        user_id: adminId,
        action_type: 'CASH_COLLECTED',
        entity_id: payment.id,
        details: `Collected cash installment of ${amount} for enrollment ${enrollmentId}. Receipt: ${receiptNo}`
      });

      return { payment, newPaidAmount, receiptNo };
    });
  }

  /**
   * Confirm an online payment (Razorpay/Stripe Webhook).
   */
  static async confirmOnlinePayment(enrollmentId: string, amount: number, transactionId: string, gateway: 'razorpay' | 'stripe') {
    const db = getDb();

    const enrollment = await db('enrollments').where({ id: enrollmentId }).first();
    if (!enrollment) throw new Error('Enrollment not found');

    return await db.transaction(async (trx) => {
      // 1. Generate sequential receipt number
      const count = await trx('payments').count('id as cnt').first();
      const receiptNo = `REC-${String(Number(count?.cnt || 0) + 1).padStart(6, '0')}`;

      // 2. Create success payment record
      const [payment] = await trx('payments').insert({
        enrollment_id: enrollmentId,
        student_id: enrollment.student_id,
        receipt_number: receiptNo,
        amount,
        payment_mode: 'online',
        gateway,
        status: 'success'
      }).returning('*');

      // 3. Update enrollment ledger
      const newPaidAmount = Number(enrollment.paid_amount) + Number(amount);
      const newStatus = newPaidAmount >= enrollment.total_fee ? 'paid' : 'partial';

      await trx('enrollments').where({ id: enrollmentId }).update({
        paid_amount: newPaidAmount,
        fee_status: newStatus
      });

      return { payment, newPaidAmount, receiptNo };
    });
  }
  /**
   * Get executive dashboard metrics.
   */
  static async getExecutiveDashboard() {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Total Revenue (Lifetime)
    const totalRevenue = await db('payments')
      .where({ status: 'success' })
      .sum('amount as total')
      .first();

    // Monthly Revenue
    const monthlyRevenue = await db('payments')
      .where({ status: 'success' })
      .where('created_at', '>=', startOfMonth)
      .sum('amount as total')
      .first();

    // Revenue by Mode
    const modeDistribution = await db('payments')
      .where({ status: 'success' })
      .select('payment_mode')
      .sum('amount as total')
      .groupBy('payment_mode');

    // Total Outstanding Dues
    const totalDues = await db('enrollments')
      .select(db.raw('SUM(total_fee - paid_amount) as total'))
      .first();

    return {
      totalRevenue: Number(totalRevenue?.total || 0),
      monthlyRevenue: Number(monthlyRevenue?.total || 0),
      totalDues: Number(totalDues?.total || 0),
      modeDistribution: modeDistribution.map(m => ({
        mode: m.payment_mode,
        amount: Number(m.total)
      }))
    };
  }

  /**
   * Get list of students with outstanding dues.
   */
  static async getOutstandingDues() {
    const db = getDb();

    const dues = await db('enrollments')
      .join('users', 'enrollments.student_id', 'users.id')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .whereRaw('paid_amount < total_fee')
      .select(
        'enrollments.id',
        'users.name as student_name',
        'users.email',
        'courses.title as course_title',
        'enrollments.total_fee',
        'enrollments.paid_amount',
        db.raw('(total_fee - paid_amount) as balance_due'),
        'enrollments.created_at as enrollment_date'
      )
      .orderBy('balance_due', 'desc');

    return dues;
  }

  /**
   * Export Ledger Data (Flattened structure).
   */
  static async exportLedgerData() {
    const db = getDb();

    const ledger = await db('payments')
      .join('enrollments', 'payments.enrollment_id', 'enrollments.id')
      .join('users', 'payments.student_id', 'users.id')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .select(
        'payments.created_at',
        'payments.receipt_number',
        'users.name as student_name',
        'courses.title as course',
        'payments.amount',
        'payments.payment_mode',
        'payments.gateway',
        'payments.status'
      )
      .orderBy('payments.created_at', 'desc');

    return ledger;
  }
}
