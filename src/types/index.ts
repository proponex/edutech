export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photo_url?: string | null;
  phone?: string | null;
  parent_phone?: string | null;
  class_id?: string | null;
  board_id?: string | null;
  preferred_language?: string | null;
  subjects?: string[] | null;
  student_id_code?: string | null;
  status?: 'active' | 'suspended' | null;
  created_at: string;
  updated_at: string;
}

export interface ClassItem {
  id: string;
  name: string;
  slug?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  storage_path: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

// ==============================================================================
// ACADEMIC REFERENCE TAXONOMY
// ==============================================================================

export interface BoardItem {
  id: string;
  name: string;
  code: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface ReferenceSubjectItem {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface UnitItem {
  id: string;
  channel_id?: string;
  teacher_id?: string;
  class_id: string;
  board_id: string;
  subject_name: string;
  unit_number: number | null;
  title: string;
  description: string | null;
  display_order: number;
  created_at?: string;
  topics?: TopicItem[];
  videos_count?: number;
  quizzes_count?: number;
  homework_count?: number;
}

export interface TopicItem {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  sub_topics?: SubTopicItem[];
}

export interface SubTopicItem {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  display_order: number;
  created_at?: string;
}

// Backward compatibility with Phase 3 components
export interface SubjectItem {
  id: string;
  class_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  class?: ClassItem;
  units_count?: number;
}

export interface SyllabusUnitItem {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  unit_number: number | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  topics?: TopicItem[];
}

// ==============================================================================
// TEACHER CHANNELS
// ==============================================================================

export interface ChannelItem {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  photo_url: string | null;
  class_id?: string;
  class?: ClassItem;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Populated relations
  classes?: ClassItem[];
  boards?: BoardItem[];
  specializations?: string[];
  languages?: string[];
  content_counts?: {
    videos: number;
    quizzes: number;
    homework: number;
  };
  subscribers_count?: number;
  rating?: number;
  review_count?: number;
}

// ==============================================================================
// CONTENT CREATION ENTITIES
// ==============================================================================

export type ContentScope = 'unit' | 'topic' | 'sub_topic';

export interface VideoContentItem {
  id: string;
  channel_id: string;
  class_id: string;
  board_id: string;
  subject_name: string;
  unit_id: string | null;
  topic_id: string | null;
  sub_topic_id: string | null;
  scope: ContentScope;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  is_demo: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Mux video fields
  mux_upload_id?: string | null;
  mux_asset_id?: string | null;
  mux_playback_id?: string | null;
  mux_duration?: number | null;
  mux_status?: 'waiting' | 'pending' | 'uploading' | 'processing' | 'ready' | 'errored' | null;
  mux_error_message?: string | null;
  // Populated
  unit?: UnitItem;
  topic?: TopicItem;
  sub_topic?: SubTopicItem;
}


export interface QuizOptionItem {
  id?: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface QuizQuestionItem {
  id?: string;
  quiz_id?: string;
  question_text: string;
  marks: number;
  display_order: number;
  options: QuizOptionItem[];
}

export interface QuizItem {
  id: string;
  channel_id: string;
  class_id: string;
  board_id: string;
  subject_name: string;
  unit_id: string | null;
  topic_id: string | null;
  sub_topic_id: string | null;
  scope: ContentScope;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  total_marks: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestionItem[];
}

export interface HomeworkItem {
  id: string;
  channel_id: string;
  class_id: string;
  board_id: string;
  subject_name: string;
  unit_id: string | null;
  topic_id: string | null;
  sub_topic_id: string | null;
  scope: ContentScope;
  title: string;
  instructions: string;
  tasks: string | null;
  marks: number | null;
  due_date: string | null;
  attachment_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// STUDENT ACADEMIC PROFILE & SUBSCRIPTIONS
// ==============================================================================

export interface StudentAcademicProfile {
  id: string;
  student_id: string;
  academic_year: string;
  class_id: string;
  board_id: string;
  subject: string;
  subjects?: string[];
  preferred_language: string;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
  class?: ClassItem;
  board?: BoardItem;
}

export type SubscriptionPackageType = 'entire_channel' | 'particular_class' | 'class_subject';

export interface ChannelSubscription {
  id: string;
  student_id: string;
  channel_id: string;
  package_type: SubscriptionPackageType;
  class_id?: string | null;
  subject_name?: string | null;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

export interface ChannelReview {
  id: string;
  channel_id: string;
  student_id: string;
  student_name?: string;
  student_photo_url?: string | null;
  rating: number;
  review_text: string;
  created_at: string;
}

// ==============================================================================
// PHASE 5.1: CONTENT PROGRESS & TEACHER MESSAGES
// ==============================================================================

export type ContentProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface StudentContentProgress {
  id: string;
  student_id: string;
  channel_id: string;
  content_type: 'video' | 'quiz' | 'homework';
  content_id: string;
  status: ContentProgressStatus;
  score?: number | null;
  watched_seconds?: number | null;
  progress_percent?: number | null;
  updated_at: string;
}

export type TeacherMessageStatus = 'pending' | 'completed';

export interface TeacherMessage {
  id: string;
  teacher_id: string;
  channel_id: string;
  student_id?: string | null;
  title: string;
  content: string;
  action_type?: string;
  status: TeacherMessageStatus;
  completed_at?: string | null;
  created_at: string;
}

export interface TeacherDashboardStats {
  totalVideos: number;
  totalStudents: number;
  averageRating: number;
  thisMonthPayment: number;
  // Phase 5.3 Live-Stat Cards
  totalEnrolled: number;
  unitsCount: number;
  videosCount: number;
  contentPublished: number;
  monthlyRating: number;
  monthlyReviewCount?: number;
}

export interface StudentRecentLearning {
  channelId: string;
  channelName: string;
  channelDescription?: string;
  channelPhotoUrl?: string | null;
  className?: string;
  subjectName?: string;
  teacherName: string;
  teacherPhotoUrl?: string | null;
  teacherEmail?: string;
  overallPercentage: number;
  totalItems: number;
  completedItems: number;
}

export interface SubscribedSubjectProgress {
  channelId: string;
  channelName: string;
  subjectName: string;
  percentage: number;
  totalItems: number;
  completedItems: number;
}

export interface ProgressItemDetail {
  id: string;
  title: string;
  type: 'video' | 'quiz' | 'homework';
  subject?: string;
}

export interface StudentLearningProgress {
  totalItems: number;
  completedCount: number;
  inProgressCount: number;
  remainingCount: number;
  percentage: number;
  completedItems: ProgressItemDetail[];
  inProgressItems: ProgressItemDetail[];
  remainingItems: ProgressItemDetail[];
}

export interface ChannelStudentInfo {
  studentId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  parentPhone?: string | null;
  className?: string | null;
  boardName?: string | null;
  subjects?: string[] | null;
  photoUrl?: string | null;
  enrolledAt: string;
  packageType: SubscriptionPackageType;
  progress: StudentLearningProgress;
  messages: TeacherMessage[];
}

// ==============================================================================
// SUPER ADMIN DASHBOARD TYPES
// ==============================================================================

export type DateFilterOption = 'today' | '7d' | '30d' | 'month' | 'last_month' | 'all';

export interface AdminOverviewStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalAdmins: number;
  newStudentsThisMonth: number;
  newTeachersThisMonth: number;
  newParentsThisMonth: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalExams: number;
  totalEnrollments: number;
  totalExamAttempts: number;
  completedProgressCount: number;
  parentsWithLinkedStudents: number;
  distinctLinkedStudents: number;
  registrationTrends: Array<{ date: string; students: number; teachers: number; parents: number }>;
  enrollmentTrends: Array<{ date: string; count: number }>;
  courseCategoryDistribution: Array<{ name: string; count: number }>;
}

export interface ParentStudentLinkItem {
  id: string;
  parentId: string;
  studentId: string;
  relationshipType: string;
  studentName: string;
  studentEmail: string;
  parentName: string;
  parentEmail: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  admin_id: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface ActivityLogItem {
  id: string;
  user_id: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  activity_type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface PricingPlanItem {
  id: string;
  item_type: 'course' | 'exam';
  item_id: string;
  title: string;
  amount_paise: number;
  currency: string;
  is_free: boolean;
  is_active: boolean;
  effective_from: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingHistoryItem {
  id: string;
  pricing_plan_id: string;
  previous_amount_paise: number;
  new_amount_paise: number;
  previous_is_free: boolean;
  new_is_free: boolean;
  changed_by?: string | null;
  changer_name?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface AdminStudentDetail extends Profile {
  enrolledCoursesCount: number;
  examAttemptsCount: number;
  completedItemsCount: number;
  enrolledCourses: Array<{
    id: string;
    channelId: string;
    courseTitle: string;
    teacherName: string;
    enrolledAt: string;
    packageType: string;
    progressPercentage: number;
    status: string;
  }>;
  examAttempts: Array<{
    id: string;
    quizId: string;
    quizTitle: string;
    score: number;
    totalMarks: number;
    isCompleted: boolean;
    submittedAt: string;
  }>;
  linkedParents: Array<{
    parentId: string;
    name: string;
    email: string;
    phone: string | null;
    relationshipType: string;
    status: string;
  }>;
}

export interface AdminTeacherDetail extends Profile {
  channelsCount: number;
  totalStudentsEnrolled: number;
  totalVideosCount: number;
  totalQuizzesCount: number;
  channels: Array<{
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    classesCount: number;
    enrolledCount: number;
    videosCount: number;
    quizzesCount: number;
  }>;
}

export interface AdminParentDetail extends Profile {
  linkedStudentsCount: number;
  linkedStudents: Array<{
    studentId: string;
    name: string;
    email: string;
    phone: string | null;
    className: string | null;
    enrolledCount: number;
    status: string;
  }>;
}

export interface AdminCourseDetail {
  id: string;
  name: string;
  description: string;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  } | null;
  classes: string[];
  boards: string[];
  units: Array<{
    id: string;
    title: string;
    unit_number: number | null;
    topicsCount: number;
  }>;
  videos: Array<{
    id: string;
    title: string;
    duration_seconds: number | null;
    is_published: boolean;
    is_demo: boolean;
    mux_status: string | null;
    mux_playback_id: string | null;
    mux_duration: number | null;
    created_at: string;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    total_marks: number;
    is_published: boolean;
    created_at: string;
  }>;
  subscribers_count: number;
  pricing?: PricingPlanItem | null;
}

export interface AdminExamDetail {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  total_marks: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  channel: {
    id: string;
    name: string;
    teacher_name: string;
  } | null;
  subject_name: string;
  class_name: string | null;
  board_name: string | null;
  questionsCount: number;
  questions: Array<{
    id: string;
    question_text: string;
    marks: number;
    display_order: number;
    options: Array<{
      id: string;
      option_text: string;
      is_correct: boolean;
    }>;
  }>;
  attemptsCount: number;
  averageScore: number;
  pricing?: PricingPlanItem | null;
}

export interface AdminEnrollmentItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  channelId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  packageType: string;
  status: string;
  enrolledAt: string;
  progressPercent: number;
}

// ==============================================================================
// RAZORPAY PAYMENT & TRANSACTION TYPES
// ==============================================================================

export interface PaymentOrder {
  id: string;
  student_id: string;
  razorpay_order_id: string | null;
  item_type: 'course' | 'exam';
  item_id: string;
  package_type?: SubscriptionPackageType | 'single_exam' | null;
  class_id?: string | null;
  subject_name?: string | null;
  amount_paise: number;
  currency: string;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'expired';
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string | null;
  student_id: string;
  amount_paise: number;
  currency: string;
  status: 'authorized' | 'captured' | 'failed' | 'refunded';
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  verified_at?: string | null;
  verification_source: 'api' | 'webhook' | 'reconcile';
  created_at: string;
  updated_at: string;
}

export interface TeacherEarningsItem {
  id: string;
  teacher_id: string;
  teacher_name?: string | null;
  order_id: string;
  transaction_id: string;
  gross_amount_paise: number;
  platform_commission_paise: number;
  teacher_share_paise: number;
  commission_rate_percent: number;
  status: 'pending' | 'cleared' | 'refunded' | 'paid_out';
  created_at: string;
  updated_at: string;
}

export interface RefundRecordItem {
  id: string;
  transaction_id: string;
  order_id: string;
  razorpay_refund_id: string;
  amount_paise: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  reason?: string | null;
  created_at: string;
}

export interface StudentPaymentHistoryItem {
  id: string;
  orderId: string;
  razorpayPaymentId: string | null;
  itemType: 'course' | 'exam';
  itemId: string;
  itemTitle: string;
  packageType: string | null;
  amountPaise: number;
  currency: string;
  status: string;
  method?: string | null;
  paidAt: string;
}

export interface AdminPaymentAnalytics {
  totalCapturedRevenuePaise: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  pendingOrdersCount: number;
  refundsTotalPaise: number;
  platformCommissionPaise: number;
  teacherEarningsPaise: number;
  dailyRevenue: Array<{ date: string; amountPaise: number; count: number }>;
  courseSales: Array<{ courseId: string; title: string; count: number; totalPaise: number }>;
  recentTransactions: Array<PaymentTransaction & {
    student_name?: string;
    student_email?: string;
    item_title?: string;
  }>;
}

// ==============================================================================
// PARENT-STUDENT LINKING & LEARNING ANALYTICS TYPES
// ==============================================================================

export type ParentStudentRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ParentStudentRelation {
  id: string;
  parent_id: string;
  student_id: string;
  relationship_type: string;
  status: ParentStudentRequestStatus;
  responded_at?: string | null;
  created_at: string;
  updated_at?: string;
  student?: {
    id: string;
    name: string;
    email: string;
    student_id_code: string;
    photo_url?: string | null;
    class_id?: string | null;
    board_id?: string | null;
  };
  parent?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string | null;
    phone?: string | null;
  };
}

export interface ChildCourseProgress {
  channel_id: string;
  channel_name: string;
  channel_photo_url?: string | null;
  teacher_id: string;
  teacher_name: string;
  teacher_photo_url?: string | null;
  teacher_bio?: string | null;
  subject_name: string;
  class_name?: string | null;
  board_name?: string | null;
  package_type: string;
  enrolled_at: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  status: 'completed' | 'in_progress' | 'not_started';
  last_activity_at?: string | null;
}

export interface ChildAssessment {
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_marks: number;
  correct_count: number;
  wrong_count: number;
  is_completed: boolean;
  submitted_at: string;
  percentage: number;
}

export interface ChildLearningAnalytics {
  student: {
    id: string;
    name: string;
    email: string;
    student_id_code: string;
    photo_url?: string | null;
    class_name?: string | null;
    board_name?: string | null;
    preferred_language?: string | null;
    enrolled_date: string;
  };
  overview: {
    total_courses: number;
    completed_courses: number;
    in_progress_courses: number;
    overall_completion_percentage: number;
    total_lessons_completed: number;
    total_published_lessons: number;
    total_assessments_taken: number;
    average_assessment_score: number;
  };
  courses: ChildCourseProgress[];
  assessments: ChildAssessment[];
  relationship: {
    id: string;
    relationship_type: string;
    status: ParentStudentRequestStatus;
    created_at: string;
  };
}

// ==============================================================================
// TEACHER MONETIZATION, SUBSCRIPTIONS & ENTITLEMENTS
// ==============================================================================

export type MonetizationScope = 'channel' | 'subject' | 'chapter';
export type SubscriptionDuration = '1_month' | '6_months' | '12_months';

export interface TeacherContentPricing {
  id: string;
  teacher_id: string;
  channel_id: string;
  scope: MonetizationScope;
  subject_name?: string | null;
  unit_id?: string | null;
  duration: SubscriptionDuration;
  amount_paise: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScopePricingConfig {
  scope: MonetizationScope;
  channel_id: string;
  subject_name?: string | null;
  unit_id?: string | null;
  title: string;
  is_paid: boolean;
  // Teacher Base Ask
  monthly_paise: number;
  six_month_paise: number;
  yearly_paise: number;
  // Student Payable Amount (Teacher Base + 20% Platform Fee)
  student_monthly_paise?: number;
  student_six_month_paise?: number;
  student_yearly_paise?: number;
  platform_fee_percent?: number;
  active_subscribers_count?: number;
  total_revenue_paise?: number;
}

export interface ContentEntitlement {
  id: string;
  student_id: string;
  channel_id: string;
  teacher_id: string;
  scope: MonetizationScope;
  subject_name?: string | null;
  unit_id?: string | null;
  duration: SubscriptionDuration;
  order_id?: string | null;
  transaction_id?: string | null;
  starts_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
  channel_name?: string;
  unit_title?: string;
  teacher_name?: string;
}

export interface VideoPlaybackAccessResult {
  access: boolean;
  locked: boolean;
  reason?: 'subscription_required' | 'unauthorized' | 'not_found' | 'unpublished';
  playbackId?: string | null;
  videoUrl?: string | null;
  durationSeconds?: number | null;
  title?: string;
  description?: string | null;
  teacherName?: string;
  channelName?: string;
  subjectName?: string;
  unitTitle?: string;
  pricingOptions?: {
    channel?: ScopePricingConfig | null;
    subject?: ScopePricingConfig | null;
    chapter?: ScopePricingConfig | null;
  };
}

export interface TeacherMonetizationOverview {
  totalPaidOrders: number;
  activeSubscriptions: number;
  grossSalesPaise: number;
  platformCommissionPaise: number;
  netTeacherEarningsPaise: number;
  pendingEarningsPaise: number;
  paidOutEarningsPaise: number;
  revenueByScope: {
    channelPaise: number;
    subjectPaise: number;
    chapterPaise: number;
  };
  revenueByDuration: {
    monthlyPaise: number;
    sixMonthPaise: number;
    yearlyPaise: number;
  };
  recentTransactions: Array<{
    id: string;
    orderId: string;
    razorpayPaymentId?: string;
    studentName: string;
    studentEmail?: string;
    scope: MonetizationScope;
    subjectName?: string | null;
    unitTitle?: string | null;
    channelName?: string;
    duration: SubscriptionDuration;
    grossAmountPaise: number;
    platformCommissionPaise: number;
    teacherSharePaise: number;
    status: string;
    createdAt: string;
    expiresAt?: string;
  }>;
}
