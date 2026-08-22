# 📘 GenYuga EduTech Multi-Tenant SaaS Platform – Master Technical Specification
**Version:** 2.6 (Final Unified Architecture)
**Status:** Stable / Ready for Development
**Architecture Focus:** Multi-Tenant / Multi-Schema (MTD), Hybrid Payments, Live-First Delivery, Event-Driven (Kafka), High Auditability.

---

## 1. Executive Summary & Core Architecture

This platform is a white-labeled SaaS designed for educational institutes, coaching centers, and individual creators. It models real-world academy operations by relying on **synchronous live classes** (Zoom/Meet) and supporting a **hybrid fee collection ledger** (mixed online and in-hand cash installments).

### 1.1 Multi-Tenant / Multi-Schema (MTD) Approach
The platform uses a **Schema-Per-Tenant** model in PostgreSQL to ensure absolute data isolation.
* **The `public` schema:** Holds SaaS-level data (client configurations, SaaS subscription plans, global audit logs).
* **The `client_slug_*` schemas:** When an institute subscribes, a dedicated schema is instantly provisioned. All their students, courses, and financial records live exclusively in this silo.
* **Benefits:** Prevents cross-tenant data leaks, simplifies client-specific database backups, and allows for bespoke table modifications for enterprise clients without affecting the core platform.

### 1.2 Routing & Connection Pooling
API requests (e.g., `api.clientdomain.com/users`) are intercepted by middleware. The `Host` header dictates the `tenant_slug` (cached in Redis), instructing the database connection pooler to scope all ORM queries strictly to that specific schema.

---

## 2. Feature Specifications by Role

The system is divided into four distinct portals, each with dedicated dashboards, historical ledgers, and functional capabilities.

### 2.1 The Super Admin Panel (Platform Owner)
The central command for the SaaS operator.
* **Tenant Provisioning:** Instantly create new client workspaces (triggers schema creation and default UI cloning).
* **SaaS Billing Engine:** Manage the subscription plans that clients pay to use the platform. Capable of auto-suspending tenant schemas if SaaS payments default.
* **Template Engine:** Manage JSON-based UI blocks. Push layout updates and default themes directly to clients' `layout_config` tables.
* **Platform Analytics:** Monitor aggregate API usage, S3 storage consumption, and system health.
* **Super Admin Profile & Audit Log:** A read-only ledger tracking every action taken by the SaaS staff (e.g., "Updated Pricing Plan", "Suspended Tenant X") stored in `public.audit_log`.

### 2.2 The Client Admin Panel (Institute Management)
The control center for the institute owner and front-desk staff.
* **Course & Batch Engine:** Create courses, bundle them into live Batches, and assign Trainers.
* **Hybrid Fee Collection Dashboard:** A financial CRM. View student balances, set installment deadlines, and log "In-Hand Cash" payments to instantly update the ledger.
* **Live Class Management:** Schedule classes by pasting Zoom/Meet links and passcodes.
* **Platform Customization:** Theme token editing, custom domain management, and automatic SSL provisioning.
* **Admin Profile & Tenant Audit Log:** A strict security ledger (`tenant_audit_log`). Tracks exactly which staff member collected cash, created a course, or deleted a record to prevent internal fraud.

### 2.3 The Trainer Panel (Educators)
A focused dashboard for educators, isolated from financial/administrative tools.
* **Live Class Launcher:** View the daily schedule. A "Start Class" button activates 15 minutes before the scheduled time.
* **Content & Evaluation:** Upload supplementary PDFs, grade assignments, and provide written feedback on exams.
* **Trainer Profile & Work History:** A digital resume. Trainers can update their bio/avatar. The system tracks "Lifetime Teaching Hours," past batches, and student attendance.

