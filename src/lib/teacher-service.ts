import { createClient } from '@/lib/supabase/client';
import {
  BoardItem,
  ClassItem,
  ReferenceSubjectItem,
  UnitItem,
  ChannelItem,
  VideoContentItem,
  QuizItem,
  HomeworkItem,
  TeacherDashboardStats,
  ChannelStudentInfo,
  TeacherMessage,
  StudentContentProgress,
  ChannelSubscription,
  Profile,
} from '@/types';

const supabase = createClient();

// ==============================================================================
// DEFAULT ACADEMIC REFERENCE DATA (FALLBACK & SEED)
// ==============================================================================

export const DEFAULT_BOARDS: BoardItem[] = [
  { id: 'b-tn', name: 'Tamil Nadu State Board', code: 'TN_STATE', display_order: 1, is_active: true },
  { id: 'b-cbse', name: 'CBSE', code: 'CBSE', display_order: 2, is_active: true },
  { id: 'b-icse', name: 'ICSE', code: 'ICSE', display_order: 3, is_active: true },
  { id: 'b-ib', name: 'IB (International Baccalaureate)', code: 'IB', display_order: 4, is_active: true },
  { id: 'b-other', name: 'Other State / National Board', code: 'OTHER', display_order: 5, is_active: true },
];

export const DEFAULT_SUBJECTS: ReferenceSubjectItem[] = [
  { id: 's-eng', name: 'English', slug: 'english', display_order: 1, is_active: true },
  { id: 's-tam', name: 'Tamil', slug: 'tamil', display_order: 2, is_active: true },
  { id: 's-mat', name: 'Mathematics', slug: 'mathematics', display_order: 3, is_active: true },
  { id: 's-sci', name: 'Science', slug: 'science', display_order: 4, is_active: true },
  { id: 's-soc', name: 'Social Science', slug: 'social-science', display_order: 5, is_active: true },
  { id: 's-phy', name: 'Physics', slug: 'physics', display_order: 6, is_active: true },
  { id: 's-che', name: 'Chemistry', slug: 'chemistry', display_order: 7, is_active: true },
  { id: 's-bio', name: 'Biology', slug: 'biology', display_order: 8, is_active: true },
  { id: 's-cs', name: 'Computer Science', slug: 'computer-science', display_order: 9, is_active: true },
  { id: 's-hin', name: 'Hindi', slug: 'hindi', display_order: 10, is_active: true },
  { id: 's-acc', name: 'Accountancy', slug: 'accountancy', display_order: 11, is_active: true },
  { id: 's-eco', name: 'Economics', slug: 'economics', display_order: 12, is_active: true },
  { id: 's-bs', name: 'Business Studies', slug: 'business-studies', display_order: 13, is_active: true },
  { id: 's-his', name: 'History', slug: 'history', display_order: 14, is_active: true },
  { id: 's-geo', name: 'Geography', slug: 'geography', display_order: 15, is_active: true },
];

export const DEFAULT_LANGUAGES = [
  'Tamil',
  'English',
  'Hindi',
  'Malayalam',
  'Telugu',
  'Kannada',
];

export const DEFAULT_CLASSES: ClassItem[] = [
  { id: 'c-kg', name: 'Kindergarten', slug: 'kindergarten', display_order: 0, is_active: true },
  { id: 'c-1', name: 'Class 1', slug: 'class-1', display_order: 1, is_active: true },
  { id: 'c-2', name: 'Class 2', slug: 'class-2', display_order: 2, is_active: true },
  { id: 'c-3', name: 'Class 3', slug: 'class-3', display_order: 3, is_active: true },
  { id: 'c-4', name: 'Class 4', slug: 'class-4', display_order: 4, is_active: true },
  { id: 'c-5', name: 'Class 5', slug: 'class-5', display_order: 5, is_active: true },
  { id: 'c-6', name: 'Class 6', slug: 'class-6', display_order: 6, is_active: true },
  { id: 'c-7', name: 'Class 7', slug: 'class-7', display_order: 7, is_active: true },
  { id: 'c-8', name: 'Class 8', slug: 'class-8', display_order: 8, is_active: true },
  { id: 'c-9', name: 'Class 9', slug: 'class-9', display_order: 9, is_active: true },
  { id: 'c-10', name: 'Class 10', slug: 'class-10', display_order: 10, is_active: true },
  { id: 'c-11', name: 'Class 11', slug: 'class-11', display_order: 11, is_active: true },
  { id: 'c-12', name: 'Class 12', slug: 'class-12', display_order: 12, is_active: true },
];


