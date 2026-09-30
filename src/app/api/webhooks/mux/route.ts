import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import Mux from '@mux/mux-node';

// Use service-role or anon key for webhook (no user cookies in webhooks)
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return []; },
      setAll() { /* no-op for webhook context */ },
    },
  });
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let event: { type: string; data: Record<string, unknown> };

    // Verify webhook signature if MUX_WEBHOOK_SECRET is set
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signatureHeader = request.headers.get('mux-signature') || '';
      try {
        event = await mux.webhooks.verifySignature(rawBody, {
          'mux-signature': signatureHeader,
        }) as unknown as { type: string; data: Record<string, unknown> };
      } catch (verifyErr) {
        console.error('[MUX Webhook] Signature verification failed:', verifyErr);
        return NextResponse.json(
          { error: 'Invalid webhook signature.' },
          { status: 401 }
        );
      }
    } else {
      // No webhook secret configured — parse body directly
      // (Development/testing mode)
      event = JSON.parse(rawBody);
    }

    const supabase = createServiceClient();
    const eventType = event.type;
    const data = event.data;

    console.log(`[MUX Webhook] Received event: ${eventType}`);

    // Handle: video.asset.created
    if (eventType === 'video.asset.created') {
      const assetId = data.id as string;
      const passthrough = data.passthrough as string | undefined;
      const uploadId = (data.upload_id as string) || null;

      if (passthrough) {
        const { error } = await supabase
          .from('videos')
          .update({
            mux_asset_id: assetId,
            mux_status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', passthrough);

        if (error) {
          console.error('[MUX Webhook] Error updating video for asset.created:', error);
        } else {
          console.log(`[MUX Webhook] Updated video ${passthrough} with asset_id ${assetId}`);
        }
      } else if (uploadId) {
        // Fallback: find by mux_upload_id
        const { error } = await supabase
          .from('videos')
          .update({
            mux_asset_id: assetId,
            mux_status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('mux_upload_id', uploadId);

        if (error) {
          console.error('[MUX Webhook] Error updating video by upload_id:', error);
        }
      }
    }

    // Handle: video.asset.ready
    if (eventType === 'video.asset.ready') {
      const assetId = data.id as string;
      const passthrough = data.passthrough as string | undefined;
      const duration = (data.duration as number) || null;

      // Get playback ID from the asset's playback_ids array
      const playbackIds = data.playback_ids as Array<{ id: string; policy: string }> | undefined;
      const publicPlaybackId = playbackIds?.find(p => p.policy === 'public')?.id
        || playbackIds?.[0]?.id
        || null;

      const updatePayload = {
        mux_asset_id: assetId,
        mux_playback_id: publicPlaybackId,
        mux_duration: duration,
        mux_status: 'ready' as const,
        duration_seconds: duration ? Math.round(duration) : null,
        updated_at: new Date().toISOString(),
      };

      if (passthrough) {
        const { error } = await supabase
          .from('videos')
          .update(updatePayload)
          .eq('id', passthrough);

        if (error) {
          console.error('[MUX Webhook] Error updating video for asset.ready:', error);
        } else {
          console.log(`[MUX Webhook] Video ${passthrough} is now READY. Playback ID: ${publicPlaybackId}`);
        }
      } else {
        // Fallback: find by mux_asset_id
        const { error } = await supabase
          .from('videos')
          .update(updatePayload)
          .eq('mux_asset_id', assetId);

        if (error) {
          console.error('[MUX Webhook] Error updating video by asset_id:', error);
        }
      }
    }

    // Handle: video.asset.errored
    if (eventType === 'video.asset.errored') {
      const assetId = data.id as string;
      const passthrough = data.passthrough as string | undefined;

      const updatePayload = {
        mux_status: 'errored' as const,
        updated_at: new Date().toISOString(),
      };

      if (passthrough) {
        await supabase.from('videos').update(updatePayload).eq('id', passthrough);
        console.error(`[MUX Webhook] Video ${passthrough} processing ERRORED.`);
      } else {
        await supabase.from('videos').update(updatePayload).eq('mux_asset_id', assetId);
        console.error(`[MUX Webhook] Asset ${assetId} processing ERRORED.`);
      }
    }

    // Handle: video.upload.asset_created (connects upload_id to asset_id)
    if (eventType === 'video.upload.asset_created') {
      const uploadId = data.id as string;
      const assetId = data.asset_id as string;
      const passthrough = (data.new_asset_settings as Record<string, unknown>)?.passthrough as string | undefined;

      if (passthrough && assetId) {
        const { error } = await supabase
          .from('videos')
          .update({
            mux_asset_id: assetId,
            mux_status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', passthrough);

        if (error) {
          console.error('[MUX Webhook] Error linking upload to asset:', error);
        }
      } else if (uploadId && assetId) {
        await supabase
          .from('videos')
          .update({
            mux_asset_id: assetId,
            mux_status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('mux_upload_id', uploadId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('[MUX Webhook] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed.' },
      { status: 500 }
    );
  }
}
