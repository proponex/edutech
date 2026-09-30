import { createClient } from '@/lib/supabase/client';
import { TeacherService } from '@/lib/teacher-service';
import {
  Profile,
  StudentAcademicProfile,
  ChannelItem,
  UnitItem,
  VideoContentItem,
  QuizItem,
  HomeworkItem,
  ChannelSubscription,
  SubscriptionPackageType,
  ChannelReview,
  StudentContentProgress,
  TeacherMessage,
  ContentProgressStatus,
  StudentRecentLearning,
  SubscribedSubjectProgress,
} from '@/types';

const supabase = createClient();


export const StudentService = {
  // 1. Get Student Profile
  async getStudentProfile(userId: string): Promise<Profile | null> {
    const [{ data: prof, error: profError }, { data: student }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('students').select('*').eq('id', userId).single(),
    ]);

    if (!profError && prof) {
      if (student) {
        return { ...prof, ...student } as Profile;
      }
      return prof as Profile;
    }
    return null;
  },

  // 2. Update Student Profile
  async updateStudentProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const now = new Date().toISOString();
    
    const safeClassId = updates.class_id === '' ? null : updates.class_id;
    const safeBoardId = updates.board_id === '' ? null : updates.board_id;

    // Profiles table fields
    const profUpdates: any = {};
    if (updates.name !== undefined) profUpdates.name = updates.name;
    if (Object.keys(profUpdates).length > 0) profUpdates.updated_at = now;

    // Students table fields
    const studentUpdates: any = {};
    if (updates.name !== undefined) studentUpdates.name = updates.name;
    if (updates.photo_url !== undefined) studentUpdates.photo_url = updates.photo_url;
    if (updates.phone !== undefined) studentUpdates.phone = updates.phone;
    if (updates.parent_phone !== undefined) studentUpdates.parent_phone = updates.parent_phone;
    if (updates.class_id !== undefined) studentUpdates.class_id = safeClassId;
    if (updates.board_id !== undefined) studentUpdates.board_id = safeBoardId;
    if (updates.preferred_language !== undefined) studentUpdates.preferred_language = updates.preferred_language;
    if (Object.keys(studentUpdates).length > 0) studentUpdates.updated_at = now;

    const promises = [];
    if (Object.keys(profUpdates).length > 0) {
      promises.push(supabase.from('profiles').update(profUpdates).eq('id', userId));
    }
    if (Object.keys(studentUpdates).length > 0) {
      promises.push(supabase.from('students').update(studentUpdates).eq('id', userId));
    }

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      for (const res of results) {
        if (res.error) {
          console.error('Supabase update error:', res.error);
          throw new Error(res.error.message);
        }
      }
    }

    return this.getStudentProfile(userId) as Promise<Profile>;
  },

  // 3. Upload Student Avatar (File only)
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `avatars/${userId}-${Date.now()}.${ext}`;

    // Try uploading to 'avatars' or 'channel_media'
    let uploadRes = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    let bucketUsed = 'avatars';

    if (uploadRes.error) {
      uploadRes = await supabase.storage.from('channel_media').upload(filePath, file, { upsert: true });
      bucketUsed = 'channel_media';
    }

    if (!uploadRes.error) {
      const { data } = supabase.storage.from(bucketUsed).getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
    
    throw new Error('Avatar upload failed');
  },

  // 4. Get Current Student Academic Profile
  async getStudentAcademicProfile(userId: string): Promise<StudentAcademicProfile | null> {
    const { data, error } = await supabase
      .from('student_academic_profiles')
      .select(`
        id, student_id, academic_year, class_id, board_id, subject, preferred_language, is_current, created_at, updated_at,
        classes:class_id ( id, name, display_order, is_active ),
        boards:board_id ( id, name, code, display_order, is_active )
      `)
      .eq('student_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return {
        id: data.id,
        student_id: data.student_id,
        academic_year: data.academic_year,
        class_id: data.class_id,
        board_id: data.board_id,
        subject: data.subject,
        preferred_language: data.preferred_language,
        is_current: data.is_current,
        created_at: data.created_at,
        updated_at: data.updated_at,
        class: data.classes as unknown as StudentAcademicProfile['class'],
        board: data.boards as unknown as StudentAcademicProfile['board'],
      };
    }
    
    return null;
  },

  // 5. Get Student Academic History (Timeline)
  async getStudentAcademicHistory(userId: string): Promise<StudentAcademicProfile[]> {
    const { data, error } = await supabase
      .from('student_academic_profiles')
      .select(`
        id, student_id, academic_year, class_id, board_id, subject, preferred_language, is_current, created_at, updated_at,
        classes:class_id ( id, name, display_order, is_active ),
        boards:board_id ( id, name, code, display_order, is_active )
      `)
      .eq('student_id', userId)
      .order('academic_year', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        student_id: d.student_id,
        academic_year: d.academic_year,
        class_id: d.class_id,
        board_id: d.board_id,
        subject: d.subject,
        preferred_language: d.preferred_language,
        is_current: d.is_current,
        created_at: d.created_at,
        updated_at: d.updated_at,
        class: d.classes as unknown as StudentAcademicProfile['class'],
        board: d.boards as unknown as StudentAcademicProfile['board'],
      }));
    }
    
    return [];
  },

  // 6. Save or Update Student Academic Profile
  async saveStudentAcademicProfile(params: {
    studentId: string;
    academicYear?: string;
    classId: string;
    boardId: string;
    subject?: string;
    subjects?: string[];
    preferredLanguage: string;
  }): Promise<StudentAcademicProfile> {
    const year = params.academicYear || '2026–27';
    const profileId = `sap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const allClasses = await TeacherService.getClasses();
    const allBoards = await TeacherService.getBoards();
    const matchingClass = allClasses.find((c) => c.id === params.classId);
    const matchingBoard = allBoards.find((b) => b.id === params.boardId);

    const subjectsList =
      params.subjects && params.subjects.length > 0
        ? params.subjects
        : params.subject
        ? params.subject.split(',').map((s) => s.trim()).filter(Boolean)
        : ['Physics'];
    const primarySubject = subjectsList.join(', ');

    const record: StudentAcademicProfile = {
      id: profileId,
      student_id: params.studentId,
      academic_year: year,
      class_id: params.classId,
      board_id: params.boardId,
      subject: primarySubject,
      subjects: subjectsList,
      preferred_language: params.preferredLanguage,
      is_current: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      class: matchingClass,
      board: matchingBoard,
    };

    // Update user profile record as well
    await this.updateStudentProfile(params.studentId, {
      class_id: params.classId,
      board_id: params.boardId,
      preferred_language: params.preferredLanguage,
      subjects: subjectsList,
    });

    // Mark old records as not current
    await supabase
      .from('student_academic_profiles')
      .update({ is_current: false })
      .eq('student_id', params.studentId);

    // Insert new current profile
    const { data, error } = await supabase
      .from('student_academic_profiles')
      .insert({
        student_id: params.studentId,
        academic_year: year,
        class_id: params.classId || null,
        board_id: params.boardId || null,
        subject: primarySubject,
        preferred_language: params.preferredLanguage,
        is_current: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving academic profile:', error);
      throw error;
    }

    if (data) {
      return {
        ...record,
        id: data.id,
      };
    }

    return record;
  },

  // 7. Dynamic Teacher Channel Discovery (STRICT 4-WAY MAPPING)
  async getMatchingChannels(filters: {
    classId: string;
    boardId?: string;
    subject?: string;
    subjects?: string[];
    language?: string;
  }): Promise<ChannelItem[]> {
    const { classId, boardId, subject, subjects, language } = filters;
    if (!classId) return [];

    const allClasses = await TeacherService.getClasses();
    const allBoards = await TeacherService.getBoards();

    // 1. Fetch all real active channels from Supabase and local store
    let channels: ChannelItem[] = [];

    const { data, error } = await supabase
      .from('channels')
      .select(`
        id, teacher_id, class_id, name, description, photo_url, is_active, created_at, updated_at,
        channel_classes ( class_id ),
        channel_boards ( board_id ),
        channel_specializations ( subject_name ),
        channel_languages ( language )
      `)
      .eq('is_active', true);

    if (!error && data && data.length > 0) {
      channels = data.map((raw) => {
        const primaryClassId = raw.class_id || raw.channel_classes?.[0]?.class_id || '';
        const singleClass = allClasses.find((c) => c.id === primaryClassId);
        const chBoardIds = (raw.channel_boards || []).map((b) => b.board_id);

        return {
          id: raw.id,
          teacher_id: raw.teacher_id,
          class_id: primaryClassId,
          class: singleClass,
          name: raw.name,
          description: raw.description,
          photo_url: raw.photo_url,
          is_active: raw.is_active,
          created_at: raw.created_at,
          updated_at: raw.updated_at,
          classes: singleClass ? [singleClass] : [],
          boards: allBoards.filter((b) => chBoardIds.includes(b.id)),
          specializations: (raw.channel_specializations || []).map((s) => s.subject_name),
          languages: (raw.channel_languages || []).map((l) => l.language),
        };
      });
    }

    const allRealChannels = channels;

    // 2. STRICT 4-WAY FILTERING RULE
    const matching = allRealChannels.filter((ch) => {
      // Filter A: Class ID
      const chClassId = ch.class_id || ch.class?.id || ch.classes?.[0]?.id;
      // Compare either directly by id or by normalized class name
      const targetClass = allClasses.find((c) => c.id === classId);
      const isClassMatch =
        chClassId === classId ||
        (targetClass && ch.class?.name?.toLowerCase() === targetClass.name.toLowerCase());

      if (!isClassMatch) return false;

      // Filter B: Board ID (if provided)
      if (boardId) {
        const targetBoard = allBoards.find((b) => b.id === boardId);
        const hasMatchingBoard = (ch.boards || []).some(
          (b) =>
            b.id === boardId ||
            (targetBoard && (b.name.toLowerCase() === targetBoard.name.toLowerCase() || b.code === targetBoard.code))
        );
        if (!hasMatchingBoard) return false;
      }

      // Filter C: Subject / Multi-Subjects
      if (subject && subject.trim() !== '') {
        const subNorm = subject.trim().toLowerCase();
        const hasMatchingSubject = (ch.specializations || []).some((spec) => {
          const specNorm = spec.trim().toLowerCase();
          return specNorm === subNorm || specNorm.includes(subNorm) || subNorm.includes(specNorm);
        });
        if (!hasMatchingSubject) return false;
      } else if (subjects && subjects.length > 0) {
        const subListNorm = subjects.map((s) => s.trim().toLowerCase());
        const hasAnyMatchingSubject = (ch.specializations || []).some((spec) => {
          const specNorm = spec.trim().toLowerCase();
          return subListNorm.some(
            (target) => specNorm === target || specNorm.includes(target) || target.includes(specNorm)
          );
        });
        if (!hasAnyMatchingSubject) return false;
      }

      // Filter D: Preferred Language (HARD FILTER)
      if (language && language.trim() !== '') {
        const langNorm = language.trim().toLowerCase();
        const hasMatchingLang = (ch.languages || []).some(
          (l) => l.trim().toLowerCase() === langNorm
        );
        if (!hasMatchingLang) return false;
      }

      return true;
    });

    // 3. Attach real subscribers_count, rating, and reviews from database
    const populated = await Promise.all(
      matching.map(async (ch) => {
        let subCount = 0;
        let avgRating = 5.0;
        let revCount = 0;

        const { count } = await supabase
          .from('channel_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .eq('status', 'active');
        if (count !== null && count !== undefined) {
          subCount = count;
        }

        const { data: revs } = await supabase
          .from('channel_reviews')
          .select('rating')
          .eq('channel_id', ch.id);

        if (revs && revs.length > 0) {
          revCount = revs.length;
          const sum = revs.reduce((acc, r) => acc + Number(r.rating || 5), 0);
          avgRating = parseFloat((sum / revs.length).toFixed(1));
        }

        return {
          ...ch,
          subscribers_count: subCount,
          rating: avgRating,
          review_count: revCount,
        };
      })
    );

    return populated;
  },

  // 8. Get Full Public Channel Details for Student
  async getChannelDetails(channelId: string): Promise<{
    channel: ChannelItem;
    teacher: Profile | null;
    units: UnitItem[];
    demoVideo: VideoContentItem | null;
    videos: VideoContentItem[];
    quizzes: QuizItem[];
    homework: HomeworkItem[];
    subscriberCount: number;
    reviews: ChannelReview[];
    rating: number | null;
  } | null> {
    const channel = await TeacherService.getChannelById(channelId);
    if (!channel) return null;

    // Teacher profile
    let teacher: Profile | null = null;
    try {
      const [{ data: prof }, { data: tData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', channel.teacher_id).single(),
        supabase.from('teachers').select('*').eq('id', channel.teacher_id).single(),
      ]);
      if (prof) teacher = { ...prof, ...(tData || {}) } as Profile;
    } catch {
      // Fallback
    }

    // Units created by this teacher for this channel
    const units = await TeacherService.getUnits(channelId);

    // Published content only
    const [allVideos, allQuizzes, allHomework] = await Promise.all([
      TeacherService.getChannelVideos(channelId),
      TeacherService.getChannelQuizzes(channelId),
      TeacherService.getChannelHomework(channelId),
    ]);

    const publishedVideos = allVideos.filter((v: VideoContentItem) => v.is_published);
    const demoVideo = publishedVideos.find((v: VideoContentItem) => v.is_demo) || null;
    const publishedQuizzes = allQuizzes.filter((q: QuizItem) => q.is_published);
    const publishedHomework = allHomework.filter((h: HomeworkItem) => h.is_published);

    // Subscriber count (from channel_subscriptions)
    let subscriberCount = 0;
    const { count, error: subError } = await supabase
      .from('channel_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .eq('status', 'active');
    if (!subError && count !== null) {
      subscriberCount = count;
    }

    // Reviews (from channel_reviews)
    let reviews: ChannelReview[] = [];
    const { data: revData, error: revError } = await supabase
      .from('channel_reviews')
      .select(`
        id, channel_id, student_id, rating, review_text, created_at,
        student:student_id ( name, photo_url )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (!revError && revData && revData.length > 0) {
      reviews = revData.map((r) => {
        const studentProfile = r.student as unknown as { name?: string; photo_url?: string } | null;
        return {
          id: r.id,
          channel_id: r.channel_id,
          student_id: r.student_id,
          rating: Number(r.rating),
          review_text: r.review_text,
          created_at: r.created_at,
          student_name: studentProfile?.name || 'Student',
          student_photo_url: studentProfile?.photo_url || null,
        };
      });
    }

    const rating =
      reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
        : null;

    return {
      channel,
      teacher,
      units,
      demoVideo,
      videos: publishedVideos,
      quizzes: publishedQuizzes,
      homework: publishedHomework,
      subscriberCount,
      reviews,
      rating,
    };
  },

  // 9. Check Subscription
  async getSubscription(studentId: string, channelId: string): Promise<ChannelSubscription | null> {
    const { data, error } = await supabase
      .from('channel_subscriptions')
      .select('*')
      .eq('student_id', studentId)
      .eq('channel_id', channelId)
      .eq('status', 'active')
      .maybeSingle();

    if (!error && data) {
      return data as ChannelSubscription;
    }
    return null;
  },

  // 10. Subscribe to Package
  async subscribeToPackage(params: {
    studentId: string;
    channelId: string;
    packageType: SubscriptionPackageType;
    classId?: string;
    subjectName?: string;
  }): Promise<ChannelSubscription> {
    const { data, error } = await supabase
      .from('channel_subscriptions')
      .insert({
        student_id: params.studentId,
        channel_id: params.channelId,
        package_type: params.packageType,
        class_id: params.classId || null,
        subject_name: params.subjectName || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error subscribing to package:', error);
      throw error;
    }

    return data as ChannelSubscription;
  },

  // ==============================================================================
  // PHASE 5.1: STUDENT PROGRESS TRACKING & TEACHER MESSAGES
  // ==============================================================================

  async getStudentProgress(studentId: string, channelId: string): Promise<{
    overall: { total: number; completed: number; percentage: number };
    bySubject: Record<string, { total: number; completed: number; percentage: number }>;
    progressMap: Record<string, ContentProgressStatus>;
  }> {
    // 1. Gather all content in this channel
    const [videos, quizzes, hw] = await Promise.all([
      TeacherService.getChannelVideos(channelId),
      TeacherService.getChannelQuizzes(channelId),
      TeacherService.getChannelHomework(channelId),
    ]);

    const allItems = [
      ...videos.map((v: VideoContentItem) => ({ id: v.id, subject: v.subject_name || 'General' })),
      ...quizzes.map((q: QuizItem) => ({ id: q.id, subject: q.subject_name || 'General' })),
      ...hw.map((h: HomeworkItem) => ({ id: h.id, subject: h.subject_name || 'General' })),
    ];

    // 2. Fetch progress records
    let progressRecords: StudentContentProgress[] = [];
    const { data, error } = await supabase
      .from('student_content_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('channel_id', channelId);

    if (!error && data) {
      progressRecords = data as StudentContentProgress[];
    }

    const progressMap: Record<string, ContentProgressStatus> = {};
    progressRecords.forEach(p => {
      progressMap[p.content_id] = p.status;
    });

    // 3. Compute overall & subject breakdown
    const total = allItems.length;
    let completed = 0;
    const bySubject: Record<string, { total: number; completed: number; percentage: number }> = {};

    allItems.forEach(item => {
      if (!bySubject[item.subject]) {
        bySubject[item.subject] = { total: 0, completed: 0, percentage: 0 };
      }
      bySubject[item.subject].total += 1;

      if (progressMap[item.id] === 'completed') {
        completed += 1;
        bySubject[item.subject].completed += 1;
      }
    });

    Object.keys(bySubject).forEach(subj => {
      const s = bySubject[subj];
      s.percentage = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      overall: { total, completed, percentage },
      bySubject,
      progressMap,
    };
  },

  async updateContentProgress(params: {
    studentId: string;
    channelId: string;
    contentType: 'video' | 'quiz' | 'homework';
    contentId: string;
    status: ContentProgressStatus;
    watchedSeconds?: number;
    progressPercent?: number;
  }): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabase.from('student_content_progress').upsert({
      student_id: params.studentId,
      channel_id: params.channelId,
      content_type: params.contentType,
      content_id: params.contentId,
      status: params.status,
      watched_seconds: params.watchedSeconds,
      progress_percent: params.progressPercent,
      updated_at: now,
    }, { onConflict: 'student_id,channel_id,content_type,content_id' });

    if (error) {
      console.error('Error updating content progress:', error);
    }
  },

  async getSingleContentProgress(studentId: string, contentId: string, contentType: 'video' | 'quiz' | 'homework'): Promise<StudentContentProgress | null> {
    const { data, error } = await supabase
      .from('student_content_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .maybeSingle();

    if (error) {
      console.error('Error getting single content progress:', error);
      return null;
    }
    return data as StudentContentProgress | null;
  },

  async getVideoById(videoId: string): Promise<VideoContentItem | null> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    
    if (error || !data) return null;
    return data as VideoContentItem;
  },

  async getMessagesFromTeacher(studentId: string, channelId: string): Promise<TeacherMessage[]> {
    const { data, error } = await supabase
      .from('teacher_messages')
      .select('*')
      .eq('channel_id', channelId)
      .or(`student_id.eq.${studentId},student_id.is.null`)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as TeacherMessage[];
    }
    
    return [];
  },

  async markMessageCompleted(messageId: string): Promise<boolean> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('teacher_messages')
      .update({ status: 'completed', completed_at: now })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message completed:', error);
      return false;
    }

    return true;
  },

  // ==============================================================================
  // PHASE 5.3: ACTIVE SUBSCRIPTIONS, RECENT LEARNING & CHANNEL ANALYSIS
  // ==============================================================================

  async getStudentActiveSubscriptions(studentId: string): Promise<{
    subscription: ChannelSubscription;
    channel: ChannelItem | null;
    teacher: Profile | null;
    progress: { total: number; completed: number; percentage: number };
  }[]> {
    try {
      const { data, error } = await supabase
        .from('channel_subscriptions')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return [];
      }

      const results = await Promise.all(
        data.map(async (sub) => {
          const ch = await TeacherService.getChannelById(sub.channel_id);
          let teacher: Profile | null = null;
          if (ch?.teacher_id) {
            try {
              const [{ data: tProf }, { data: tData }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', ch.teacher_id).single(),
                supabase.from('teachers').select('*').eq('id', ch.teacher_id).single(),
              ]);
              if (tProf) teacher = { ...tProf, ...(tData || {}) } as Profile;
            } catch {
              // Ignore
            }
          }

          const prog = await this.getStudentProgress(studentId, sub.channel_id);
          return {
            subscription: sub as ChannelSubscription,
            channel: ch,
            teacher,
            progress: prog.overall,
          };
        })
      );

      return results;
    } catch (err) {
      console.error('Error getting student active subscriptions:', err);
      return [];
    }
  },

  async getStudentRecentLearning(studentId: string): Promise<StudentRecentLearning | null> {
    try {
      const subs = await this.getStudentActiveSubscriptions(studentId);
      if (subs.length === 0) return null;

      // Pick the most recent subscription
      const recent = subs[0];
      if (!recent.channel) return null;

      const ch = recent.channel;
      const prog = recent.progress;

      return {
        channelId: ch.id,
        channelName: ch.name,
        channelDescription: ch.description || '',
        channelPhotoUrl: ch.photo_url || null,
        className: ch.class?.name || (ch.classes && ch.classes[0]?.name) || '',
        subjectName: recent.subscription.subject_name || (ch.specializations && ch.specializations[0]) || '',
        teacherName: recent.teacher?.name || 'Educator',
        teacherPhotoUrl: recent.teacher?.photo_url || null,
        teacherEmail: recent.teacher?.email || '',
        overallPercentage: prog.percentage,
        totalItems: prog.total,
        completedItems: prog.completed,
      };
    } catch (err) {
      console.error('Error fetching student recent learning:', err);
      return null;
    }
  },

  async getStudentSubscribedSubjectsAnalysis(studentId: string): Promise<SubscribedSubjectProgress[]> {
    try {
      const subs = await this.getStudentActiveSubscriptions(studentId);
      if (subs.length === 0) return [];

      const analysisList: SubscribedSubjectProgress[] = [];

      for (const item of subs) {
        if (!item.channel) continue;
        const ch = item.channel;
        const prog = await this.getStudentProgress(studentId, ch.id);

        if (Object.keys(prog.bySubject).length > 0) {
          for (const [subj, data] of Object.entries(prog.bySubject)) {
            // If the subscription is for a specific subject, only include that subject
            if (item.subscription.package_type === 'class_subject' && item.subscription.subject_name) {
              if (subj.toLowerCase() !== item.subscription.subject_name.toLowerCase()) {
                continue;
              }
            }
            analysisList.push({
              channelId: ch.id,
              channelName: ch.name,
              subjectName: subj,
              percentage: data.percentage,
              totalItems: data.total,
              completedItems: data.completed,
            });
          }
        } else {
          // If no content breakdown by subject yet, show primary specialization or package subject
          const subjName = item.subscription.subject_name || (ch.specializations && ch.specializations[0]) || 'General';
          analysisList.push({
            channelId: ch.id,
            channelName: ch.name,
            subjectName: subjName,
            percentage: prog.overall.percentage,
            totalItems: prog.overall.total,
            completedItems: prog.overall.completed,
          });
        }
      }

      return analysisList;
    } catch (err) {
      console.error('Error fetching student subject analysis:', err);
      return [];
    }
  },

  // ==============================================================================
  // QUIZ ATTEMPTS
  // ==============================================================================
  async submitQuizAttempt(params: {
    studentId: string;
    quizId: string;
    score: number;
    totalMarks: number;
    correctCount: number;
    wrongCount: number;
    timeTakenSeconds: number;
    answers: Record<string, string>; // questionId -> optionId
  }): Promise<boolean> {
    const { error } = await supabase.from('student_quiz_attempts').insert({
      student_id: params.studentId,
      quiz_id: params.quizId,
      score: params.score,
      total_marks: params.totalMarks,
      correct_count: params.correctCount,
      wrong_count: params.wrongCount,
      time_taken_seconds: params.timeTakenSeconds,
      answers: params.answers,
      is_completed: true,
    });

    if (error) {
      console.error('Error submitting quiz attempt:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to submit: ${error.message || 'Unknown DB error'}`);
    }
    return true;
  },

  async getQuizAttempt(studentId: string, quizId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching quiz attempt:', JSON.stringify(error, null, 2));
      return null;
    }
    return data || null;
  },

  async getQuizDetails(quizId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id, quiz_id, question_text, marks, display_order,
          quiz_options (
            id, question_id, option_text, is_correct, display_order
          )
        )
      `)
      .eq('id', quizId)
      .single();

    if (error) {
      console.error('Error fetching quiz details:', error);
      return null;
    }

    if (data) {
      // Map to proper structure
      const qz = data as any;
      qz.questions = (qz.quiz_questions || []).map((qq: any) => ({
        ...qq,
        options: qq.quiz_options || []
      })).sort((a: any, b: any) => a.display_order - b.display_order);
      
      qz.questions.forEach((q: any) => {
        q.options.sort((a: any, b: any) => a.display_order - b.display_order);
      });
      return qz;
    }
    return null;
  }
};