### 2.4 The Student Portal (Learners)
The end-user experience, optimized for mobile and desktop.
* **Live Class Hub:** Displays countdowns to upcoming live classes. Zoom/Meet passcodes are hidden until 15 minutes prior to the start time to prevent unauthorized link sharing.
* **Learning Record:** Tracks completed modules, displays exam scores, and holds downloadable PDF certificates upon course completion.
* **Partial Payment Gateway:** Students can view outstanding balances and make partial online payments via Razorpay/Stripe.
* **Digital Receipt Vault:** A history of every payment made (both online and cash logged by the admin), complete with sequential receipt numbers for tax compliance.

---

## 3. Core Workflows

### 3.1 The Hybrid Payment & Ledger Architecture
The platform treats course enrollments as a **Financial Ledger**, supporting infinite combinations of payment methods.

1. **The Contract (`enrollments` table):** When a student joins a course, a ledger is created. (e.g., `total_fee`: ₹20,000 | `paid_amount`: ₹0 | `fee_status`: unpaid).
2. **Online Booking Transaction:** Student pays ₹5,000 online via the gateway.
   * Row added to `payments` (`mode: online`, `amount: 5000`).
   * Ledger updates: `paid_amount` = ₹5,000, `fee_status` = `partial`.
3. **Cash Installment Transaction:** Student pays ₹10,000 cash at the front desk.
   * Admin logs the payment. Row added to `payments` (`mode: cash`, `amount: 10000`, `collected_by: Admin_ID`).
   * Ledger updates: `paid_amount` = ₹15,000.
4. **Automated Reminders:** Admin sets `next_due_date` for the final ₹5,000. A background job emails the student a payment link when the deadline approaches.

### 3.2 Event-Driven Background Jobs (Kafka)
Kafka decouples heavy tasks from the main API server.
* `tenant.provision`: Triggers SQL schema creation, UI cloning, and S3 folder generation upon new client signup.
* `cron.payment_deadlines`: A daily worker scanning `enrollments` for approaching `next_due_date` values, pushing events to `send.email` and `notification.push`.
* `domain.provision`: Requests Let’s Encrypt SSL certificates (ACME) when a client adds a custom domain.
* `audit.log`: Captures state-changing API requests and asynchronously inserts them into `tenant_audit_log`.

---

## 4. Complete Database Schema Dictionary

### 4.1 PUBLIC SCHEMA (Platform Level)

**public.clients** (The SaaS Tenants)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `slug` | text | Unique identifier, used as schema name |
| `org_name` | text | |
| `admin_email` | text | |
| `plan_id` | UUID | FK -> subscription_plans |
| `saas_customer_id` | text | Stripe Customer ID for platform billing |
| `saas_sub_status` | text | active/past_due/canceled |
| `student_limit` | int | |
| `custom_domain` | text | e.g., learn.academy.com |
| `domain_status` | text | pending/active/error |
| `created_at` | timestamp | |

**public.subscription_plans**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `name` | text | e.g., Basic, Pro, Enterprise |
| `monthly_price` | numeric | |
| `features_json` | JSONB | Feature toggles |

**public.audit_log** (Super Admin Tracker)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | Super Admin ID |
| `tenant_slug` | text | Nullable |
| `action` | text | e.g., PLAN_UPDATED |
| `details` | JSONB | |
| `created_at` | timestamp | |

### 4.2 TENANT SCHEMA (`client_slug.*`)

**users** (Unified Auth & Profiles)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `role` | text | admin/trainer/student |
| `name` | text | |
| `email` | text | Unique within schema |
| `phone` | text | |
| `password_hash` | text | |
| `avatar_url` | text | S3 path |
| `bio` | text | Profile description |

**tenant_audit_log** (Institute Staff Tracker)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK -> users(id) [Admin] |
| `action_type` | text | e.g., CASH_COLLECTED |
| `entity_id` | UUID | Affected record ID |
| `details` | text | Human-readable UI summary |
| `created_at` | timestamp | |

