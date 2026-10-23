# Edutech Platform & Super Admin Dashboard

Comprehensive EdTech platform featuring integrated portals for **Students**, **Teachers**, **Parents**, and a centralized **Super Admin Dashboard**.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Ensure your `.env` contains valid credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret>
MUX_TOKEN_ID=<your-mux-token-id>
MUX_TOKEN_SECRET=<your-mux-token-secret>
MUX_WEBHOOK_SECRET=<your-mux-webhook-secret>
```

### 3. Database Migration
To enable Super Admin Audit Logging, Parent-Student Explicit Linking, and Pricing Management, run the following SQL script in your Supabase SQL Editor:
- File: [`supabase/super_admin_schema.sql`](file:///c:/Users/user/Documents/Edutech/edutech/supabase/super_admin_schema.sql)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the public portal or [http://localhost:3000/admin](http://localhost:3000/admin) for the Super Admin portal.

---

## 🛡️ Super Admin Authentication & Provisioning

### Safe Administrator Provisioning
The platform implements strict Role-Based Access Control (RBAC). Administrator accounts cannot be created via public registration.

To provision or log in as a Super Admin:
1. Use the pre-seeded admin user:
   - **Email:** `admin@gmail.com`
   - **Portal URL:** [`/admin/login`](http://localhost:3000/admin/login)
2. To designate an existing authenticated user as an administrator directly in PostgreSQL:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your-admin-email@example.com';

   INSERT INTO public.admins (id, name, email)
   SELECT id, name, email FROM public.profiles WHERE email = 'your-admin-email@example.com'
   ON CONFLICT (id) DO NOTHING;
   ```
3. Route protection is enforced both in middleware (`src/lib/supabase/middleware.ts`) and on every `/api/admin/*` backend endpoint (`src/lib/admin-auth.ts`).

---

## 📊 Super Admin Dashboard Sections

| Section | Route | Description |
| :--- | :--- | :--- |
| **Overview** | `/admin` | Real-time platform KPI cards, registration trends, enrollment trajectory, and activity feed. |
| **Students** | `/admin/students` | Search, filter, inspect learning progress, view exam submissions, and toggle account suspension. |
| **Teachers** | `/admin/teachers` | Inspect educator channels, course enrollments, videos, and manage account statuses. |
| **Parents** | `/admin/parents` | Monitor parent profiles and linked student/child accounts while preserving the separate Parent Dashboard. |
| **Courses** | `/admin/courses` | Syllabus units, Mux video processing status (`ready`, `processing`, `errored`), and publication controls. |
| **Exams** | `/admin/exams` | Assessment structures, questions blueprint, participation volume, average scores, and publishing. |
| **Enrollments** | `/admin/enrollments` | Student course subscriptions, package types, and active dates. |
| **Analytics** | `/admin/analytics` | Acquisition velocity, student-to-teacher ratios, course publication rates, and role distributions. |
| **Website Activity** | `/admin/activity` | Unified live feed of registrations, course launches, enrollments, and quiz attempts. |
| **Pricing Management** | `/admin/pricing` | Set tuition and exam fees in minor units (paise) with price change audit logs. |
| **Payments (Coming Soon)**| `/admin/payments` | Architectural blueprint for Razorpay webhook verification and automated billing. |
| **Teacher Earnings (Coming Soon)**| `/admin/earnings` | Commission split formulation and net payable calculations. |
| **Withdrawals (Coming Soon)**| `/admin/withdrawals` | Payout approval and banking transfer workflows. |
| **Audit Logs** | `/admin/audit-logs` | Immutable audit trail of administrative interventions. |
| **Settings** | `/admin/settings` | Admin profile, cloud integration status, and migration guides. |

---

## 🧪 Testing & Verification

Run the automated test suite:
```bash
node tests/test_super_admin.js
```

Run TypeScript compilation check:
```bash
npx tsc --noEmit
```

Build for production:
```bash
npm run build
```
