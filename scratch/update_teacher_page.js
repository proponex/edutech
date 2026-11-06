const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/teacher/page.tsx');
let code = fs.readFileSync(pagePath, 'utf8');

const isCRLF = code.includes('\r\n');
let norm = code.replace(/\r\n/g, '\n');

// 1. Update Student count fetching to use TeacherService.getTeacherActiveStudentCount
const oldCountLogic = `        // 3. Fetch Active Students Count (only students with active subscriptions)
        const channelIds = channelList.map((c) => c.id);
        if (channelIds.length > 0) {
          const nowIso = new Date().toISOString();
          const { data: activeSubs } = await supabase
            .from('channel_subscriptions')
            .select('student_id')
            .in('channel_id', channelIds)
            .eq('status', 'active')
            .gt('expires_at', nowIso);

          if (isMounted && activeSubs) {
            const uniqueActive = new Set(activeSubs.map((s) => s.student_id));
            setStudentsEnrolled(uniqueActive.size);
          }
        }`;

const newCountLogic = `        // 3. Fetch Active Students Count (authoritative count: unique active students across all channels)
        const activeCount = await TeacherService.getTeacherActiveStudentCount(user.id);
        if (isMounted) {
          setStudentsEnrolled(activeCount);
        }`;

if (norm.includes(oldCountLogic)) {
  norm = norm.replace(oldCountLogic, newCountLogic);
  console.log('1. Replaced student count fetching with TeacherService.getTeacherActiveStudentCount');
} else {
  console.error('Could not find oldCountLogic');
}

// 2. Add realtime subscription listener in useEffect
const oldEffectEnd = `    loadTeacherData();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);`;

const newEffectEnd = `    loadTeacherData();

    // Listen for realtime subscription changes (new enrollment, renewal, expiry, cancellation)
    let subsChannel: any = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && isMounted) {
        subsChannel = supabase
          .channel(\`teacher-overview-subs-\${user.id}\`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'channel_subscriptions' },
            async () => {
              if (isMounted) {
                const refreshedCount = await TeacherService.getTeacherActiveStudentCount(user.id);
                setStudentsEnrolled(refreshedCount);
              }
            }
          )
          .subscribe();
      }
    });

    return () => {
      isMounted = false;
      if (subsChannel) {
        supabase.removeChannel(subsChannel);
      }
    };
  }, [router, supabase]);`;

if (norm.includes(oldEffectEnd)) {
  norm = norm.replace(oldEffectEnd, newEffectEnd);
  console.log('2. Added realtime subscription listener in useEffect');
} else {
  console.error('Could not find oldEffectEnd');
}

// 3. Remove New Channel button from navigation bar
const oldNavBarRight = `            {/* Quick Action Button */}
            <div className="shrink-0 pl-2">
              <Link href="/teacher/channels/create">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1.5 shadow-sm shadow-primary-600/20 font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Channel</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
            </div>`;

if (norm.includes(oldNavBarRight)) {
  norm = norm.replace(oldNavBarRight, '');
  console.log('3. Removed Create Channel button from navigation bar');
} else {
  console.error('Could not find oldNavBarRight');
}

// 4. Ensure Channel Management section in Overview has prominent "Create Channel" button
const oldChannelHeaderBtn = `                {channels.length > 0 && (
                  <Link href="/teacher/channels/create">
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" />
                      Add Channel
                    </Button>
                  </Link>
                )}`;

const newChannelHeaderBtn = `                {channels.length > 0 && (
                  <Link href="/teacher/channels/create">
                    <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs font-bold shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      Create Channel
                    </Button>
                  </Link>
                )}`;

if (norm.includes(oldChannelHeaderBtn)) {
  norm = norm.replace(oldChannelHeaderBtn, newChannelHeaderBtn);
  console.log('4. Updated Channel management button to Create Channel in Overview');
}

const finalCode = isCRLF ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(pagePath, finalCode, 'utf8');
console.log('Finished updating src/app/teacher/page.tsx');