**gateway_settings** (Independent Merchant)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `gateway_name` | text | razorpay/stripe |
| `api_key` | text | Public Key |
| `api_secret` | text | Application-level Encrypted (AES-256) |
| `is_active` | boolean | |

**courses**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `title` | text | |
| `price` | numeric | |
| `status` | text | draft/published |

**course_modules**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `course_id` | UUID | FK -> courses(id) |
| `title` | text | |
| `drip_days` | int | Unlock delay |

**lessons** (Live-First Delivery)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `module_id` | UUID | FK -> course_modules(id) |
| `title` | text | |
| `type` | text | live_zoom/live_meet/pdf/text |
| `content_url` | text | S3 path or Meeting Link |
| `meeting_data` | JSONB | { "meeting_id": "", "passcode": "" } |
| `scheduled_at` | timestamp | Determines "Join" button activation |

**lesson_progress**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `student_id` | UUID | FK -> users(id) |
| `lesson_id` | UUID | FK -> lessons(id) |
| `attended_live` | boolean | Tracks live join clicks |
| `is_completed` | boolean | |

**batches** (Cohort Grouping)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `name` | text | |
| `course_id` | UUID | FK -> courses(id) |
| `trainer_id` | UUID | FK -> users(id) [trainer] |
| `status` | text | upcoming/active/completed |
| `schedule_json` | JSONB | Class timings |

**batch_students**
| Column | Type | Notes |
| :--- | :--- | :--- |
| `batch_id` | UUID | FK -> batches(id) |
| `student_id` | UUID | FK -> users(id) |

**enrollments** (The Financial Ledger & Academic Record)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `student_id` | UUID | FK -> users(id) |
| `course_id` | UUID | FK -> courses(id) |
| `total_fee` | numeric | Final agreed price |
| `paid_amount` | numeric | Sum of all payments |
| `fee_status` | text | unpaid/partial/paid |
| `next_due_date` | timestamp | Deadline for Kafka reminder |
| `access_status` | text | active/suspended/expired |
| `completed_at` | timestamp | Triggers Certificate Generation |

**payments** (The Transaction History)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `enrollment_id` | UUID | FK -> enrollments(id) |
| `student_id` | UUID | FK -> users(id) |
| `receipt_number` | text | Sequential ID (e.g., REC-001) |
| `amount` | numeric | Transaction value |
| `payment_mode` | text | online/cash |
| `gateway` | text | razorpay/stripe/none |
| `status` | text | success/failed/pending |
| `collected_by` | UUID | FK -> users(id) (Admin who logged cash) |
| `created_at` | timestamp | |

**layout_config** (UI Builder)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `pages_json` | JSONB | Drag-and-drop block data |
| `theme_tokens` | JSONB | Typography and brand colors |

---

## 5. Security & Compliance Model
* **Cash Auditing:** Any payment logged as `payment_mode = cash` explicitly requires the ID of the logged-in Admin (`collected_by`). This dual-writes to the `tenant_audit_log` for perfect traceability, mitigating internal financial discrepancies.
* **Tenant Isolation:** Client JWTs contain the `tenant_slug`. Middleware inherently blocks requests attempting to access mismatched schemas.
* **Meeting Security:** Live class passcodes are obfuscated by the API until exactly 15 minutes before the `scheduled_at` timestamp.
* **Data Encryption:** Payment gateway API secrets are never stored in plain text; they are AES-256 encrypted at the application level prior to database insertion.

Here is the ultimate, fully unified Master Engineering Blueprint. It combines the architecture, features, workflows, database schema, monorepo file structure, and the complete API inventory into a single, cohesive document.

You can copy this entire block directly into your team's engineering wiki or documentation repository.

-----

````markdown
# 📘 GenYuga EduTech Multi-Tenant SaaS Platform – Master Engineering Blueprint
**Version:** 2.6 (Final Unified Architecture)
**Status:** Stable / Ready for Development
**Architecture Focus:** Multi-Tenant / Multi-Schema (MTD), Hybrid Payments, Live-First Delivery, Event-Driven (Kafka), High Auditability.

