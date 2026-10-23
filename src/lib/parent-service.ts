import { createClient } from '@supabase/supabase-js';
import { StudentIdService } from './student-id-service';
import {
  ParentStudentRelation,
  ChildLearningAnalytics,
  ChildCourseProgress,
  ChildAssessment,
} from '@/types';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export class ParentService {
  /**
   * Submit a new parent-child connection request using Student ID (ED-YYYY-NNNNNN).
   */
  static async submitConnectionRequest(
    parentId: string,
    studentIdCode: string,
    relationshipType: string = 'Guardian'
  ): Promise<{
    success: boolean;
    requestId: string;
    studentName: string;
    studentIdCode: string;
    status: string;
  }> {
    const supabase = getAdminSupabase();

    // 1. Verify parent exists and has parent role
    const { data: parentProfile, error: parentErr } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', parentId)
      .single();

    if (parentErr || !parentProfile || parentProfile.role !== 'parent') {
      throw new Error('Unauthorized: Only registered parents can send connection requests.');
    }

    // 2. Normalize and lookup student by permanent Student ID
    const normalizedId = StudentIdService.normalizeId(studentIdCode);
    if (!StudentIdService.isValidId(normalizedId)) {
      throw new Error('Invalid Student ID format. Expected format: ED-YYYY-NNNNNN (e.g. ED-2026-000001).');
    }

    const student = await StudentIdService.lookupStudentById(normalizedId);
    if (!student) {
      throw new Error('Student not found with the provided Student ID. Please verify the ID and try again.');
    }

    // 3. Security: Prevent parent from linking to themselves
    if (parentId === student.id) {
      throw new Error('You cannot link your own account as a child.');
    }

    // 4. Check existing relationship in parent_students
    const { data: existingRows } = await supabase
      .from('parent_students')
      .select('id, status, relationship_type')
      .eq('parent_id', parentId)
      .eq('student_id', student.id);

    if (existingRows && existingRows.length > 0) {
      const activeLink = existingRows.find((r) => r.status === 'accepted' || (r.relationship_type && r.relationship_type.includes('accepted')));
      if (activeLink) {
        throw new Error('You are already connected to this student.');
      }

      const pendingLink = existingRows.find((r) => r.status === 'pending' || !r.status || (r.relationship_type && r.relationship_type.includes('pending')));
      if (pendingLink) {
        throw new Error('A connection request is already awaiting student approval for this child.');
      }
    }

    // 5. Create pending relationship request
    const relLabel = relationshipType.trim() || 'Guardian';
    const insertPayload: any = {
      parent_id: parentId,
      student_id: student.id,
      relationship_type: `${relLabel} [status:pending]`,
      created_at: new Date().toISOString(),
    };

    // Try including dedicated status column
    try {
      insertPayload.status = 'pending';
    } catch {
      // Ignored
    }

    const { data: newRel, error: insertErr } = await supabase
      .from('parent_students')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertErr) {
      // Check if status column was rejected by DB schema cache; retry without status column if needed
      if (insertErr.message && insertErr.message.includes('status')) {
        const retryPayload = {
          parent_id: parentId,
          student_id: student.id,
          relationship_type: `${relLabel} [status:pending]`,
          created_at: new Date().toISOString(),
        };
        const { data: retryRel, error: retryErr } = await supabase
          .from('parent_students')
          .insert(retryPayload)
          .select('id')
          .single();

        if (retryErr) {
          throw new Error(`Failed to create connection request: ${retryErr.message}`);
        }
        return {
          success: true,
          requestId: retryRel.id,
          studentName: student.name,
          studentIdCode: normalizedId,
          status: 'pending',
        };
      }
      throw new Error(`Failed to create connection request: ${insertErr.message}`);
    }

    return {
      success: true,
      requestId: newRel.id,
      studentName: student.name,
      studentIdCode: normalizedId,
      status: 'pending',
    };
  }

  /**
   * Helper to parse status from row (supporting both dedicated status column and encoded relationship_type).
   */
  private static parseStatus(row: any): 'pending' | 'accepted' | 'rejected' | 'cancelled' {
    if (row.status && ['pending', 'accepted', 'rejected', 'cancelled'].includes(row.status)) {
      return row.status;
    }
    if (row.relationship_type) {
      if (row.relationship_type.includes('accepted')) return 'accepted';
      if (row.relationship_type.includes('rejected')) return 'rejected';
      if (row.relationship_type.includes('cancelled')) return 'cancelled';
      if (row.relationship_type.includes('pending')) return 'pending';
    }
    return 'pending';
  }

  /**
   * Helper to parse clean relationship label (e.g. "Father" instead of "Father [status:pending]").
   */
  private static parseRelationshipLabel(relType?: string | null): string {
    if (!relType) return 'Guardian';
    return relType.replace(/\[status:[a-zA-Z]+\]/, '').trim() || 'Guardian';
  }

  /**
   * Get all connection requests created by a parent.
   */
  static async getParentRequests(parentId: string): Promise<ParentStudentRelation[]> {
    const supabase = getAdminSupabase();

    const { data: rows, error } = await supabase
      .from('parent_students')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    if (error || !rows) return [];

    const studentIds = rows.map((r) => r.student_id);
    const { data: studentProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);

    const profileMap = new Map((studentProfiles || []).map((p) => [p.id, p]));

    return Promise.all(
      rows.map(async (row) => {
        const studentProf = profileMap.get(row.student_id);
        const studentIdCode =
          studentProf?.student_id_code ||
          (await StudentIdService.getOrAssignStudentId(row.student_id));

        return {
          id: row.id,
          parent_id: row.parent_id,
          student_id: row.student_id,
          relationship_type: this.parseRelationshipLabel(row.relationship_type),
          status: this.parseStatus(row),
          responded_at: row.responded_at || null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          student: studentProf
            ? {
                id: studentProf.id,
                name: studentProf.name,
                email: studentProf.email,
                student_id_code: studentIdCode,
                photo_url: studentProf.photo_url || null,
                class_id: studentProf.class_id || null,
                board_id: studentProf.board_id || null,
              }
            : undefined,
        };
      })
    );
  }

  /**
   * Cancel a pending connection request by parent.
   */
  static async cancelRequest(parentId: string, requestId: string): Promise<boolean> {
    const supabase = getAdminSupabase();

    const { data: req, error } = await supabase
      .from('parent_students')
      .select('*')
      .eq('id', requestId)
      .eq('parent_id', parentId)
      .single();

    if (error || !req) {
      throw new Error('Connection request not found.');
    }

    const currentStatus = this.parseStatus(req);
    if (currentStatus !== 'pending') {
      throw new Error('Only pending requests can be cancelled.');
    }

    // Try update status to cancelled or delete
    try {
      await supabase
        .from('parent_students')
        .update({
          status: 'cancelled',
          relationship_type: `${this.parseRelationshipLabel(req.relationship_type)} [status:cancelled]`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);
    } catch {
      await supabase.from('parent_students').delete().eq('id', requestId);
    }

    return true;
  }

  /**
   * Get all accepted linked children for a parent.
   */
  static async getLinkedChildren(parentId: string): Promise<
    Array<{
      id: string;
      student_id: string;
      name: string;
      email: string;
      student_id_code: string;
      photo_url: string | null;
      relationship_type: string;
      class_name: string | null;
      board_name: string | null;
      enrolled_courses_count: number;
      overall_progress_percentage: number;
      connected_since: string;
    }>
  > {
    const allRequests = await this.getParentRequests(parentId);
    const acceptedRequests = allRequests.filter((r) => r.status === 'accepted' && r.student);

    const supabase = getAdminSupabase();

    const [classesRes, boardsRes] = await Promise.all([
      supabase.from('classes').select('id, name'),
      supabase.from('boards').select('id, name'),
    ]);

    const classMap = new Map((classesRes.data || []).map((c) => [c.id, c.name]));
    const boardMap = new Map((boardsRes.data || []).map((b) => [b.id, b.name]));

    const childrenDetails = await Promise.all(
      acceptedRequests.map(async (req) => {
        const student = req.student!;

        // 1. Enrolled courses
        const { count: enrolledCount } = await supabase
          .from('channel_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('status', 'active');

        // 2. Video progress
        const { data: progressRows } = await supabase
          .from('student_content_progress')
          .select('progress_percent, is_completed')
          .eq('student_id', student.id);

        let overallProgress = 0;
        if (progressRows && progressRows.length > 0) {
          const totalProgress = progressRows.reduce(
            (sum, p) => sum + (p.progress_percent || (p.is_completed ? 100 : 0)),
            0
          );
          overallProgress = Math.round(totalProgress / progressRows.length);
        }

        return {
          id: req.id,
          student_id: student.id,
          name: student.name,
          email: student.email,
          student_id_code: student.student_id_code,
          photo_url: student.photo_url || null,
          relationship_type: req.relationship_type,
          class_name: student.class_id ? classMap.get(student.class_id) || 'Grade Level' : null,
          board_name: student.board_id ? boardMap.get(student.board_id) || 'Board' : null,
          enrolled_courses_count: enrolledCount || 0,
          overall_progress_percentage: overallProgress,
          connected_since: req.created_at,
        };
      })
    );

    return childrenDetails;
  }

  /**
   * Get learning analytics for a linked child.
   * Strictly enforces authorization: Parent must have an accepted relationship.
   */
  static async getChildLearningAnalytics(
    parentId: string,
    studentId: string
  ): Promise<ChildLearningAnalytics> {
    const supabase = getAdminSupabase();

    // 1. Strict Security & Authorization Check
    const { data: relRows, error: relErr } = await supabase
      .from('parent_students')
      .select('*')
      .eq('parent_id', parentId)
      .eq('student_id', studentId);

    if (relErr || !relRows || relRows.length === 0) {
      throw new Error('Access denied: You are not connected with this student.');
    }

    const acceptedRel = relRows.find((r) => this.parseStatus(r) === 'accepted');
    if (!acceptedRel) {
      throw new Error(
        'Access denied: The connection request for this child has not been accepted yet.'
      );
    }

    // 2. Fetch Student Profile
    const { data: studentProf, error: sErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    if (sErr || !studentProf) {
      throw new Error('Student profile not found.');
    }

    const studentIdCode =
      studentProf.student_id_code ||
      (await StudentIdService.getOrAssignStudentId(studentId));

    // 3. Resolve Class & Board Names
    const [classesRes, boardsRes] = await Promise.all([
      supabase.from('classes').select('id, name'),
      supabase.from('boards').select('id, name'),
    ]);
    const classMap = new Map((classesRes.data || []).map((c) => [c.id, c.name]));
    const boardMap = new Map((boardsRes.data || []).map((b) => [b.id, b.name]));

    // 4. Fetch Enrolled Channels / Courses
    const { data: subscriptions } = await supabase
      .from('channel_subscriptions')
      .select('id, channel_id, package_type, status, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    const activeSubs = (subscriptions || []).filter(
      (s) => s.status === 'active' || !s.status
    );

    const channelIds = activeSubs.map((s) => s.channel_id);

    // Fetch Channel Details
    const { data: channelData } = await supabase
      .from('channels')
      .select('id, name, description, photo_url, teacher_id, class_id, board_id, subject_id')
      .in('id', channelIds);

    const channelMap = new Map((channelData || []).map((c) => [c.id, c]));

    // Fetch Teachers
    const teacherIds = Array.from(
      new Set((channelData || []).map((c) => c.teacher_id).filter(Boolean))
    );
    const { data: teacherProfiles } = await supabase
      .from('profiles')
      .select('id, name, photo_url')
      .in('id', teacherIds);

    const teacherMap = new Map((teacherProfiles || []).map((t) => [t.id, t]));

    // Fetch Published Videos per Channel
    const { data: allVideos } = await supabase
      .from('videos')
      .select('id, channel_id, title, duration_seconds, is_free')
      .in('channel_id', channelIds);

    // Fetch Progress for all videos
    const videoIds = (allVideos || []).map((v) => v.id);
    const { data: videoProgress } = await supabase
      .from('student_content_progress')
      .select('video_id, progress_percent, is_completed, updated_at')
      .eq('student_id', studentId)
      .in('video_id', videoIds);

    const progressMap = new Map((videoProgress || []).map((p) => [p.video_id, p]));

    // Calculate per-course progress
    let totalLessonsAcrossCourses = 0;
    let completedLessonsAcrossCourses = 0;
    let completedCoursesCount = 0;
    let inProgressCoursesCount = 0;

    const coursesProgress: ChildCourseProgress[] = activeSubs.map((sub) => {
      const channel = channelMap.get(sub.channel_id);
      const teacher = channel ? teacherMap.get(channel.teacher_id) : null;

      const channelVideos = (allVideos || []).filter(
        (v) => v.channel_id === sub.channel_id
      );
      const totalLessons = channelVideos.length;
      totalLessonsAcrossCourses += totalLessons;

      let completedLessons = 0;
      let lastActivity: string | null = null;

      for (const v of channelVideos) {
        const prog = progressMap.get(v.id);
        if (prog) {
          if (prog.is_completed || (prog.progress_percent && prog.progress_percent >= 90)) {
            completedLessons++;
          }
          if (prog.updated_at && (!lastActivity || prog.updated_at > lastActivity)) {
            lastActivity = prog.updated_at;
          }
        }
      }

      completedLessonsAcrossCourses += completedLessons;

      const progressPercent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (progressPercent >= 100) {
        status = 'completed';
        completedCoursesCount++;
      } else if (progressPercent > 0) {
        status = 'in_progress';
        inProgressCoursesCount++;
      }

      return {
        channel_id: sub.channel_id,
        channel_name: channel?.name || 'Classroom Channel',
        channel_photo_url: channel?.photo_url || null,
        teacher_id: channel?.teacher_id || '',
        teacher_name: teacher?.name || 'Assigned Instructor',
        teacher_photo_url: teacher?.photo_url || null,
        teacher_bio: channel?.description || null,
        subject_name: 'Core Curriculum',
        class_name: channel?.class_id ? classMap.get(channel.class_id) || null : null,
        board_name: channel?.board_id ? boardMap.get(channel.board_id) || null : null,
        package_type: sub.package_type || 'standard',
        enrolled_at: sub.created_at,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_percent: progressPercent,
        status,
        last_activity_at: lastActivity,
      };
    });

    // 5. Fetch Assessments / Quiz Attempts
    const { data: quizAttempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, quiz_id, score, total_marks, correct_count, wrong_count, is_completed, submitted_at')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    // Fetch quiz titles
    const quizIds = (quizAttempts || []).map((q) => q.quiz_id).filter(Boolean);
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title')
      .in('id', quizIds);

    const quizMap = new Map((quizzes || []).map((q) => [q.id, q.title]));

    let totalScoreSum = 0;
    const assessments: ChildAssessment[] = (quizAttempts || []).map((qa) => {
      const pct =
        qa.total_marks > 0 ? Math.round((qa.score / qa.total_marks) * 100) : 0;
      totalScoreSum += pct;
      return {
        quiz_id: qa.quiz_id,
        quiz_title: quizMap.get(qa.quiz_id) || 'Subject Assessment Quiz',
        score: qa.score || 0,
        total_marks: qa.total_marks || 100,
        correct_count: qa.correct_count || 0,
        wrong_count: qa.wrong_count || 0,
        is_completed: qa.is_completed ?? true,
        submitted_at: qa.submitted_at || new Date().toISOString(),
        percentage: pct,
      };
    });

    const avgAssessmentScore =
      assessments.length > 0 ? Math.round(totalScoreSum / assessments.length) : 0;

    const overallPct =
      coursesProgress.length > 0
        ? Math.round(
            coursesProgress.reduce((sum, c) => sum + c.progress_percent, 0) /
              coursesProgress.length
          )
        : 0;

    return {
      student: {
        id: studentProf.id,
        name: studentProf.name,
        email: studentProf.email,
        student_id_code: studentIdCode,
        photo_url: studentProf.photo_url || null,
        class_name: studentProf.class_id ? classMap.get(studentProf.class_id) || null : null,
        board_name: studentProf.board_id ? boardMap.get(studentProf.board_id) || null : null,
        preferred_language: studentProf.preferred_language || 'English',
        enrolled_date: studentProf.created_at,
      },
      overview: {
        total_courses: coursesProgress.length,
        completed_courses: completedCoursesCount,
        in_progress_courses: inProgressCoursesCount,
        overall_completion_percentage: overallPct,
        total_lessons_completed: completedLessonsAcrossCourses,
        total_published_lessons: totalLessonsAcrossCourses,
        total_assessments_taken: assessments.length,
        average_assessment_score: avgAssessmentScore,
      },
      courses: coursesProgress,
      assessments,
      relationship: {
        id: acceptedRel.id,
        relationship_type: this.parseRelationshipLabel(acceptedRel.relationship_type),
        status: 'accepted',
        created_at: acceptedRel.created_at,
      },
    };
  }

  /**
   * Get all incoming connection requests for a student.
   */
  static async getStudentIncomingRequests(studentId: string): Promise<ParentStudentRelation[]> {
    const supabase = getAdminSupabase();

    const { data: rows, error } = await supabase
      .from('parent_students')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error || !rows) return [];

    const parentIds = rows.map((r) => r.parent_id);
    const { data: parentProfiles } = await supabase
      .from('profiles')
      .select('id, name, email, photo_url, phone')
      .in('id', parentIds);

    const parentMap = new Map((parentProfiles || []).map((p) => [p.id, p]));

    return rows.map((row) => {
      const parentProf = parentMap.get(row.parent_id);
      return {
        id: row.id,
        parent_id: row.parent_id,
        student_id: row.student_id,
        relationship_type: this.parseRelationshipLabel(row.relationship_type),
        status: this.parseStatus(row),
        responded_at: row.responded_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        parent: parentProf
          ? {
              id: parentProf.id,
              name: parentProf.name,
              email: parentProf.email,
              photo_url: parentProf.photo_url || null,
              phone: parentProf.phone || null,
            }
          : undefined,
      };
    });
  }

  /**
   * Student explicitly accepts or rejects a parent connection request.
   * Enforces that only the student receiving the request can accept/reject it.
   */
  static async respondToConnectionRequest(
    studentId: string,
    requestId: string,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; status: 'accepted' | 'rejected' }> {
    const supabase = getAdminSupabase();

    // 1. Fetch request and verify student ownership
    const { data: request, error: fetchErr } = await supabase
      .from('parent_students')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      throw new Error('Connection request not found.');
    }

    if (request.student_id !== studentId) {
      throw new Error('Unauthorized: You can only respond to connection requests sent to you.');
    }

    const currentStatus = this.parseStatus(request);
    if (currentStatus !== 'pending') {
      throw new Error(`This request has already been ${currentStatus}.`);
    }

    const newStatus: 'accepted' | 'rejected' = action === 'accept' ? 'accepted' : 'rejected';
    const cleanLabel = this.parseRelationshipLabel(request.relationship_type);
    const updatedRelType = `${cleanLabel} [status:${newStatus}]`;

    // Try update with status column and encoded label
    try {
      const { error: updateErr } = await supabase
        .from('parent_students')
        .update({
          status: newStatus,
          relationship_type: updatedRelType,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateErr) {
        // Fallback update without status column if schema cache lacks status
        await supabase
          .from('parent_students')
          .update({
            relationship_type: updatedRelType,
            responded_at: new Date().toISOString(),
          })
          .eq('id', requestId);
      }
    } catch (e) {
      console.error('Error updating parent_students:', e);
      throw new Error('Failed to update connection request status.');
    }

    return {
      success: true,
      status: newStatus,
    };
  }

  /**
   * Get all active linked parents for a student.
   */
  static async getStudentLinkedParents(studentId: string): Promise<
    Array<{
      id: string;
      parent_id: string;
      name: string;
      email: string;
      photo_url: string | null;
      relationship_type: string;
      connected_since: string;
    }>
  > {
    const allRequests = await this.getStudentIncomingRequests(studentId);
    return allRequests
      .filter((r) => r.status === 'accepted' && r.parent)
      .map((r) => ({
        id: r.id,
        parent_id: r.parent_id,
        name: r.parent!.name,
        email: r.parent!.email,
        photo_url: r.parent!.photo_url || null,
        relationship_type: r.relationship_type,
        connected_since: r.created_at,
      }));
  }
}
