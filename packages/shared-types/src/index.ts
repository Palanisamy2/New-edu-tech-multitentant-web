export type UserRole = 'admin' | 'trainer' | 'student' | 'super-admin';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  slug: string;
  org_name: string;
  admin_email: string;
  plan_id: string;
  saas_sub_status: 'active' | 'past_due' | 'canceled';
  student_limit: number;
  custom_domain?: string;
  domain_status: 'pending' | 'active' | 'error';
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  price: number;
  status: 'draft' | 'published';
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  total_fee: number;
  paid_amount: number;
  fee_status: 'unpaid' | 'partial' | 'paid';
  next_due_date?: string;
  access_status: 'active' | 'suspended' | 'expired';
}

export interface Payment {
  id: string;
  enrollment_id: string;
  student_id: string;
  receipt_number: string;
  amount: number;
  payment_mode: 'online' | 'cash';
  gateway: 'razorpay' | 'stripe' | 'none';
  status: 'success' | 'failed' | 'pending';
  collected_by?: string;
  created_at: string;
}
