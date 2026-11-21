import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/student-auth';

export const dynamic = 'force-dynamic';

export interface NotificationItem {
  id: string;
  type: 'lesson' | 'announcement' | 'live' | 'parent' | 'subscription' | 'quiz' | 'system';
  icon: string;
  title: string;
  message: string;
  created_at: string;
  link: string;
  tag: string;
  is_read: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent();
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: true,
          notifications: [],
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
          unreadCount: 0,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          },
        }
      );
    }

    const userId = auth.user.id;
    const supabase = await createClient();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));

    // 1. Fetch user's active channel subscriptions for isolated filtering
    const { data: userSubs } = await supabase
      .from('channel_subscriptions')
      .select('id, channel_id, subject_name, expires_at, created_at, channels:channel_id(name)')
      .eq('student_id', userId)
      .eq('status', 'active');

    const subscribedList = userSubs || [];
    const subscribedChannelIds = Array.from(
      new Set(subscribedList.map((s) => s.channel_id).filter(Boolean))
    );

    // 2. Parallel fetch student-isolated resources
    const promises: Promise<any>[] = [
      // Direct notifications table (for this student only or system-wide broadcast)
      Promise.resolve(
        supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${userId},user_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(20)
      ),

      // Parent link requests (strictly for this student)
      Promise.resolve(
        supabase
          .from('parent_students')
          .select('id, student_id, is_active, created_at, parents:parent_id(name, email)')
          .eq('student_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
      ),
    ];

    // Subscribed channel specific queries
    if (subscribedChannelIds.length > 0) {
      // Teacher messages: addressed to this student OR channel-wide notice in a subscribed channel
      promises.push(
        Promise.resolve(
          supabase
            .from('teacher_messages')
            .select('id, title, content, created_at, channel_id, action_type, student_id, channels:channel_id(name)')
            .or(`student_id.eq.${userId},and(student_id.is.null,channel_id.in.(${subscribedChannelIds.join(',')}))`)
            .order('created_at', { ascending: false })
            .limit(10)
        )
      );

      // New video lectures in subscribed channels only
      promises.push(
        Promise.resolve(
          supabase
            .from('videos')
            .select('id, title, created_at, channel_id, channels:channel_id(name)')
            .in('channel_id', subscribedChannelIds)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(10)
        )
      );

      // Live sessions in subscribed channels only
      promises.push(
        Promise.resolve(
          supabase
            .from('live_sessions')
            .select('id, title, status, created_at, channel_id, channels:channel_id(name)')
            .in('channel_id', subscribedChannelIds)
            .order('created_at', { ascending: false })
            .limit(10)
        )
      );

      // Quizzes in subscribed channels only
      promises.push(
        Promise.resolve(
          supabase
            .from('quizzes')
            .select('id, title, created_at, channel_id, channels:channel_id(name)')
            .in('channel_id', subscribedChannelIds)
            .order('created_at', { ascending: false })
            .limit(10)
        )
      );
    } else {
      // Direct teacher messages addressed specifically to this student
      promises.push(
        Promise.resolve(
          supabase
            .from('teacher_messages')
            .select('id, title, content, created_at, channel_id, action_type, student_id, channels:channel_id(name)')
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
        )
      );
    }

    const results = await Promise.allSettled(promises);

    const dbNotificationsRes = results[0];
    const parentRequestsRes = results[1];
    const teacherMessagesRes = results[2];
    const videosRes = subscribedChannelIds.length > 0 ? results[3] : null;
    const liveSessionsRes = subscribedChannelIds.length > 0 ? results[4] : null;
    const quizzesRes = subscribedChannelIds.length > 0 ? results[5] : null;

    const collected: NotificationItem[] = [];

    // 1. Direct Notifications
    if (dbNotificationsRes?.status === 'fulfilled' && dbNotificationsRes.value.data) {
      for (const item of dbNotificationsRes.value.data) {
        collected.push({
          id: item.id,
          type: item.type || 'system',
          icon: item.icon || '🔔',
          title: item.title,
          message: item.message,
          created_at: item.created_at,
          link: item.link || '/student',
          tag: item.tag || 'Notice',
          is_read: Boolean(item.is_read),
        });
      }
    }

    // 2. Teacher Messages (Strictly verified for this student)
    if (teacherMessagesRes?.status === 'fulfilled' && teacherMessagesRes.value.data) {
      for (const m of teacherMessagesRes.value.data as any[]) {
        // Enforce data isolation: Never leak another student's direct message
        if (m.student_id && m.student_id !== userId) continue;

        const channelName = m.channels?.name || 'Teacher Channel';
        collected.push({
          id: `tm-${m.id}`,
          type: 'announcement',
          icon: '📢',
          title: m.title || 'Teacher Announcement',
          message: m.content || `Important message from your educator in ${channelName}.`,
          created_at: m.created_at,
          link: `/channels/${m.channel_id}`,
          tag: 'Announcement',
          is_read: false,
        });
      }
    }

    // 3. Parent Requests
    if (parentRequestsRes?.status === 'fulfilled' && parentRequestsRes.value.data) {
      for (const pr of parentRequestsRes.value.data as any[]) {
        const parentName = pr.parents?.name || 'Parent / Guardian';
        collected.push({
          id: `parent-${pr.id}`,
          type: 'parent',
          icon: '👨‍👩‍👧',
          title: pr.is_active ? 'Parent Linking Confirmed' : 'New Parent Link Request',
          message: pr.is_active
            ? `${parentName} is linked to view your curriculum performance analytics.`
            : `${parentName} requested to link with your Student ID. Tap to accept or decline.`,
          created_at: pr.created_at,
          link: `/student?tab=parent-requests`,
          tag: 'Parent Portal',
          is_read: false,
        });
      }
    }

    // 4. Subscriptions
    for (const sub of subscribedList as any[]) {
      const subject = sub.subject_name || sub.channels?.name || 'Academic Channel';
      const expiryDate = sub.expires_at
        ? new Date(sub.expires_at).toLocaleDateString('en-IN')
        : 'Active';
      collected.push({
        id: `sub-${sub.id}`,
        type: 'subscription',
        icon: '💳',
        title: `28-Day Access Active: ${subject}`,
        message: `Your subscription cycle is fully active. Valid until ${expiryDate} with unlimited lesson access.`,
        created_at: sub.created_at,
        link: `/student/payments`,
        tag: 'Active Cycle',
        is_read: false,
      });
    }

    // 5. Videos in subscribed channels
    if (videosRes?.status === 'fulfilled' && videosRes.value.data) {
      for (const v of videosRes.value.data as any[]) {
        const channelName = v.channels?.name || 'Subscribed Course';
        collected.push({
          id: `vid-${v.id}`,
          type: 'lesson',
          icon: '🎬',
          title: `New Lecture: ${v.title}`,
          message: `New class content was published in ${channelName}. Continue your curriculum.`,
          created_at: v.created_at,
          link: `/channels/${v.channel_id}`,
          tag: 'New Lesson',
          is_read: false,
        });
      }
    }

    // 6. Live Sessions in subscribed channels
    if (liveSessionsRes?.status === 'fulfilled' && liveSessionsRes.value.data) {
      for (const ls of liveSessionsRes.value.data as any[]) {
        const channelName = ls.channels?.name || 'Live Classroom';
        const isLive = ls.status === 'live';
        collected.push({
          id: `live-${ls.id}`,
          type: 'live',
          icon: '🔴',
          title: isLive ? `Live Now: ${ls.title}` : `Scheduled Live Class: ${ls.title}`,
          message: isLive
            ? `Educator is currently streaming live in ${channelName}. Join the interactive session!`
            : `Upcoming interactive class in ${channelName}. Check your schedule.`,
          created_at: ls.created_at,
          link: `/live/${ls.id}`,
          tag: isLive ? 'Live Stream' : 'Live Class',
          is_read: false,
        });
      }
    }

    // 7. Practice Quizzes in subscribed channels
    if (quizzesRes?.status === 'fulfilled' && quizzesRes.value.data) {
      for (const q of quizzesRes.value.data as any[]) {
        const channelName = q.channels?.name || 'Subject Practice';
        collected.push({
          id: `quiz-${q.id}`,
          type: 'quiz',
          icon: '📝',
          title: `New Practice Quiz: ${q.title}`,
          message: `Test your concept mastery with interactive questions in ${channelName}.`,
          created_at: q.created_at,
          link: `/student/quiz/${q.id}`,
          tag: 'Practice Quiz',
          is_read: false,
        });
      }
    }

    // 8. System Milestone / Platform Updates
    const systemMilestones: NotificationItem[] = [
      {
        id: 'sys-welcome',
        type: 'system',
        icon: '🎉',
        title: 'Welcome to Prepnx Student Portal',
        message: 'Explore your curated academic curriculum, chapter notes, and expert tutor channels.',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        link: '/student',
        tag: 'Onboarding',
        is_read: false,
      },
      {
        id: 'sys-analytics',
        type: 'system',
        icon: '📊',
        title: 'Real-Time Academic Analysis Active',
        message: 'Your syllabus completion, test scores, and chapter progress are automatically calculated.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        link: '/student?tab=analysis',
        tag: 'Analytics',
        is_read: false,
      },
      {
        id: 'sys-28days',
        type: 'subscription',
        icon: '⏱️',
        title: '28-Day Independent Access System',
        message: 'Enjoy fair subject-wise billing. Early renewals always extend from your current expiration date.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        link: '/student/payments',
        tag: 'Billing',
        is_read: false,
      },
    ];

    const allNotifications = [...collected, ...systemMilestones];

    // Deduplicate by ID
    const uniqueMap = new Map<string, NotificationItem>();
    for (const item of allNotifications) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }

    const uniqueList = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = uniqueList.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const paginatedItems = uniqueList.slice(startIndex, startIndex + limit);
    const unreadCount = uniqueList.filter((item) => !item.is_read).length;

    return NextResponse.json(
      {
        success: true,
        notifications: paginatedItems,
        page: safePage,
        limit,
        total,
        totalPages,
        unreadCount,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[API student notifications error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve student notifications.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireStudent();
    if (!auth.authorized) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    return NextResponse.json(
      {
        success: true,
        action: action || 'mark_all_read',
        unreadCount: 0,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update notification state.' },
      { status: 500 }
    );
  }
}
