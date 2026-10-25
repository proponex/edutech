import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Mux from '@mux/mux-node';

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    console.error(
      '[MUX Webhook] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set! ' +
      'All webhook DB updates will fail silently due to RLS. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

interface MuxWebhookPayload {
  type: string;
  data: Record<string, unknown>;
  id?: string;
  created_at?: string;
  accessor_source?: string;
}

/**
 * Safely updates a video record by any identifier (id, mux_asset_id, mux_upload_id).
 * Protects against PGRST116 errors and returns count of affected rows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateVideo(
  supabase: SupabaseClient<any, any, any>,
  filter: Record<string, string>,
  payload: Record<string, unknown>,
  preventDowngradeFromReady = false
): Promise<{ updated: boolean; error: { message: string; code?: string } | null }> {
  const filterKey = Object.keys(filter)[0];
  const filterVal = filter[filterKey];

  if (!filterVal) {
    return { updated: false, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('videos')
    .update(payload)
    .eq(filterKey, filterVal);

  // If preventing downgrade from 'ready', ensure we don't overwrite a video that is already 'ready'
  if (preventDowngradeFromReady) {
    query = query.neq('mux_status', 'ready');
  }

  const { data, error } = await query.select('id, mux_status');

  if (error) {
    // If the schema cache does not have mux_error_message yet, retry without it
    if (error.code === 'PGRST204' && 'mux_error_message' in payload) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.mux_error_message;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fallbackQuery = (supabase as any)
        .from('videos')
        .update(fallbackPayload)
        .eq(filterKey, filterVal);

      if (preventDowngradeFromReady) {
        fallbackQuery = fallbackQuery.neq('mux_status', 'ready');
      }

      const fallbackRes = await fallbackQuery.select('id, mux_status');
      if (!fallbackRes.error) {
        const fallbackCount = (fallbackRes.data as unknown[])?.length ?? 0;
        return { updated: fallbackCount > 0, error: null };
      }
    }

    return { updated: false, error: { message: error.message, code: error.code } };
  }

  const rowCount = (data as unknown[])?.length ?? 0;
  return { updated: rowCount > 0, error: null };
}

export async function POST(request: NextRequest) {
  // 1. Read raw body text first — strictly required for cryptographic signature verification
  const rawBody = await request.text();

  if (!rawBody) {
    return NextResponse.json({ error: 'Empty payload.' }, { status: 400 });
  }

  let event: MuxWebhookPayload;

  // 2. Verify webhook signature if MUX_WEBHOOK_SECRET is set
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  if (webhookSecret) {
    try {
      // In @mux/mux-node v15, unwrap is ASYNC and MUST be awaited.
      event = (await mux.webhooks.unwrap(rawBody, request.headers, webhookSecret)) as unknown as MuxWebhookPayload;
    } catch (verifyErr) {
      console.error('[MUX Webhook] Signature verification failed:', (verifyErr as Error)?.message || verifyErr);
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }
  } else {
    // Development fallback if secret is omitted
    console.warn('[MUX Webhook] WARNING: MUX_WEBHOOK_SECRET is not configured. Skipping signature verification.');
    try {
      event = JSON.parse(rawBody) as MuxWebhookPayload;
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }
  }

  const supabase = createServiceClient();
  const eventType = event.type;
  const data = event.data || {};
  const now = new Date().toISOString();

  console.log(`[MUX Webhook] Verified event received: ${eventType}`);

  try {

    // =========================================================================
    // LIVE STREAMING EVENTS
    // =========================================================================

    // EVENT: video.live_stream.active
    // Fired when a broadcaster connects and the stream becomes live.
    if (eventType === 'video.live_stream.active') {
      const streamId = data.id as string;
      console.log(`[MUX Webhook] live_stream.active | stream=${streamId}`);

      if (streamId) {
        const { error: updateErr } = await supabase
          .from('live_sessions')
          .update({ status: 'live', started_at: now, updated_at: now })
          .eq('mux_live_stream_id', streamId)
          .in('status', ['starting', 'idle', 'scheduled']);

        if (updateErr) {
          console.error('[MUX Webhook] live_stream.active: DB update error:', updateErr);
        } else {
          console.log(`[MUX Webhook] live_stream.active: Session updated to LIVE for stream=${streamId}`);
        }
      }
    }

    // EVENT: video.live_stream.idle
    // Fired when the broadcaster disconnects but within reconnect window.
    if (eventType === 'video.live_stream.idle') {
      const streamId = data.id as string;
      console.log(`[MUX Webhook] live_stream.idle | stream=${streamId}`);

      if (streamId) {
        const { error: updateErr } = await supabase
          .from('live_sessions')
          .update({ status: 'idle', updated_at: now })
          .eq('mux_live_stream_id', streamId)
          .eq('status', 'live');

        if (updateErr) {
          console.error('[MUX Webhook] live_stream.idle: DB update error:', updateErr);
        }
      }
    }

    // EVENT: video.live_stream.disconnected
    if (eventType === 'video.live_stream.disconnected') {
      const streamId = data.id as string;
      console.log(`[MUX Webhook] live_stream.disconnected | stream=${streamId}`);
      if (streamId) {
        await supabase
          .from('live_sessions')
          .update({ status: 'idle', updated_at: now })
          .eq('mux_live_stream_id', streamId)
          .eq('status', 'live');
      }
    }

    // EVENT: video.live_stream.disabled
    // Fired when the stream is permanently disabled.
    if (eventType === 'video.live_stream.disabled') {
      const streamId = data.id as string;
      console.log(`[MUX Webhook] live_stream.disabled | stream=${streamId}`);

      if (streamId) {
        const { error: updateErr } = await supabase
          .from('live_sessions')
          .update({ status: 'ended', ended_at: now, chat_enabled: false, updated_at: now })
          .eq('mux_live_stream_id', streamId)
          .not('status', 'eq', 'ended');

        if (updateErr) {
          console.error('[MUX Webhook] live_stream.disabled: DB update error:', updateErr);
        }
      }
    }

    // =========================================================================
    // ON-DEMAND VIDEO EVENTS
    // =========================================================================

    // EVENT: video.upload.asset_created
    if (eventType === 'video.upload.asset_created') {
      const uploadId = data.id as string;
      const assetId = data.asset_id as string;
      const passthrough = (data.new_asset_settings as Record<string, unknown>)?.passthrough as string | undefined;

      console.log(`[MUX Webhook] upload.asset_created | upload=${uploadId} | asset=${assetId} | passthrough=${passthrough}`);

      if (assetId) {
        const updatePayload = { mux_asset_id: assetId, mux_status: 'processing', updated_at: now };
        let updated = false;
        if (passthrough) {
          const res = await updateVideo(supabase, { id: passthrough }, updatePayload, true);
          updated = res.updated;
        }
        if (!updated && uploadId) {
          await updateVideo(supabase, { mux_upload_id: uploadId }, updatePayload, true);
        }
      }
    }

    // EVENT: video.asset.created
    if (eventType === 'video.asset.created') {
      const assetId = data.id as string;
      const passthrough = data.passthrough as string | undefined;
      const uploadId = (data.upload_id as string) || null;

      console.log(`[MUX Webhook] asset.created | asset=${assetId} | passthrough=${passthrough} | upload=${uploadId}`);

      if (assetId) {
        const updatePayload = { mux_asset_id: assetId, mux_status: 'processing', updated_at: now };
        let updated = false;
        if (passthrough) {
          const res = await updateVideo(supabase, { id: passthrough }, updatePayload, true);
          updated = res.updated;
        }
        if (!updated && uploadId) {
          await updateVideo(supabase, { mux_upload_id: uploadId }, updatePayload, true);
        }
      }
    }

    // EVENT: video.asset.ready
    // CRITICAL: Video is fully encoded and ready for playback.
    // Also handles live recording assets — passthrough may be a live_session UUID.
    if (eventType === 'video.asset.ready') {
      const assetId = data.id as string;
      const passthrough = data.passthrough as string | undefined;
      const uploadId = (data.upload_id as string) || undefined;
      const duration = typeof data.duration === 'number' ? data.duration : null;

      const playbackIds = data.playback_ids as Array<{ id: string; policy: string }> | undefined;
      const publicPlaybackId =
        playbackIds?.find((p) => p.policy === 'public')?.id ||
        playbackIds?.[0]?.id ||
        null;

      console.log(`[MUX Webhook] asset.ready | asset=${assetId} | playback=${publicPlaybackId} | passthrough=${passthrough} | duration=${duration}`);

      if (!publicPlaybackId) {
        console.error('[MUX Webhook] asset.ready: No playback_id found in event payload!');
        return NextResponse.json({ received: true, error: 'Missing playback_id' }, { status: 200 });
      }

      const videoUpdatePayload: Record<string, unknown> = {
        mux_asset_id: assetId,
        mux_playback_id: publicPlaybackId,
        mux_duration: duration,
        mux_status: 'ready',
        duration_seconds: duration ? Math.round(duration) : null,
        updated_at: now,
      };

      let updateSuccess = false;

      // Try updating regular on-demand video by passthrough (video UUID)
      if (passthrough) {
        const res = await updateVideo(supabase, { id: passthrough }, videoUpdatePayload, false);
        if (res.error) {
          console.error('[MUX Webhook] asset.ready: DB error on passthrough lookup:', res.error);
        }
        updateSuccess = res.updated;

        // Also attempt to update live session recording (passthrough may be session ID)
        const liveRecordingPayload = {
          mux_recording_asset_id: assetId,
          mux_recording_playback_id: publicPlaybackId,
          recording_status: 'ready',
          updated_at: now,
        };
        const { error: liveErr } = await supabase
          .from('live_sessions')
          .update(liveRecordingPayload)
          .eq('id', passthrough);
        if (!liveErr) {
          console.log(`[MUX Webhook] asset.ready: Live recording updated for session=${passthrough}`);
        }
      }

      // Fallback: by mux_asset_id
      if (!updateSuccess && assetId) {
        const res = await updateVideo(supabase, { mux_asset_id: assetId }, videoUpdatePayload, false);
        if (res.error) {
          console.error('[MUX Webhook] asset.ready: DB error on asset_id lookup:', res.error);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
        updateSuccess = res.updated;
      }

      // Fallback: by mux_upload_id
      if (!updateSuccess && uploadId) {
        const res = await updateVideo(supabase, { mux_upload_id: uploadId }, videoUpdatePayload, false);
        if (res.error) {
          console.error('[MUX Webhook] asset.ready: DB error on upload_id lookup:', res.error);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
        updateSuccess = res.updated;
      }

      if (updateSuccess) {
        console.log(`[MUX Webhook] asset.ready: SUCCESS — Video row updated to READY with playback_id=${publicPlaybackId}`);
      } else {
        console.warn(`[MUX Webhook] asset.ready: No matching video record found for passthrough=${passthrough}, asset=${assetId}, upload=${uploadId}`);
      }
    }

    // EVENT: video.asset.errored
    if (eventType === 'video.asset.errored') {
      const assetId = data.id as string;
      const passthrough = data.passthrough as string | undefined;
      const uploadId = (data.upload_id as string) || undefined;

      const rawErrors = data.errors as { type?: string; messages?: string[] } | undefined;
      const errorMsg =
        rawErrors?.messages?.filter(Boolean).join('. ') ||
        rawErrors?.type ||
        'Video encoding failed. Please check the video format and re-upload.';

      console.error(`[MUX Webhook] asset.errored | asset=${assetId} | passthrough=${passthrough}: ${errorMsg}`);

      const updatePayload = {
        mux_asset_id: assetId,
        mux_status: 'errored',
        mux_error_message: errorMsg,
        updated_at: now,
      };

      // Update live session recording status if this was a live recording
      if (passthrough) {
        await supabase
          .from('live_sessions')
          .update({ recording_status: 'errored', updated_at: now })
          .eq('id', passthrough);
      }

      if (passthrough) {
        await updateVideo(supabase, { id: passthrough }, updatePayload, true);
      } else if (assetId) {
        await updateVideo(supabase, { mux_asset_id: assetId }, updatePayload, true);
      } else if (uploadId) {
        await updateVideo(supabase, { mux_upload_id: uploadId }, updatePayload, true);
      }
    }

    // EVENT: video.upload.errored / video.upload.cancelled
    if (eventType === 'video.upload.errored' || eventType === 'video.upload.cancelled') {
      const uploadId = data.id as string;
      const rawError = data.error as { type?: string; message?: string } | undefined;
      const passthrough = (data.new_asset_settings as Record<string, unknown>)?.passthrough as string | undefined;

      const errorMsg =
        eventType === 'video.upload.cancelled'
          ? 'Upload was cancelled.'
          : rawError?.message || rawError?.type || 'Direct upload session failed.';

      console.warn(`[MUX Webhook] ${eventType} | upload=${uploadId}: ${errorMsg}`);

      const updatePayload = { mux_status: 'errored', mux_error_message: errorMsg, updated_at: now };

      if (passthrough) {
        await updateVideo(supabase, { id: passthrough }, updatePayload, true);
      } else if (uploadId) {
        await updateVideo(supabase, { mux_upload_id: uploadId }, updatePayload, true);
      }
    }

    // Return HTTP 200 for all successfully received events
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err: unknown) {
    console.error('[MUX Webhook] Unexpected error handling event:', err);
    return NextResponse.json(
      { error: 'Internal webhook processing error' },
      { status: 500 }
    );
  }
}
