import { createServiceClient } from '@/lib/supabase/server';
import {
  AdminOverviewStats,
  AdminStudentDetail,
  AdminTeacherDetail,
  AdminParentDetail,
  AdminCourseDetail,
  AdminExamDetail,
  AdminEnrollmentItem,
  AuditLogItem,
  ActivityLogItem,
  PricingPlanItem,
  DateFilterOption,
  Profile,
} from '@/types';

function getAdminClient() {
  return createServiceClient();
}

export const AdminService = {
  // ==============================================================================
  // 1. DASHBOARD OVERVIEW & ANALYTICS
  // ==============================================================================
  async getOverviewStats(filter: DateFilterOption = 'all'): Promise<AdminOverviewStats> {
    const supabase = getAdminClient();

    // 1. Lifetime totals & role counts
    const [
      studentsRes,
      teachersRes,
      parentsRes,
      adminsRes,
      coursesRes,
      publishedCoursesRes,
      examsRes,
      enrollmentsRes,
      attemptsRes,
      progressRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, created_at', { count: 'exact' }).eq('role', 'student'),
      supabase.from('profiles').select('id, created_at', { count: 'exact' }).eq('role', 'teacher'),
      supabase.from('profiles').select('id, created_at, phone', { count: 'exact' }).eq('role', 'parent'),
      supabase.from('profiles').select('id, created_at', { count: 'exact' }).eq('role', 'admin'),
      supabase.from('channels').select('id, is_active, created_at', { count: 'exact' }),
      supabase.from('channels').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('quizzes').select('id, title, is_published, created_at', { count: 'exact' }),
      supabase.from('channel_subscriptions').select('id, created_at', { count: 'exact' }),
      supabase.from('student_quiz_attempts').select('id, submitted_at', { count: 'exact' }),
      supabase.from('student_content_progress').select('id, status', { count: 'exact' }).eq('status', 'completed'),
    ]);

    const totalStudents = studentsRes.count ?? 0;
    const totalTeachers = teachersRes.count ?? 0;
    const totalParents = parentsRes.count ?? 0;
    const totalAdmins = adminsRes.count ?? 0;
    const totalCourses = coursesRes.count ?? 0;
    const publishedCourses = publishedCoursesRes.count ?? 0;
    const draftCourses = Math.max(0, totalCourses - publishedCourses);
    const totalExams = examsRes.count ?? 0;
    const totalEnrollments = enrollmentsRes.count ?? 0;
    const totalExamAttempts = attemptsRes.count ?? 0;
    const completedProgressCount = progressRes.count ?? 0;

    // 2. Calculate New Users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    const newStudentsThisMonth = (studentsRes.data || []).filter(
      (s) => s.created_at && new Date(s.created_at) >= startOfMonth
    ).length;

    const newTeachersThisMonth = (teachersRes.data || []).filter(
      (t) => t.created_at && new Date(t.created_at) >= startOfMonth
    ).length;

    const newParentsThisMonth = (parentsRes.data || []).filter(
      (p) => p.created_at && new Date(p.created_at) >= startOfMonth
    ).length;

    // 3. Parent-student relationships count
    // Fetch students to check parent_phone or parent_students table
    let parentsWithLinkedStudents = 0;
    const distinctLinkedStudentIds = new Set<string>();

    try {
      const { data: explicitLinks } = await supabase.from('parent_students').select('*');
      if (explicitLinks && explicitLinks.length > 0) {
        const parentsSet = new Set<string>();
        explicitLinks.forEach((link) => {
          parentsSet.add(link.parent_id);
          distinctLinkedStudentIds.add(link.student_id);
        });
        parentsWithLinkedStudents = parentsSet.size;
      }
    } catch {
      // Ignore if table doesn't exist yet
    }

    // Also match by parent_phone
    const parentPhones = new Set(
      (parentsRes.data || []).map((p) => p.phone).filter((ph): ph is string => Boolean(ph && ph.trim()))
    );
    if (parentPhones.size > 0) {
      const { data: studentsWithParentPhone } = await supabase
        .from('profiles')
        .select('id, parent_phone')
        .eq('role', 'student')
        .not('parent_phone', 'is', null);

      if (studentsWithParentPhone) {
        studentsWithParentPhone.forEach((st) => {
          if (st.parent_phone && parentPhones.has(st.parent_phone)) {
            distinctLinkedStudentIds.add(st.id);
          }
        });
      }
      // If no explicit links, approximate parents who matched a student
      if (parentsWithLinkedStudents === 0 && distinctLinkedStudentIds.size > 0) {
        parentsWithLinkedStudents = Math.min(parentPhones.size, distinctLinkedStudentIds.size);
      }
    }

    // 4. Registration trends (last 7 or 30 days)
    const daysToTrack = filter === '7d' ? 7 : filter === '30d' ? 30 : 14;
    const trendsMap: Record<string, { date: string; students: number; teachers: number; parents: number }> = {};

    for (let i = daysToTrack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      trendsMap[dateKey] = { date: dateKey, students: 0, teachers: 0, parents: 0 };
    }

    (studentsRes.data || []).forEach((s) => {
      if (s.created_at) {
        const k = s.created_at.slice(0, 10);
        if (trendsMap[k]) trendsMap[k].students += 1;
      }
    });

    (teachersRes.data || []).forEach((t) => {
      if (t.created_at) {
        const k = t.created_at.slice(0, 10);
        if (trendsMap[k]) trendsMap[k].teachers += 1;
      }
    });

    (parentsRes.data || []).forEach((p) => {
      if (p.created_at) {
        const k = p.created_at.slice(0, 10);
        if (trendsMap[k]) trendsMap[k].parents += 1;
      }
    });

    const registrationTrends = Object.values(trendsMap);

    // 5. Enrollment trends
    const enrollmentTrendsMap: Record<string, number> = {};
    for (let i = daysToTrack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      enrollmentTrendsMap[dateKey] = 0;
    }

    (enrollmentsRes.data || []).forEach((en) => {
      if (en.created_at) {
        const k = en.created_at.slice(0, 10);
        if (enrollmentTrendsMap[k] !== undefined) {
          enrollmentTrendsMap[k] += 1;
        }
      }
    });

    const enrollmentTrends = Object.entries(enrollmentTrendsMap).map(([date, count]) => ({
      date,
      count,
    }));

    // 6. Course distribution
    const courseCategoryDistribution = [
      { name: 'Published', count: publishedCourses },
      { name: 'Draft', count: draftCourses },
    ];

    return {
      totalStudents,
      totalTeachers,
      totalParents,
      totalAdmins,
      newStudentsThisMonth,
      newTeachersThisMonth,
      newParentsThisMonth,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalExams,
      totalEnrollments,
      totalExamAttempts,
      completedProgressCount,
      parentsWithLinkedStudents,
      distinctLinkedStudents: distinctLinkedStudentIds.size,
      registrationTrends,
      enrollmentTrends,
      courseCategoryDistribution,
    };
  },

  // ==============================================================================
  // 2. STUDENT MANAGEMENT
  // ==============================================================================
  async getStudents(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ students: Profile[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*, class:classes(name)', { count: 'exact' })
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(
        `name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`
      );
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching students:', error);
      return { students: [], total: 0 };
    }

    return {
      students: (data as Profile[]) || [],
      total: count || 0,
    };
  },

  async getStudentDetail(studentId: string): Promise<AdminStudentDetail | null> {
    const supabase = getAdminClient();

    // Fetch base profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, class:classes(name), board:boards(name)')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (error || !profile) return null;

    // Fetch student's enrollments with channel details
    const { data: enrollments } = await supabase
      .from('channel_subscriptions')
      .select(
        `id, channel_id, package_type, status, created_at,
         channel:channels(id, name, teacher:profiles(name))`
      )
      .eq('student_id', studentId);

    // Fetch student's quiz attempts
    const { data: quizAttempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, quiz_id, score, total_marks, is_completed, submitted_at, quiz:quizzes(title)')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    // Fetch student's learning progress items
    const { data: progressItems } = await supabase
      .from('student_content_progress')
      .select('id, status, progress_percent')
      .eq('student_id', studentId);

    const completedItemsCount = (progressItems || []).filter(
      (p) => p.status === 'completed' || (p.progress_percent && p.progress_percent >= 100)
    ).length;

    // Format enrolled courses
    const formattedEnrollments = (enrollments || []).map((en: any) => {
      return {
        id: en.id,
        channelId: en.channel_id,
        courseTitle: en.channel?.name || 'Untitled Course',
        teacherName: en.channel?.teacher?.name || 'Assigned Instructor',
        enrolledAt: en.created_at,
        packageType: en.package_type || 'entire_channel',
        progressPercentage: 0,
        status: en.status || 'active',
      };
    });

    // Format quiz attempts
    const formattedAttempts = (quizAttempts || []).map((qa: any) => ({
      id: qa.id,
      quizId: qa.quiz_id,
      quizTitle: qa.quiz?.title || 'Course Quiz',
      score: qa.score || 0,
      totalMarks: qa.total_marks || 0,
      isCompleted: qa.is_completed ?? true,
      submittedAt: qa.submitted_at,
    }));

    // Find linked parents:
    // 1. From parent_students table if exists
    // 2. Or by student.parent_phone matching parent.phone
    const linkedParents: Array<{
      parentId: string;
      name: string;
      email: string;
      phone: string | null;
      relationshipType: string;
      status: string;
    }> = [];

    try {
      const { data: links } = await supabase
        .from('parent_students')
        .select('*, parent:profiles(id, name, email, phone, status)')
        .eq('student_id', studentId);

      if (links && links.length > 0) {
        links.forEach((l: any) => {
          if (l.parent) {
            linkedParents.push({
              parentId: l.parent.id,
              name: l.parent.name,
              email: l.parent.email,
              phone: l.parent.phone,
              relationshipType: l.relationship_type || 'Guardian',
              status: l.parent.status || 'active',
            });
          }
        });
      }
    } catch {
      // Table may not exist yet
    }

    // Check matching parent_phone if no explicit links found
    if (linkedParents.length === 0 && profile.parent_phone) {
      const { data: matchedParents } = await supabase
        .from('profiles')
        .select('id, name, email, phone, status')
        .eq('role', 'parent')
        .eq('phone', profile.parent_phone);

      if (matchedParents) {
        matchedParents.forEach((p) => {
          linkedParents.push({
            parentId: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            relationshipType: 'Parent (Phone Link)',
            status: p.status || 'active',
          });
        });
      }
    }

    return {
      ...(profile as Profile),
      enrolledCoursesCount: formattedEnrollments.length,
      examAttemptsCount: formattedAttempts.length,
      completedItemsCount,
      enrolledCourses: formattedEnrollments,
      examAttempts: formattedAttempts,
      linkedParents,
    };
  },

  async updateStudentStatus(
    studentId: string,
    status: 'active' | 'suspended',
    adminId: string
  ): Promise<boolean> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { error: profError } = await supabase
      .from('profiles')
      .update({ status, updated_at: now })
      .eq('id', studentId);

    // Also update students table if exists
    try {
      await supabase.from('students').update({ status, updated_at: now }).eq('id', studentId);
    } catch {
      // Ignore
    }

    if (profError) {
      console.error('Failed to update student status:', profError);
      return false;
    }

    await this.recordAuditLog({
      admin_id: adminId,
      action: status === 'suspended' ? 'SUSPEND_STUDENT' : 'REACTIVATE_STUDENT',
      entity_type: 'student',
      entity_id: studentId,
      details: { new_status: status },
    });

    return true;
  },

  // ==============================================================================
  // 3. TEACHER MANAGEMENT
  // ==============================================================================
  async getTeachers(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ teachers: Profile[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'teacher')
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(
        `name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`
      );
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching teachers:', error);
      return { teachers: [], total: 0 };
    }

    return {
      teachers: (data as Profile[]) || [],
      total: count || 0,
    };
  },

  async getTeacherDetail(teacherId: string): Promise<AdminTeacherDetail | null> {
    const supabase = getAdminClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single();

    if (error || !profile) return null;

    // Fetch teacher's channels/courses
    const { data: channels } = await supabase
      .from('channels')
      .select('id, name, description, is_active, created_at')
      .eq('teacher_id', teacherId);

    const channelIds = (channels || []).map((c) => c.id);

    // Fetch videos count
    let totalVideosCount = 0;
    if (channelIds.length > 0) {
      const { count: videoCount } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .in('channel_id', channelIds);
      totalVideosCount = videoCount || 0;
    }

    // Fetch quizzes count
    let totalQuizzesCount = 0;
    if (channelIds.length > 0) {
      const { count: quizCount } = await supabase
        .from('quizzes')
        .select('id', { count: 'exact', head: true })
        .in('channel_id', channelIds);
      totalQuizzesCount = quizCount || 0;
    }

    // Fetch total subscribers enrolled across teacher's channels
    let totalStudentsEnrolled = 0;
    if (channelIds.length > 0) {
      const { count: enrolledCount } = await supabase
        .from('channel_subscriptions')
        .select('id', { count: 'exact', head: true })
        .in('channel_id', channelIds);
      totalStudentsEnrolled = enrolledCount || 0;
    }

    // Format individual channels with stats
    const formattedChannels = (channels || []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.is_active,
      createdAt: c.created_at,
      classesCount: 1,
      enrolledCount: 0,
      videosCount: 0,
      quizzesCount: 0,
    }));

    return {
      ...(profile as Profile),
      channelsCount: formattedChannels.length,
      totalStudentsEnrolled,
      totalVideosCount,
      totalQuizzesCount,
      channels: formattedChannels,
    };
  },

  async updateTeacherStatus(
    teacherId: string,
    status: 'active' | 'suspended',
    adminId: string
  ): Promise<boolean> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: now })
      .eq('id', teacherId);

    try {
      await supabase.from('teachers').update({ status, updated_at: now }).eq('id', teacherId);
    } catch {
      // Ignore
    }

    if (error) {
      console.error('Failed to update teacher status:', error);
      return false;
    }

    await this.recordAuditLog({
      admin_id: adminId,
      action: status === 'suspended' ? 'SUSPEND_TEACHER' : 'REACTIVATE_TEACHER',
      entity_type: 'teacher',
      entity_id: teacherId,
      details: { new_status: status },
    });

    return true;
  },

  // ==============================================================================
  // 4. PARENT MANAGEMENT
  // ==============================================================================
  async getParents(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ parents: Profile[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'parent')
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(
        `name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`
      );
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching parents:', error);
      return { parents: [], total: 0 };
    }

    return {
      parents: (data as Profile[]) || [],
      total: count || 0,
    };
  },

  async getParentDetail(parentId: string): Promise<AdminParentDetail | null> {
    const supabase = getAdminClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', parentId)
      .eq('role', 'parent')
      .single();

    if (error || !profile) return null;

    const linkedStudents: Array<{
      studentId: string;
      name: string;
      email: string;
      phone: string | null;
      className: string | null;
      enrolledCount: number;
      status: string;
    }> = [];

    // 1. Check parent_students table
    try {
      const { data: links } = await supabase
        .from('parent_students')
        .select('*, student:profiles(id, name, email, phone, status, class:classes(name))')
        .eq('parent_id', parentId);

      if (links && links.length > 0) {
        links.forEach((l: any) => {
          if (l.student) {
            linkedStudents.push({
              studentId: l.student.id,
              name: l.student.name,
              email: l.student.email,
              phone: l.student.phone,
              className: l.student.class?.name || null,
              enrolledCount: 0,
              status: l.student.status || 'active',
            });
          }
        });
      }
    } catch {
      // Table may not exist yet
    }

    // 2. Also check if student's parent_phone matches parent's phone
    if (profile.phone && linkedStudents.length === 0) {
      const { data: phoneLinkedStudents } = await supabase
        .from('profiles')
        .select('id, name, email, phone, status, class:classes(name)')
        .eq('role', 'student')
        .eq('parent_phone', profile.phone);

      if (phoneLinkedStudents) {
        phoneLinkedStudents.forEach((st: any) => {
          linkedStudents.push({
            studentId: st.id,
            name: st.name,
            email: st.email,
            phone: st.phone,
            className: st.class?.name || null,
            enrolledCount: 0,
            status: st.status || 'active',
          });
        });
      }
    }

    return {
      ...(profile as Profile),
      linkedStudentsCount: linkedStudents.length,
      linkedStudents,
    };
  },

  async updateParentStatus(
    parentId: string,
    status: 'active' | 'suspended',
    adminId: string
  ): Promise<boolean> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: now })
      .eq('id', parentId);

    try {
      await supabase.from('parents').update({ status, updated_at: now }).eq('id', parentId);
    } catch {
      // Ignore
    }

    if (error) {
      console.error('Failed to update parent status:', error);
      return false;
    }

    await this.recordAuditLog({
      admin_id: adminId,
      action: status === 'suspended' ? 'SUSPEND_PARENT' : 'REACTIVATE_PARENT',
      entity_type: 'parent',
      entity_id: parentId,
      details: { new_status: status },
    });

    return true;
  },

  // ==============================================================================
  // 5. COURSE MANAGEMENT (CHANNELS)
  // ==============================================================================
  async getCourses(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ courses: any[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('channels')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    if (params.status === 'published') {
      query = query.eq('is_active', true);
    } else if (params.status === 'draft') {
      query = query.eq('is_active', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error || !data) {
      console.error('Error fetching courses:', error);
      return { courses: [], total: 0 };
    }

    // Batch fetch teacher profiles
    const teacherIds = Array.from(new Set(data.map((c: any) => c.teacher_id).filter(Boolean)));
    const teacherMap: Record<string, { name: string; email: string }> = {};

    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', teacherIds);

      (teachers || []).forEach((t: any) => {
        teacherMap[t.id] = { name: t.name || 'Instructor', email: t.email || '' };
      });
    }

    const coursesWithTeachers = data.map((course: any) => ({
      ...course,
      teacher: teacherMap[course.teacher_id] || { name: 'Assigned Instructor', email: '' },
    }));

    return {
      courses: coursesWithTeachers,
      total: count || 0,
    };
  },

  async getCourseDetail(courseId: string): Promise<AdminCourseDetail | null> {
    const supabase = getAdminClient();

    // 1. Fetch channel
    const { data: channel, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !channel) return null;

    // Fetch teacher info
    let teacher = null;
    if (channel.teacher_id) {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', channel.teacher_id)
        .single();
      teacher = teacherProfile;
    }

    // Fetch units
    const { data: units } = await supabase
      .from('units')
      .select('id, title, unit_number')
      .eq('channel_id', courseId)
      .order('display_order', { ascending: true });

    // Fetch videos (with Mux playback and status)
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, duration_seconds, is_published, is_demo, mux_status, mux_playback_id, mux_duration, created_at')
      .eq('channel_id', courseId)
      .order('created_at', { ascending: true });

    // Fetch quizzes
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, total_marks, is_published, created_at')
      .eq('channel_id', courseId)
      .order('created_at', { ascending: true });

    // Fetch subscribers count
    const { count: subscribersCount } = await supabase
      .from('channel_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', courseId);

    // Fetch pricing if available
    let pricing: PricingPlanItem | null = null;
    try {
      const { data: plan } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('item_type', 'course')
        .eq('item_id', courseId)
        .maybeSingle();
      if (plan) pricing = plan as PricingPlanItem;
    } catch {
      // Table may not exist yet
    }

    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      photo_url: channel.photo_url,
      is_active: channel.is_active,
      created_at: channel.created_at,
      updated_at: channel.updated_at,
      teacher,
      classes: [],
      boards: [],
      units: (units || []).map((u) => ({
        id: u.id,
        title: u.title,
        unit_number: u.unit_number,
        topicsCount: 0,
      })),
      videos: (videos || []).map((v) => ({
        id: v.id,
        title: v.title,
        duration_seconds: v.duration_seconds,
        is_published: v.is_published,
        is_demo: v.is_demo,
        mux_status: v.mux_status,
        mux_playback_id: v.mux_playback_id,
        mux_duration: v.mux_duration,
        created_at: v.created_at,
      })),
      quizzes: (quizzes || []).map((q) => ({
        id: q.id,
        title: q.title,
        total_marks: q.total_marks,
        is_published: q.is_published,
        created_at: q.created_at,
      })),
      subscribers_count: subscribersCount || 0,
      pricing,
    };
  },

  async updateCoursePublication(
    courseId: string,
    is_active: boolean,
    adminId: string
  ): Promise<boolean> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('channels')
      .update({ is_active, updated_at: now })
      .eq('id', courseId);

    if (error) {
      console.error('Failed to update course status:', error);
      return false;
    }

    await this.recordAuditLog({
      admin_id: adminId,
      action: is_active ? 'PUBLISH_COURSE' : 'UNPUBLISH_COURSE',
      entity_type: 'course',
      entity_id: courseId,
      details: { is_active },
    });

    return true;
  },

  // ==============================================================================
  // 6. EXAM MANAGEMENT (QUIZZES)
  // ==============================================================================
  async getExams(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ exams: any[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('quizzes')
      .select('*, channel:channels(id, name, teacher_id)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,subject_name.ilike.%${params.search}%`);
    }

    if (params.status === 'published') {
      query = query.eq('is_published', true);
    } else if (params.status === 'draft') {
      query = query.eq('is_published', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error || !data) {
      console.error('Error fetching exams:', error);
      return { exams: [], total: 0 };
    }

    // Batch fetch teacher names for channels
    const teacherIds = Array.from(
      new Set(
        data
          .map((q: any) => q.channel?.teacher_id)
          .filter(Boolean)
      )
    );

    const teacherMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', teacherIds);

      (teachers || []).forEach((t: any) => {
        teacherMap[t.id] = t.name || 'Instructor';
      });
    }

    const formattedExams = data.map((quiz: any) => {
      const teacherName = quiz.channel?.teacher_id
        ? teacherMap[quiz.channel.teacher_id] || 'Assigned Instructor'
        : 'Assigned Instructor';
      return {
        ...quiz,
        channel: quiz.channel
          ? {
              ...quiz.channel,
              teacher: { name: teacherName },
            }
          : null,
      };
    });

    return {
      exams: formattedExams,
      total: count || 0,
    };
  },

  async getExamDetail(examId: string): Promise<AdminExamDetail | null> {
    const supabase = getAdminClient();

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*, channel:channels(id, name, teacher_id)')
      .eq('id', examId)
      .single();

    if (error || !quiz) return null;

    let teacherName = 'Assigned Instructor';
    if (quiz.channel?.teacher_id) {
      const { data: t } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', quiz.channel.teacher_id)
        .single();
      if (t) teacherName = t.name;
    }

    // Fetch questions and options
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, question_text, marks, display_order, options:quiz_options(id, option_text, is_correct)')
      .eq('quiz_id', examId)
      .order('display_order', { ascending: true });

    // Fetch attempts
    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, score, total_marks')
      .eq('quiz_id', examId);

    const attemptsCount = attempts?.length || 0;
    const averageScore =
      attemptsCount > 0
        ? Math.round(
            (attempts!.reduce((acc, curr) => acc + (curr.score || 0), 0) / attemptsCount) * 10
          ) / 10
        : 0;

    // Pricing
    let pricing: PricingPlanItem | null = null;
    try {
      const { data: plan } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('item_type', 'exam')
        .eq('item_id', examId)
        .maybeSingle();
      if (plan) pricing = plan as PricingPlanItem;
    } catch {
      // Table may not exist yet
    }

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      time_limit_minutes: quiz.time_limit_minutes,
      total_marks: quiz.total_marks,
      is_published: quiz.is_published,
      created_at: quiz.created_at,
      updated_at: quiz.updated_at,
      channel: quiz.channel
        ? {
            id: quiz.channel.id,
            name: quiz.channel.name,
            teacher_name: teacherName,
          }
        : null,
      subject_name: quiz.subject_name,
      class_name: null,
      board_name: null,
      questionsCount: questions?.length || 0,
      questions: (questions || []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        display_order: q.display_order,
        options: (q.options || []).map((opt: any) => ({
          id: opt.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
        })),
      })),
      attemptsCount,
      averageScore,
      pricing,
    };
  },

  async updateExamPublication(
    examId: string,
    is_published: boolean,
    adminId: string
  ): Promise<boolean> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('quizzes')
      .update({ is_published, updated_at: now })
      .eq('id', examId);

    if (error) {
      console.error('Failed to update exam status:', error);
      return false;
    }

    await this.recordAuditLog({
      admin_id: adminId,
      action: is_published ? 'PUBLISH_EXAM' : 'UNPUBLISH_EXAM',
      entity_type: 'exam',
      entity_id: examId,
      details: { is_published },
    });

    return true;
  },

  // ==============================================================================
  // 7. ENROLLMENT MANAGEMENT
  // ==============================================================================
  async getEnrollments(params: {
    search?: string;
    courseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ enrollments: AdminEnrollmentItem[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('channel_subscriptions')
      .select(
        `id, student_id, channel_id, package_type, status, created_at,
         channel:channels(id, name, teacher_id)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (params.courseId && params.courseId !== 'all') {
      query = query.eq('channel_id', params.courseId);
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error || !data) {
      console.error('Error fetching enrollments:', error);
      return { enrollments: [], total: 0 };
    }

    // Collect all student and teacher IDs to batch lookup profiles
    const studentIds = Array.from(new Set(data.map((r: any) => r.student_id).filter(Boolean)));
    const teacherIds = Array.from(new Set(data.map((r: any) => r.channel?.teacher_id).filter(Boolean)));
    const allProfileIds = Array.from(new Set([...studentIds, ...teacherIds]));

    const profileMap: Record<string, { id: string; name: string; email: string }> = {};
    if (allProfileIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', allProfileIds);

      (profs || []).forEach((p: any) => {
        profileMap[p.id] = {
          id: p.id,
          name: p.name || 'Platform User',
          email: p.email || '',
        };
      });
    }

    const formatted: AdminEnrollmentItem[] = data.map((row: any) => {
      const student = profileMap[row.student_id] || { id: row.student_id, name: 'Student User', email: '' };
      const teacherId = row.channel?.teacher_id || '';
      const teacher = profileMap[teacherId] || { id: teacherId, name: 'Platform Teacher', email: '' };

      return {
        id: row.id,
        studentId: row.student_id,
        studentName: student.name,
        studentEmail: student.email,
        channelId: row.channel_id,
        courseTitle: row.channel?.name || 'Educational Channel',
        teacherId: teacher.id,
        teacherName: teacher.name,
        packageType: row.package_type || 'entire_channel',
        status: row.status || 'active',
        enrolledAt: row.created_at,
        progressPercent: 0,
      };
    });

    return {
      enrollments: formatted,
      total: count || 0,
    };
  },

  // ==============================================================================
  // 8. AUDIT LOGS & ACTIVITY LOGS
  // ==============================================================================
  async recordAuditLog(log: {
    admin_id?: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: Record<string, unknown>;
    ip_address?: string;
  }): Promise<void> {
    const supabase = getAdminClient();
    try {
      await supabase.from('audit_logs').insert([
        {
          admin_id: log.admin_id || null,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          details: log.details || {},
          ip_address: log.ip_address || null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // In case table is pending migration
    }
  },

  async getAuditLogs(params: {
    entityType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLogItem[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    try {
      let query = supabase
        .from('audit_logs')
        .select('*, admin:profiles(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (params.entityType && params.entityType !== 'all') {
        query = query.eq('entity_type', params.entityType);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        return {
          logs: data.map((d: any) => ({
            id: d.id,
            admin_id: d.admin_id,
            admin_name: d.admin?.name || 'Administrator',
            admin_email: d.admin?.email || '',
            action: d.action,
            entity_type: d.entity_type,
            entity_id: d.entity_id,
            details: d.details,
            ip_address: d.ip_address,
            created_at: d.created_at,
          })),
          total: count || 0,
        };
      }
    } catch {
      // Table may not exist yet
    }

    return { logs: [], total: 0 };
  },

  async recordActivityLog(log: {
    user_id?: string | null;
    user_role?: string;
    activity_type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const supabase = getAdminClient();
    try {
      await supabase.from('activity_logs').insert([
        {
          user_id: log.user_id || null,
          user_role: log.user_role || null,
          activity_type: log.activity_type,
          description: log.description,
          metadata: log.metadata || {},
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // Ignore if table pending
    }
  },

  async getActivityLogs(params: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ activities: ActivityLogItem[]; total: number }> {
    const supabase = getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Try fetching from activity_logs table
    try {
      let query = supabase
        .from('activity_logs')
        .select('*, user:profiles(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (params.type && params.type !== 'all') {
        query = query.eq('activity_type', params.type);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data && data.length > 0) {
        return {
          activities: data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            user_name: d.user?.name || 'Platform User',
            user_email: d.user?.email || '',
            user_role: d.user_role,
            activity_type: d.activity_type,
            description: d.description,
            metadata: d.metadata,
            created_at: d.created_at,
          })),
          total: count || 0,
        };
      }
    } catch {
      // Ignore
    }

    // Fallback: Synthesize real activity from existing table events
    const [recentUsers, recentCourses, recentAttempts, recentEnrollments] = await Promise.all([
      supabase.from('profiles').select('id, name, email, role, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('channels').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('student_quiz_attempts').select('id, score, total_marks, submitted_at').order('submitted_at', { ascending: false }).limit(5),
      supabase.from('channel_subscriptions').select('id, package_type, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const synthesized: ActivityLogItem[] = [];

    (recentUsers.data || []).forEach((u) => {
      synthesized.push({
        id: `u-${u.id}`,
        user_id: u.id,
        user_name: u.name,
        user_email: u.email,
        user_role: u.role,
        activity_type: 'USER_REGISTERED',
        description: `New ${u.role} account registered: ${u.name} (${u.email})`,
        created_at: u.created_at,
      });
    });

    (recentCourses.data || []).forEach((c) => {
      synthesized.push({
        id: `c-${c.id}`,
        user_id: null,
        activity_type: 'COURSE_CREATED',
        description: `Course channel created: "${c.name}"`,
        created_at: c.created_at,
      });
    });

    (recentAttempts.data || []).forEach((a) => {
      synthesized.push({
        id: `a-${a.id}`,
        user_id: null,
        activity_type: 'EXAM_ATTEMPTED',
        description: `Exam completed with score ${a.score}/${a.total_marks}`,
        created_at: a.submitted_at,
      });
    });

    (recentEnrollments.data || []).forEach((e) => {
      synthesized.push({
        id: `e-${e.id}`,
        user_id: null,
        activity_type: 'ENROLLMENT_CREATED',
        description: `New course enrollment package (${e.package_type})`,
        created_at: e.created_at,
      });
    });

    synthesized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      activities: synthesized.slice(offset, offset + limit),
      total: synthesized.length,
    };
  },

  // ==============================================================================
  // 9. PRICING MANAGEMENT FOUNDATION
  // ==============================================================================
  async getPricingPlans(): Promise<PricingPlanItem[]> {
    const supabase = getAdminClient();
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) return data as PricingPlanItem[];
    } catch {
      // Table may not exist yet
    }
    return [];
  },

  async upsertPricingPlan(
    plan: {
      item_type: 'course' | 'exam';
      item_id: string;
      title: string;
      amount_paise: number;
      currency?: string;
      is_free: boolean;
      is_active: boolean;
      effective_from?: string;
      reason?: string;
    },
    adminId: string
  ): Promise<PricingPlanItem | null> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    // Validate amount
    if (plan.amount_paise < 0 || !Number.isInteger(plan.amount_paise)) {
      throw new Error('Price must be a valid non-negative integer in minor units (paise).');
    }

    try {
      // Check existing plan
      const { data: existing } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('item_type', plan.item_type)
        .eq('item_id', plan.item_id)
        .maybeSingle();

      let planId: string;
      let previousAmount = 0;
      let previousIsFree = true;

      if (existing) {
        planId = existing.id;
        previousAmount = existing.amount_paise;
        previousIsFree = existing.is_free;

        const { data: updated } = await supabase
          .from('pricing_plans')
          .update({
            title: plan.title,
            amount_paise: plan.amount_paise,
            currency: plan.currency || 'INR',
            is_free: plan.is_free,
            is_active: plan.is_active,
            effective_from: plan.effective_from || now,
            updated_at: now,
          })
          .eq('id', planId)
          .select()
          .single();

        // Record history
        await supabase.from('pricing_history').insert([
          {
            pricing_plan_id: planId,
            previous_amount_paise: previousAmount,
            new_amount_paise: plan.amount_paise,
            previous_is_free: previousIsFree,
            new_is_free: plan.is_free,
            changed_by: adminId,
            reason: plan.reason || 'Admin updated pricing plan',
            created_at: now,
          },
        ]);

        await this.recordAuditLog({
          admin_id: adminId,
          action: 'UPDATE_PRICING',
          entity_type: 'pricing',
          entity_id: planId,
          details: {
            item_type: plan.item_type,
            item_id: plan.item_id,
            previous_paise: previousAmount,
            new_paise: plan.amount_paise,
            is_free: plan.is_free,
          },
        });

        return updated as PricingPlanItem;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('pricing_plans')
          .insert([
            {
              item_type: plan.item_type,
              item_id: plan.item_id,
              title: plan.title,
              amount_paise: plan.amount_paise,
              currency: plan.currency || 'INR',
              is_free: plan.is_free,
              is_active: plan.is_active,
              effective_from: plan.effective_from || now,
              created_by: adminId,
              created_at: now,
              updated_at: now,
            },
          ])
          .select()
          .single();

        if (insertErr || !inserted) {
          throw new Error(insertErr?.message || 'Failed to create pricing plan');
        }

        await supabase.from('pricing_history').insert([
          {
            pricing_plan_id: inserted.id,
            previous_amount_paise: 0,
            new_amount_paise: plan.amount_paise,
            previous_is_free: true,
            new_is_free: plan.is_free,
            changed_by: adminId,
            reason: plan.reason || 'Initial pricing setup',
            created_at: now,
          },
        ]);

        await this.recordAuditLog({
          admin_id: adminId,
          action: 'CREATE_PRICING',
          entity_type: 'pricing',
          entity_id: inserted.id,
          details: {
            item_type: plan.item_type,
            item_id: plan.item_id,
            amount_paise: plan.amount_paise,
            is_free: plan.is_free,
          },
        });

        return inserted as PricingPlanItem;
      }
    } catch (err: any) {
      console.error('Pricing plan save error:', err);
      throw err;
    }
  },
};
