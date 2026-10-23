import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

/**
 * POST /api/mux/reconcile
 *
 * Self-healing endpoint for videos stuck in 'waiting', 'uploading', or 'processing'.
 * Directly queries the Mux API to inspect actual upload and asset states,
 * then synchronizes the Supabase record.
 */

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) {
    console.error('[Reconcile] SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Helper to reconcile a single video against Mux
async function reconcileSingleVideo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  video: {
    id: string;
    mux_asset_id?: string | null;
    mux_upload_id?: string | null;
    mux_status?: string | null;
    mux_playback_id?: string | null;
  }
) {
  // If already ready, return current state
  if (video.mux_status === 'ready' && video.mux_playback_id) {
    return {
      reconciled: false,
      status: 'ready',
      playback_id: video.mux_playback_id,
      reason: 'Video is already marked ready.',
    };
  }

  let muxAsset: Awaited<ReturnType<typeof mux.video.assets.retrieve>> | null = null;
  let uploadInfo: Awaited<ReturnType<typeof mux.video.uploads.retrieve>> | null = null;

  // 1. Try to fetch asset directly by mux_asset_id
  if (video.mux_asset_id) {
    try {
      muxAsset = await mux.video.assets.retrieve(video.mux_asset_id);
    } catch (err) {
      console.warn(`[Reconcile] Could not fetch asset by asset_id ${video.mux_asset_id}:`, err);
    }
  }

  // 2. If no asset yet, inspect the direct upload session
  if (!muxAsset && video.mux_upload_id) {
    try {
      uploadInfo = await mux.video.uploads.retrieve(video.mux_upload_id);
      if (uploadInfo.asset_id) {
        muxAsset = await mux.video.assets.retrieve(uploadInfo.asset_id);
      } else if (uploadInfo.status === 'errored' || uploadInfo.error) {
        const errorMsg = uploadInfo.error?.message || 'Direct upload session failed on Mux.';
        await serviceClient
          .from('videos')
          .update({
            mux_status: 'errored',
            mux_error_message: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', video.id);

        return {
          reconciled: true,
          status: 'errored',
          reason: errorMsg,
        };
      }
    } catch (err) {
      console.warn(`[Reconcile] Could not fetch upload ${video.mux_upload_id}:`, err);
    }
  }

  if (!muxAsset) {
    return {
      reconciled: false,
      status: video.mux_status || 'waiting',
      reason: 'No Mux asset has been created yet. Video may still be transferring.',
    };
  }

  const assetStatus = muxAsset.status; // 'preparing' | 'ready' | 'errored'
  const now = new Date().toISOString();

  // If asset is ready: extract playback ID and update
  if (assetStatus === 'ready') {
    const playbackId =
      muxAsset.playback_ids?.find((p) => p.policy === 'public')?.id ||
      muxAsset.playback_ids?.[0]?.id ||
      null;

    if (!playbackId) {
      return {
        reconciled: false,
        status: assetStatus,
        reason: 'Asset is ready on Mux but missing public playback ID.',
      };
    }

    const { error: updateError } = await serviceClient
      .from('videos')
      .update({
        mux_asset_id: muxAsset.id,
        mux_playback_id: playbackId,
        mux_status: 'ready',
        mux_duration: muxAsset.duration ?? null,
        duration_seconds: muxAsset.duration ? Math.round(muxAsset.duration) : null,
        updated_at: now,
      })
      .eq('id', video.id);

    if (updateError) {
      console.error('[Reconcile] DB update error:', updateError);
      throw new Error(`Failed to update video record: ${updateError.message}`);
    }

    return {
      reconciled: true,
      status: 'ready',
      playback_id: playbackId,
      duration: muxAsset.duration,
      reason: 'Video was ready on Mux and has been synchronized successfully.',
    };
  }

  // If asset errored on Mux
  if (assetStatus === 'errored') {
    const rawErrors = muxAsset.errors as { type?: string; messages?: string[] } | undefined;
    const errorMsg =
      rawErrors?.messages?.filter(Boolean).join('. ') ||
      rawErrors?.type ||
      'Video processing failed on Mux.';

    const erroredPayload: Record<string, unknown> = {
      mux_asset_id: muxAsset.id,
      mux_status: 'errored',
      updated_at: now,
    };

    const { error: errUpdate } = await serviceClient
      .from('videos')
      .update({ ...erroredPayload, mux_error_message: errorMsg })
      .eq('id', video.id);

    if (errUpdate && errUpdate.code === 'PGRST204') {
      await serviceClient.from('videos').update(erroredPayload).eq('id', video.id);
    }

    return {
      reconciled: true,
      status: 'errored',
      reason: errorMsg,
    };
  }

  // Asset is still preparing
  await serviceClient
    .from('videos')
    .update({
      mux_asset_id: muxAsset.id,
      mux_status: 'processing',
      updated_at: now,
    })
    .eq('id', video.id);

  return {
    reconciled: false,
    status: 'processing',
    reason: `Mux is encoding your video (current asset status: ${assetStatus}).`,
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { video_id, channel_id, reconcile_stale } = body;

    const serviceClient = createServiceClient();

    // Batch mode: reconcile all pending/processing videos for a channel owned by teacher
    if (channel_id && reconcile_stale) {
      const { data: channel } = await serviceClient
        .from('channels')
        .select('teacher_id')
        .eq('id', channel_id)
        .single();

      if (!channel || channel.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const { data: pendingVideos } = await serviceClient
        .from('videos')
        .select('id, mux_asset_id, mux_upload_id, mux_status, mux_playback_id')
        .eq('channel_id', channel_id)
        .in('mux_status', ['waiting', 'uploading', 'processing', 'pending']);

      const results = [];
      if (pendingVideos && pendingVideos.length > 0) {
        for (const vid of pendingVideos) {
          try {
            const res = await reconcileSingleVideo(serviceClient, vid);
            results.push({ video_id: vid.id, ...res });
          } catch (err) {
            results.push({ video_id: vid.id, error: (err as Error).message });
          }
        }
      }

      return NextResponse.json({ reconciled_count: results.length, results });
    }

    // Single video mode
    if (!video_id) {
      return NextResponse.json({ error: 'Missing video_id parameter.' }, { status: 400 });
    }

    // 2. Fetch video record
    const { data: video, error: videoError } = await serviceClient
      .from('videos')
      .select('id, mux_asset_id, mux_upload_id, mux_status, mux_playback_id, channel_id, is_demo')
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    // 3. Authorization check:
    // Either channel teacher, enrolled student, or demo video
    const { data: channel } = await serviceClient
      .from('channels')
      .select('teacher_id')
      .eq('id', video.channel_id)
      .single();

    const isTeacher = channel && channel.teacher_id === user.id;

    if (!isTeacher) {
      // Check if user is an active student subscriber or demo video
      let hasAccess = video.is_demo;
      if (!hasAccess) {
        const { data: sub } = await serviceClient
          .from('channel_subscriptions')
          .select('status')
          .eq('channel_id', video.channel_id)
          .eq('student_id', user.id)
          .eq('status', 'active')
          .single();

        hasAccess = !!sub;
      }

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    }

    // 4. Reconcile against Mux
    const result = await reconcileSingleVideo(serviceClient, video);
    return NextResponse.json(result);

  } catch (err: unknown) {
    console.error('[Reconcile] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Reconciliation failed.' },
      { status: 500 }
    );
  }
}