---

## 1. Executive Summary & Core Architecture

This platform is a white-labeled SaaS designed for educational institutes, coaching centers, and individual creators. It models real-world academy operations by relying on **synchronous live classes** (Zoom/Meet) and supporting a **hybrid fee collection ledger** (mixed online and in-hand cash installments).

### 1.1 Multi-Tenant / Multi-Schema (MTD) Approach
The platform uses a **Schema-Per-Tenant** model in PostgreSQL to ensure absolute data isolation.
* **The `public` schema:** Holds SaaS-level data (client configurations, SaaS subscription plans, global audit logs).
* **The `client_slug_*` schemas:** When an institute subscribes, a dedicated schema is instantly provisioned. All their students, courses, and financial records live exclusively in this silo.
* **Benefits:** Prevents cross-tenant data leaks, simplifies client-specific database backups, and allows for bespoke table modifications for enterprise clients without affecting the core platform.

### 1.2 Routing & Connection Pooling
API requests (e.g., `api.clientdomain.com/users`) are intercepted by middleware. The `Host` header dictates the `tenant_slug` (cached in Redis), instructing the database connection pooler to scope all ORM queries strictly to that specific schema.

---

## 2. System File Structure (Monorepo)

To manage multiple frontend panels, a single backend API, and background Kafka workers efficiently, the platform utilizes a **Monorepo** approach (e.g., Turborepo or Nx).

### 2.1 Root Structure
```text
genyuga-platform/
├── apps/                           # Runnable applications
│   ├── api-server/                 # Single Node.js backend API
│   ├── kafka-worker/               # Independent process for async jobs
│   └── tenant-web/                 # Unified Frontend for Admins, Trainers, and Students
│
├── packages/                       # Shared libraries
│   ├── database/                   # ORM config, multi-tenant migrations
│   ├── event-schemas/              # Kafka topic definitions
│   └── shared-types/               # DTOs and TypeScript interfaces
````

### 2.2 Backend API (`apps/api-server`)

```text
apps/api-server/src/
├── config/                     # Env variables, Kafka/Redis connection setup
├── core/
│   ├── middleware/             # tenant-resolver.middleware.ts (CRUCIAL)
│   ├── security/               # JWT validation, RBAC
│   └── tenant-context/         # Schema scoping utilities
├── modules/                    # Domain-Driven Design Modules
│   ├── saas-billing/           
│   ├── users/                  
│   ├── courses/                
│   ├── live-classes/           
│   └── finance/                # Hybrid ledger logic
└── server.ts                   
```

### 2.3 Background Workers (`apps/kafka-worker`)

```text
apps/kafka-worker/src/
├── consumers/
│   ├── tenant-provisioner.ts   # Executes DB migrations for new clients
│   ├── notification-sender.ts  # Emails / SMS
│   └── audit-logger.ts         # Inserts to tenant_audit_log
└── cron-jobs/
    └── payment-deadlines.ts    # Daily reminder triggers