// ==============================================================================
// TEACHER SERVICE IMPLEMENTATION
// ==============================================================================

interface RawChannelData {
  id: string;
  teacher_id: string;
  class_id?: string;
  name: string;
  description: string;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  channel_classes?: Array<{ class_id: string }>;
  channel_boards?: Array<{ board_id: string }>;
  channel_specializations?: Array<{ subject_name: string }>;
  channel_languages?: Array<{ language: string }>;
}

export const TeacherService = {
  // 1. Boards
  async getBoards(): Promise<BoardItem[]> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as BoardItem[];
      }
    } catch {
      // Fallback
    }
    return DEFAULT_BOARDS;
  },

  // 2. Reference Subjects
  async getReferenceSubjects(): Promise<ReferenceSubjectItem[]> {
    try {
      const { data, error } = await supabase
        .from('reference_subjects')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as ReferenceSubjectItem[];
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SUBJECTS;
  },

  // 3. Classes
  async getClasses(): Promise<ClassItem[]> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as ClassItem[];
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CLASSES;
  },

  // 4. Units (Teacher & Channel Owned — NO default syllabus)
  async getUnits(channelId: string, subjectName?: string): Promise<UnitItem[]> {
    let query = supabase
      .from('units')
      .select('*')
      .eq('channel_id', channelId);

    if (subjectName) {
      query = query.eq('subject_name', subjectName);
    }

    const { data, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as UnitItem[];
    }
    return [];
  },

  async createUnit(params: {
    channelId: string;
    teacherId: string;
    classId: string;
    boardId?: string;
    subjectName: string;
    title: string;
    description?: string | null;
    unitNumber?: number | null;
  }): Promise<UnitItem> {
    const { data: createdUnit, error } = await supabase.from('units').insert({
      channel_id: params.channelId,
      teacher_id: params.teacherId,
      class_id: params.classId,
      board_id: params.boardId || null,
      subject_name: params.subjectName,
      unit_number: params.unitNumber || null,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      display_order: params.unitNumber || 1,
    }).select().single();
    
    if (error) {
      console.error('Error creating unit:', error);
      throw error;
    }

    return {
      ...createdUnit,
      topics: [],
    } as UnitItem;
  },

  async deleteUnit(unitId: string): Promise<boolean> {
    const { error } = await supabase.from('videos').delete().eq('unit_id', unitId);
    if (error) console.error('Error deleting videos:', error);

    const { data: qList } = await supabase.from('quizzes').select('id').eq('unit_id', unitId);
    if (qList && qList.length > 0) {
      const qIds = qList.map(q => q.id);
      const { data: quesList } = await supabase.from('quiz_questions').select('id').in('quiz_id', qIds);
      if (quesList && quesList.length > 0) {
        const quesIds = quesList.map(qq => qq.id);
        await supabase.from('quiz_options').delete().in('question_id', quesIds);
        await supabase.from('quiz_questions').delete().in('quiz_id', qIds);
      }
      await supabase.from('quizzes').delete().eq('unit_id', unitId);
    }

    await supabase.from('homework').delete().eq('unit_id', unitId);
    await supabase.from('units').delete().eq('id', unitId);

    return true;
  },

  // Backward-compatibility alias returning empty array when no units exist
  async getCurriculum(classId: string, boardId: string, subjectName: string): Promise<UnitItem[]> {
    try {
      const { data: unitsData, error: uErr } = await supabase
        .from('units')
        .select('*')
        .eq('class_id', classId)
        .eq('board_id', boardId)
        .eq('subject_name', subjectName)
        .order('display_order', { ascending: true });

      if (!uErr && unitsData && unitsData.length > 0) {
        return unitsData as unknown as UnitItem[];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  // Helper: Get real content counts for a channel
  async getChannelContentCounts(channelId: string): Promise<{ videos: number; quizzes: number; homework: number }> {
    let vCount = 0;
    let qCount = 0;
    let hCount = 0;

    try {
      const [videosRes, quizzesRes, hwRes] = await Promise.all([
        supabase.from('videos').select('id', { count: 'exact', head: true }).eq('channel_id', channelId),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('channel_id', channelId),
        supabase.from('homework').select('id', { count: 'exact', head: true }).eq('channel_id', channelId),
      ]);

      if (videosRes.count !== null && !videosRes.error) vCount = videosRes.count;
      if (quizzesRes.count !== null && !quizzesRes.error) qCount = quizzesRes.count;
      if (hwRes.count !== null && !hwRes.error) hCount = hwRes.count;
    } catch {
      // Ignore
    }

    return {
      videos: vCount,
      quizzes: qCount,
      homework: hCount,
    };
  },

  // 5. Teacher Channels List
  async getTeacherChannels(teacherId: string): Promise<ChannelItem[]> {
    const { data, error } = await supabase
      .from('channels')
      .select(`
        id, teacher_id, class_id, name, description, photo_url, is_active, created_at, updated_at,
        channel_classes ( class_id ),
        channel_boards ( board_id ),
        channel_specializations ( subject_name ),
        channel_languages ( language )
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const classes = await this.getClasses();
      const boards = await this.getBoards();

      const channelsList = await Promise.all(
        (data as unknown as RawChannelData[]).map(async (ch) => {
          const primaryClassId = ch.class_id || ch.channel_classes?.[0]?.class_id || '';
          const singleClass = classes.find(c => c.id === primaryClassId);
          const boardIds = (ch.channel_boards || []).map((cb) => cb.board_id);
          const counts = await this.getChannelContentCounts(ch.id);

          return {
            id: ch.id,
            teacher_id: ch.teacher_id,
            class_id: primaryClassId,
            class: singleClass,
            name: ch.name,
            description: ch.description,
            photo_url: ch.photo_url,
            is_active: ch.is_active,
            created_at: ch.created_at,
            updated_at: ch.updated_at,
            classes: singleClass ? [singleClass] : [],
            boards: boards.filter(b => boardIds.includes(b.id)),
            specializations: (ch.channel_specializations || []).map((s) => s.subject_name),
            languages: (ch.channel_languages || []).map((l) => l.language),
            content_counts: counts,
          };
        })
      );
      return channelsList;
    }
    
    return [];
  },

  // 6. Channel by ID
  async getChannelById(channelId: string): Promise<ChannelItem | null> {
    const { data, error } = await supabase
      .from('channels')
      .select(`
        id, teacher_id, class_id, name, description, photo_url, is_active, created_at, updated_at,
        channel_classes ( class_id ),
        channel_boards ( board_id ),
        channel_specializations ( subject_name ),
        channel_languages ( language )
      `)
      .eq('id', channelId)
      .single();

    if (!error && data) {
      const raw = data as unknown as RawChannelData;
      const classes = await this.getClasses();
      const boards = await this.getBoards();
      const primaryClassId = raw.class_id || raw.channel_classes?.[0]?.class_id || '';
      const singleClass = classes.find(c => c.id === primaryClassId);
      const boardIds = (raw.channel_boards || []).map((cb) => cb.board_id);
      const counts = await this.getChannelContentCounts(raw.id);

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
        boards: boards.filter(b => boardIds.includes(b.id)),
        specializations: (raw.channel_specializations || []).map((s) => s.subject_name),
        languages: (raw.channel_languages || []).map((l) => l.language),
        content_counts: counts,
      };
    }
    return null;
  },

  // 7. Create Channel (ONE CHANNEL = EXACTLY ONE CLASS)
  async createChannel(params: {
    teacherId: string;
    name: string;
    description: string;
    photoUrl?: string | null;
    classId?: string;
    classIds?: string[];
    boardIds: string[];
    specializations: string[];
    languages: string[];
  }): Promise<ChannelItem> {
    const channelId = `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const targetClassId = params.classId || params.classIds?.[0] || '';

    const allClasses = await this.getClasses();
    const allBoards = await this.getBoards();
    const singleClass = allClasses.find(c => c.id === targetClassId);

    const newChannelRecord: ChannelItem = {
      id: channelId,
      teacher_id: params.teacherId,
      class_id: targetClassId,
      class: singleClass,
      name: params.name,
      description: params.description,
      photo_url: params.photoUrl || null,
      is_active: true,
      created_at: now,
      updated_at: now,
      classes: singleClass ? [singleClass] : [],
      boards: allBoards.filter(b => params.boardIds.includes(b.id)),
      specializations: params.specializations,
      languages: params.languages,
      content_counts: { videos: 0, quizzes: 0, homework: 0 }
    };

    const { data, error } = await supabase
      .from('channels')
      .insert({
        teacher_id: params.teacherId,
        class_id: targetClassId || null,
        name: params.name,
        description: params.description,
        photo_url: params.photoUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating channel:', error);
      throw error;
    }

    if (data) {
      const realChannelId = data.id;
      
      // Insert single class junction record (or none if empty)
      if (targetClassId) {
        await supabase.from('channel_classes').insert({
          channel_id: realChannelId,
          class_id: targetClassId
        });
      }
      if (params.boardIds.length > 0) {
        await supabase.from('channel_boards').insert(
          params.boardIds.map(bid => ({ channel_id: realChannelId, board_id: bid }))
        );
      }
      if (params.specializations.length > 0) {
        await supabase.from('channel_specializations').insert(
          params.specializations.map(s => ({ channel_id: realChannelId, subject_name: s }))
        );
      }
      if (params.languages.length > 0) {
        await supabase.from('channel_languages').insert(
          params.languages.map(l => ({ channel_id: realChannelId, language: l }))
        );
      }
      
      return {
        ...newChannelRecord,
        id: realChannelId
      };
    }

    return newChannelRecord;
  },

  // ============================================================================
  // CONTENT QUERIES & MUTATIONS
  // ============================================================================

  // Videos
  async getChannelVideos(channelId: string): Promise<VideoContentItem[]> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as VideoContentItem[];
    }
    return [];
  },

  async createVideo(params: Omit<VideoContentItem, 'id' | 'created_at' | 'updated_at'>): Promise<VideoContentItem> {
    // Build insert record with only the DB columns (strip populated relation fields)
    const dbRecord: Record<string, unknown> = {
      channel_id: params.channel_id,
      class_id: params.class_id,
      board_id: params.board_id,
      subject_name: params.subject_name,
      unit_id: params.unit_id,
      topic_id: params.topic_id,
      sub_topic_id: params.sub_topic_id,
      scope: params.scope,
      title: params.title,
      description: params.description,
      thumbnail_url: params.thumbnail_url,
      video_url: params.video_url,
      duration_seconds: params.duration_seconds,
      is_demo: params.is_demo,
      is_published: params.is_published,
    };

    // Include Mux fields if provided
    if (params.mux_upload_id !== undefined) dbRecord.mux_upload_id = params.mux_upload_id;
    if (params.mux_asset_id !== undefined) dbRecord.mux_asset_id = params.mux_asset_id;
    if (params.mux_playback_id !== undefined) dbRecord.mux_playback_id = params.mux_playback_id;
    if (params.mux_duration !== undefined) dbRecord.mux_duration = params.mux_duration;
    if (params.mux_status !== undefined) dbRecord.mux_status = params.mux_status;

    // Let Supabase auto-generate the UUID, then return the full row
    const { data, error } = await supabase.from('videos').insert(dbRecord).select().single();
    if (error) {
      console.error('Error creating video:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(error.message || 'Failed to save video record.');
    }

    return data as VideoContentItem;
  },

  // Mux Helper: Update mux_upload_id on an existing video
  async updateVideoMuxUploadId(videoId: string, muxUploadId: string): Promise<void> {
    const { error } = await supabase
      .from('videos')
      .update({ mux_upload_id: muxUploadId, updated_at: new Date().toISOString() })
      .eq('id', videoId);
    if (error) console.error('Error updating mux_upload_id:', error);
  },

  // Mux Helper: Update mux_status on an existing video
  async updateVideoMuxStatus(videoId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('videos')
      .update({ mux_status: status, updated_at: new Date().toISOString() })
      .eq('id', videoId);
    if (error) console.error('Error updating mux_status:', error);
  },

  // Mux Helper: Get a single video by ID
  async getVideoById(videoId: string): Promise<VideoContentItem | null> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    if (error || !data) return null;
    return data as VideoContentItem;
  },

  // Quizzes
  async getChannelQuizzes(channelId: string): Promise<QuizItem[]> {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        id, channel_id, class_id, board_id, subject_name, unit_id, topic_id, sub_topic_id,
        scope, title, description, time_limit_minutes, total_marks, is_published, created_at, updated_at,
        quiz_questions (
          id, quiz_id, question_text, marks, display_order,
          quiz_options (
            id, option_text, is_correct, display_order
          )
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return (data as unknown as QuizItem[]).map((q) => ({
        ...q,
        questions: ((q as unknown as { quiz_questions?: Array<{ id?: string; quiz_id?: string; question_text: string; marks: number; display_order: number; quiz_options?: Array<{ id?: string; option_text: string; is_correct: boolean; display_order: number }> }> }).quiz_questions || []).map((qq) => ({
          ...qq,
          options: qq.quiz_options || []
        }))
      }));
    }
    return [];
  },

  async createQuiz(params: Omit<QuizItem, 'id' | 'created_at' | 'updated_at'>): Promise<QuizItem> {
    const { data, error } = await supabase.from('quizzes').insert({
      channel_id: params.channel_id,
      class_id: params.class_id,
      board_id: params.board_id,
      subject_name: params.subject_name,
      unit_id: params.unit_id,
      topic_id: params.topic_id,
      sub_topic_id: params.sub_topic_id,
      scope: params.scope,
      title: params.title,
      description: params.description,
      time_limit_minutes: params.time_limit_minutes,
      total_marks: params.total_marks,
      is_published: params.is_published,
    }).select().single();

    if (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }

    if (data && params.questions && params.questions.length > 0) {
      for (const [qIdx, q] of params.questions.entries()) {
        const { data: qData } = await supabase.from('quiz_questions').insert({
          quiz_id: data.id,
          question_text: q.question_text,
          marks: q.marks,
          display_order: qIdx + 1,
        }).select().single();

        if (qData && q.options && q.options.length > 0) {
          await supabase.from('quiz_options').insert(
            q.options.map((opt, oIdx) => ({
              question_id: qData.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct,
              display_order: oIdx + 1
            }))
          );
        }
      }
    }

    return { ...params, id: data.id, created_at: data.created_at, updated_at: data.updated_at } as QuizItem;
  },

  // Homework
  async getChannelHomework(channelId: string): Promise<HomeworkItem[]> {
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as HomeworkItem[];
    }
    return [];
  },

  async createHomework(params: Omit<HomeworkItem, 'id' | 'created_at' | 'updated_at'>): Promise<HomeworkItem> {
    const { data, error } = await supabase.from('homework').insert({
      channel_id: params.channel_id,
      class_id: params.class_id,
      board_id: params.board_id,
      subject_name: params.subject_name,
      unit_id: params.unit_id,
      topic_id: params.topic_id,
      sub_topic_id: params.sub_topic_id,
      scope: params.scope,
      title: params.title,
      instructions: params.instructions,
      tasks: params.tasks,
      marks: params.marks,
      due_date: params.due_date,
      attachment_url: params.attachment_url,
      is_published: params.is_published,
    }).select().single();

    if (error) {
      console.error('Error creating homework:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(error.message || 'Failed to save homework record.');
    }

    return data as HomeworkItem;
  },

  // Content Delete (with Mux asset cleanup for videos)
  async deleteContent(type: 'video' | 'quiz' | 'homework', id: string): Promise<boolean> {
    // If deleting a video, also delete the Mux asset
    if (type === 'video') {
      try {
        const video = await this.getVideoById(id);
        if (video?.mux_asset_id) {
          // Call our server-side API to delete the Mux asset
          await fetch('/api/mux/delete-asset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mux_asset_id: video.mux_asset_id }),
          });
        }
      } catch (muxErr) {
        console.warn('Could not delete Mux asset:', muxErr);
      }
    }

    const tableMap = {
      video: 'videos',
      quiz: 'quizzes',
      homework: 'homework'
    };
    const { error } = await supabase.from(tableMap[type]).delete().eq('id', id);
    if (error) console.error(`Error deleting ${type}:`, error);

    return true;
  },

  // Toggle publish
  async togglePublish(type: 'video' | 'quiz' | 'homework', id: string, isPublished: boolean): Promise<boolean> {
    const tableMap = {
      video: 'videos',
      quiz: 'quizzes',
      homework: 'homework'
    };
    const { error } = await supabase.from(tableMap[type]).update({ is_published: isPublished }).eq('id', id);
    if (error) console.error(`Error toggling publish for ${type}:`, error);

    return true;
  },

  // ==============================================================================
  // PHASE 5.1: TEACHER DASHBOARD STATS & STUDENT MANAGEMENT
  // ==============================================================================

  async getTeacherDashboardStats(teacherId: string): Promise<TeacherDashboardStats> {
    const channels = await this.getTeacherChannels(teacherId);
    const channelIds = channels.map(c => c.id);

    // 1. Total Videos (sum of real video counts)
    const totalVideos = channels.reduce((sum, ch) => sum + (ch.content_counts?.videos || 0), 0);

    // 2. Units & Video Lessons Published Count
    let unitsCount = 0;
    let videosCount = totalVideos;
    try {
      if (channelIds.length > 0) {
        const { count: uCount } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .in('channel_id', channelIds);
        if (uCount !== null && uCount !== undefined) {
          unitsCount = uCount;
        }

        const { count: vCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .in('channel_id', channelIds);
        if (vCount !== null && vCount !== undefined) {
          videosCount = vCount;
        }
      }
    } catch {
      // Ignore
    }
    const contentPublished = unitsCount + videosCount;

    // 3. Total Enrolled (count of active unique students across all teacher's channels)
    let totalStudents = 0;
    let totalEnrolled = 0;
    let thisMonthPayment = 0;

    try {
      if (channelIds.length > 0) {
        const { data: subs } = await supabase
          .from('channel_subscriptions')
          .select('student_id, package_type, status, created_at')
          .in('channel_id', channelIds)
          .eq('status', 'active');

        if (subs && subs.length > 0) {
          const uniqueStudents = new Set(subs.map(s => s.student_id));
          totalStudents = uniqueStudents.size;
          totalEnrolled = uniqueStudents.size;

          // Compute payments for this month
          subs.forEach(s => {
            if (s.package_type === 'entire_channel') thisMonthPayment += 999;
            else if (s.package_type === 'particular_class') thisMonthPayment += 699;
            else thisMonthPayment += 499;
          });
        }
      }
    } catch {
      // Ignore
    }

    // 4. Rating (Overall and This Month)
    let averageRating = 0;
    let monthlyRating = 0;
    let monthlyReviewCount = 0;

    try {
      if (channelIds.length > 0) {
        const { data: reviews } = await supabase
          .from('channel_reviews')
          .select('rating, created_at')
          .in('channel_id', channelIds);

        if (reviews && reviews.length > 0) {
          const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
          averageRating = Math.round((sum / reviews.length) * 10) / 10;

          // This month calculation
          const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          const thisMonthReviews = reviews.filter(r => r.created_at >= startOfMonth);
          if (thisMonthReviews.length > 0) {
            monthlyReviewCount = thisMonthReviews.length;
            const monthSum = thisMonthReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
            monthlyRating = Math.round((monthSum / thisMonthReviews.length) * 10) / 10;
          } else {
            // If no reviews yet this month, fallback to overall rating
            monthlyRating = averageRating;
          }
        }
      }
    } catch {
      // Ignore
    }

    return {
      totalVideos,
      totalStudents,
      averageRating,
      thisMonthPayment,
      totalEnrolled,
      unitsCount,
      videosCount,
      contentPublished,
      monthlyRating,
      monthlyReviewCount,
    };
  },

  // Get students grouped by channel with detailed progress & messaging
  async getTeacherStudents(teacherId: string): Promise<{ channel: ChannelItem; students: ChannelStudentInfo[] }[]> {
    const channels = await this.getTeacherChannels(teacherId);
    const result: { channel: ChannelItem; students: ChannelStudentInfo[] }[] = [];

    for (const channel of channels) {
      const studentsList: ChannelStudentInfo[] = [];

      // 1. Gather all content in this channel for progress calculation
      const [videos, quizzes, hw] = await Promise.all([
        this.getChannelVideos(channel.id),
        this.getChannelQuizzes(channel.id),
        this.getChannelHomework(channel.id),
      ]);

      const allChannelItems = [
        ...videos.map((v: VideoContentItem) => ({ id: v.id, title: v.title, type: 'video' as const, subject: v.subject_name })),
        ...quizzes.map((q: QuizItem) => ({ id: q.id, title: q.title, type: 'quiz' as const, subject: q.subject_name })),
        ...hw.map((h: HomeworkItem) => ({ id: h.id, title: h.title, type: 'homework' as const, subject: h.subject_name })),
      ];

      // 2. Fetch subscriptions for this channel
      let subs: ChannelSubscription[] = [];
      try {
        const { data, error } = await supabase
          .from('channel_subscriptions')
          .select('*')
          .eq('channel_id', channel.id)
          .eq('status', 'active');

        if (!error && data) {
          subs = data as ChannelSubscription[];
        }
      } catch {
        // Ignore
      }

      // 3. For each subscribed student, fetch profile, progress, and messages
      for (const sub of subs) {
        let studentProfile: Profile | null = null;
        let academicProfile: any = null;
        try {
          const [{ data: prof }, { data: studentData }, { data: acd }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', sub.student_id).maybeSingle(),
            supabase.from('students').select('*').eq('id', sub.student_id).maybeSingle(),
            supabase.from('student_academic_profiles')
              .select('*, class:classes(*), board:boards(*)')
              .eq('student_id', sub.student_id)
              .eq('is_current', true)
              .maybeSingle()
          ]);
          if (prof) studentProfile = { ...prof, ...(studentData || {}) } as Profile;
          if (acd) academicProfile = acd;
        } catch {
          // Ignore
        }

        const safeProfile = studentProfile || {
          id: sub.student_id,
          email: 'student@example.com',
          name: 'Student',
          role: 'student' as const,
          created_at: sub.created_at,
          updated_at: sub.created_at,
        };

        // Fetch progress records
        let progressRecords: StudentContentProgress[] = [];
        try {
          const { data: prog } = await supabase
            .from('student_content_progress')
            .select('*')
            .eq('student_id', sub.student_id)
            .eq('channel_id', channel.id);

          if (prog) progressRecords = prog as StudentContentProgress[];
        } catch {
          // Ignore
        }

        // Categorize into Completed, In Progress, Remaining
        const completedMap = new Map(progressRecords.filter(p => p.status === 'completed').map(p => [p.content_id, true]));
        const inProgressMap = new Map(progressRecords.filter(p => p.status === 'in_progress').map(p => [p.content_id, true]));

        const completedItems = allChannelItems.filter(item => completedMap.has(item.id));
        const inProgressItems = allChannelItems.filter(item => inProgressMap.has(item.id));
        const remainingItems = allChannelItems.filter(item => !completedMap.has(item.id) && !inProgressMap.has(item.id));

        const totalItems = allChannelItems.length;
        const percentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0;

        // Fetch messages between teacher and this student
        const messages = await this.getTeacherMessagesForStudent(teacherId, sub.student_id, channel.id);

        studentsList.push({
          studentId: sub.student_id,
          name: safeProfile.name || 'Student',
          email: safeProfile.email || null,
          phone: safeProfile.phone || null,
          parentPhone: safeProfile.parent_phone || null,
          className: academicProfile?.class?.name || null,
          boardName: academicProfile?.board?.name || null,
          subjects: academicProfile?.subjects || (academicProfile?.subject ? [academicProfile.subject] : null),
          photoUrl: safeProfile.photo_url || null,
          enrolledAt: sub.created_at,
          packageType: sub.package_type,
          progress: {
            totalItems,
            completedCount: completedItems.length,
            inProgressCount: inProgressItems.length,
            remainingCount: remainingItems.length,
            percentage,
            completedItems,
            inProgressItems,
            remainingItems,
          },
          messages,
        });
      }

      result.push({
        channel,
        students: studentsList,
      });
    }

    return result;
  },

  // Send a message / task / activity from teacher to a student
  async sendTeacherMessage(params: {
    teacherId: string;
    channelId: string;
    studentId?: string | null;
    title: string;
    content: string;
    actionType?: string;
  }): Promise<TeacherMessage> {
    const { data: newMessage, error } = await supabase.from('teacher_messages').insert({
      teacher_id: params.teacherId,
      channel_id: params.channelId,
      student_id: params.studentId || null,
      title: params.title.trim(),
      content: params.content.trim(),
      action_type: params.actionType || 'general',
      status: 'pending',
    }).select().single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return newMessage as TeacherMessage;
  },

  // Fetch messages for student
  async getTeacherMessagesForStudent(teacherId: string, studentId: string, channelId: string): Promise<TeacherMessage[]> {
    const { data, error } = await supabase
      .from('teacher_messages')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('channel_id', channelId)
      .or(`student_id.eq.${studentId},student_id.is.null`)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as TeacherMessage[];
    }
    return [];
  }
};
