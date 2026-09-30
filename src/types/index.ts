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
  mux_status?: 'waiting' | 'uploading' | 'processing' | 'ready' | 'errored' | null;
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

