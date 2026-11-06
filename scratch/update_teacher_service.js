const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '../src/lib/teacher-service.ts');
let code = fs.readFileSync(servicePath, 'utf8');

const isCRLF = code.includes('\r\n');
let norm = code.replace(/\r\n/g, '\n');

const oldTarget = `  // ==============================================================================
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

    // 4. Rating (Overall and This Month)`;

const newReplacement = `  // ==============================================================================
  // PHASE 5.1: TEACHER DASHBOARD STATS & STUDENT MANAGEMENT
  // ==============================================================================

  /**
   * Authoritative count of unique students currently holding active memberships/subscriptions
   * across any channel belonging to the teacher.
   * Duplicate students across multiple channels/subjects count exactly ONCE.
   * Strictly excludes expired, cancelled, failed, and unpaid subscriptions.
   */
  async getTeacherActiveStudentCount(teacherId: string): Promise<number> {
    const channels = await this.getTeacherChannels(teacherId);
    if (!channels || channels.length === 0) return 0;

    const channelIds = channels.map((c) => c.id);
    const now = new Date();

    const { data: subs, error } = await supabase
      .from('channel_subscriptions')
      .select('student_id, expires_at, status')
      .in('channel_id', channelIds)
      .eq('status', 'active');

    if (error || !subs || subs.length === 0) return 0;

    // Filter out expired subscriptions (unexpired if no expiry date or expiry date is in the future)
    const activeSubs = subs.filter((s) => !s.expires_at || new Date(s.expires_at) > now);

    // Deduplicate students across all channels of the teacher
    const uniqueStudents = new Set(activeSubs.map((s) => s.student_id));
    return uniqueStudents.size;
  },

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
    const totalStudents = await this.getTeacherActiveStudentCount(teacherId);
    const totalEnrolled = totalStudents;

    // 4. Payment this month from real verified teacher_earnings records
    let thisMonthPayment = 0;
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: earnings } = await supabase
        .from('teacher_earnings')
        .select('teacher_share_paise')
        .eq('teacher_id', teacherId)
        .gte('created_at', startOfMonth);

      if (earnings && earnings.length > 0) {
        const monthSumPaise = earnings.reduce(
          (sum, row) => sum + (Number(row.teacher_share_paise) || 0),
          0
        );
        thisMonthPayment = monthSumPaise / 100;
      }
    } catch {
      // Ignore
    }

    // 5. Rating (Overall and This Month)`;

if (norm.includes(oldTarget)) {
  norm = norm.replace(oldTarget, newReplacement);
  const finalCode = isCRLF ? norm.replace(/\n/g, '\r\n') : norm;
  fs.writeFileSync(servicePath, finalCode, 'utf8');
  console.log('Successfully updated teacher-service.ts with getTeacherActiveStudentCount');
} else {
  console.error('Could not find oldTarget in teacher-service.ts');
  process.exit(1);
}