```

-----

## 3\. Feature Specifications by Role

### 3.1 The Super Admin Panel (Platform Owner)

  * **Tenant Provisioning:** Instantly create new client workspaces.
  * **SaaS Billing Engine:** Manage the subscription plans that clients pay to use the platform.
  * **Template Engine:** Push JSON-based layout updates directly to clients' `layout_config` tables.
  * **Super Admin Profile & Audit Log:** A read-only ledger tracking every action taken by the SaaS staff stored in `public.audit_log`.

### 3.2 The Client Admin Panel (Institute Management)

  * **Course & Batch Engine:** Create courses, bundle them into live Batches, and assign Trainers.
  * **Hybrid Fee Collection Dashboard:** View student balances, set installment deadlines, and log "In-Hand Cash" payments to instantly update the ledger.
  * **Live Class Management:** Schedule classes by pasting Zoom/Meet links and passcodes.
  * **Admin Profile & Tenant Audit Log:** A strict security ledger (`tenant_audit_log`). Tracks exactly which staff member collected cash, created a course, or deleted a record.

### 3.3 The Trainer Panel (Educators)

  * **Live Class Launcher:** A "Start Class" button activates 15 minutes before the scheduled time.
  * **Content & Evaluation:** Upload supplementary PDFs, grade assignments, and provide written feedback.
  * **Trainer Profile & Work History:** Tracks "Lifetime Teaching Hours," past batches, and student attendance.

### 3.4 The Student Portal (Learners)

  * **Live Class Hub:** Displays countdowns to upcoming live classes. Passcodes are hidden until 15 mins prior.
  * **Learning Record:** Tracks completed modules and holds downloadable PDF certificates.
  * **Partial Payment Gateway:** Students can view outstanding balances and make partial online payments.
  * **Digital Receipt Vault:** A history of every payment made (online and cash), with sequential receipt numbers.

-----

## 4\. Core Workflows (Payments & Background Jobs)

### 4.1 The Hybrid Payment & Ledger Architecture

The platform treats course enrollments as a **Financial Ledger**, supporting infinite combinations of payment methods.

1.  **The Contract (`enrollments` table):** Created when a student joins (`total_fee`: ₹20,000 | `paid_amount`: ₹0).
2.  **Online Booking:** Student pays ₹5,000 online. Ledger updates `paid_amount` = ₹5,000.
3.  **Cash Installment:** Student pays ₹10,000 cash. Admin logs it. Ledger updates `paid_amount` = ₹15,000.
4.  **Automated Reminders:** Kafka cron job emails the student a payment link when the `next_due_date` approaches.

### 4.2 Event-Driven Background Jobs (Kafka)

  * `tenant.provision`: Triggers SQL schema creation and S3 folder generation.
  * `cron.payment_deadlines`: Daily worker scanning `enrollments` for approaching deadlines.
  * `domain.provision`: Requests Let’s Encrypt SSL certificates (ACME).
  * `audit.log`: Asynchronously inserts state-changing API requests into `tenant_audit_log`.

-----

## 5\. RESTful API Inventory

*(Note: All endpoints below, except Super Admin, require middleware to route to the correct `client_slug_*` schema based on the request Host).*

### 5.1 Authentication & Identity (`/api/v1/auth`)

  * `POST /auth/login`: Authenticates user, returns JWT.
  * `GET /auth/profile`: Fetches logged-in user's profile (`avatar_url`, `bio`).
  * `PUT /auth/profile`: Updates profile data and work history.

### 5.2 Super Admin Panel (`/api/v1/super-admin`)

  * `POST /super-admin/tenants`: Provisions a new client (Triggers `tenant.provision`).
  * `PUT /super-admin/tenants/:id/status`: Suspends or activates a tenant schema.
  * `PUT /super-admin/plans/:id`: Updates SaaS pricing or features.
  * `GET /super-admin/audit-logs`: Fetches the global platform `public.audit_log`.

### 5.3 Client Admin Panel (`/api/v1/admin`)

  * `POST /admin/courses/:courseId/modules`: Adds a module.
  * `POST /admin/batches`: Creates a cohort and maps it to a `trainer_id`.
  * `GET /admin/enrollments`: Fetches the master fee ledger.
  * **`POST /admin/payments/cash`**: Logs an in-hand cash payment, binds it to the Admin's ID, updates the ledger.
  * `PUT /admin/enrollments/:id/reminders`: Sets the `next_due_date` for installments.
  * `PUT /admin/settings/gateway`: Updates unique Razorpay/Stripe AES-256 encrypted keys.
  * `GET /admin/audit-logs`: Fetches the `tenant_audit_log`.

### 5.4 Trainer Panel (`/api/v1/trainer`)

  * `GET /trainer/batches`: Lists assigned cohorts.
  * `GET /trainer/schedule`: Fetches upcoming `scheduled_at` timestamps for live classes.
  * **`POST /trainer/lessons/:id/start-live`**: Activates the "Join" button for students.
  * `POST /trainer/evaluations/:id/grade`: Submits marks and text feedback.

### 5.5 Student Portal (`/api/v1/student`)

  * `GET /student/dashboard`: Aggregated view of progress and upcoming live classes.
  * `GET /student/lessons/:id`: Fetches lesson content (Reveals Zoom passcode only if within 15 mins of start time).
  * **`POST /student/payments/initiate`**: Starts an online payment order for a partial/full amount.
  * `GET /student/receipts`: Returns PDF download links for sequential receipts.

### 5.6 System Webhooks (`/api/v1/webhooks`)

  * `POST /webhooks/stripe/platform`: Listens for SaaS subscription payments from Clients.
  * `POST /webhooks/payments/tenant`: Listens for Razorpay/Stripe student payments and automatically recalculates the `enrollments` ledger.

-----

## 6\. Complete Database Schema Dictionary

### 6.1 PUBLIC SCHEMA (Platform Level)

**public.clients** (The SaaS Tenants)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `slug` | text | Unique identifier, used as schema name |
| `plan_id` | UUID | FK -\> subscription\_plans |
| `saas_sub_status` | text | active/past\_due/canceled |
| `custom_domain` | text | e.g., https://www.google.com/search?q=learn.academy.com |

**public.audit\_log** (Super Admin Tracker)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | Super Admin ID |
| `action` | text | e.g., PLAN\_UPDATED |

### 6.2 TENANT SCHEMA (`client_slug.*`)

**users** (Unified Auth & Profiles)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `role` | text | admin/trainer/student |
| `avatar_url` | text | S3 path |
| `bio` | text | Profile description |

**tenant\_audit\_log** (Institute Staff Tracker)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK -\> users(id) [Admin] |
| `action_type` | text | e.g., CASH\_COLLECTED |

**gateway\_settings** (Independent Merchant)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `gateway_name` | text | razorpay/stripe |
| `api_secret` | text | Application-level Encrypted (AES-256) |

**lessons** (Live-First Delivery)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `type` | text | live\_zoom/live\_meet/pdf/text |
| `meeting_data` | JSONB | { "meeting\_id": "", "passcode": "" } |
| `scheduled_at` | timestamp | Determines "Join" button activation |

**enrollments** (The Financial Ledger & Academic Record)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `student_id` | UUID | FK -\> users(id) |
| `total_fee` | numeric | Final agreed price |
| `paid_amount` | numeric | Sum of all payments |
| `fee_status` | text | unpaid/partial/paid |
| `next_due_date` | timestamp | Deadline for Kafka reminder |
| `completed_at` | timestamp | Triggers Certificate Generation |

**payments** (The Transaction History)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `enrollment_id` | UUID | FK -\> enrollments(id) |
| `receipt_number` | text | Sequential ID (e.g., REC-001) |
| `amount` | numeric | Transaction value |
| `payment_mode` | text | online/cash |
| `collected_by` | UUID | FK -\> users(id) (Admin who logged cash) |

-----

## 7\. Security & Compliance Model

  * **Cash Auditing:** Any payment logged as `payment_mode = cash` explicitly requires the ID of the logged-in Admin (`collected_by`). This dual-writes to the `tenant_audit_log` for perfect traceability, mitigating internal financial discrepancies.
  * **Tenant Isolation:** Client JWTs contain the `tenant_slug`. Middleware inherently blocks requests attempting to access mismatched schemas.
  * **Meeting Security:** Live class passcodes are obfuscated by the API until exactly 15 minutes before the `scheduled_at` timestamp.
  * **Data Encryption:** Payment gateway API secrets are never stored in plain text; they are AES-256 encrypted at the application level prior to database insertion.

<!-- end list -->

```
```