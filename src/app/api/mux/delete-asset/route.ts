import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Supabase authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { mux_asset_id, mux_upload_id } = body;

    // Cancel direct upload if requested
    if (mux_upload_id) {
      try {
        await mux.video.uploads.cancel(mux_upload_id);
        console.log(`[MUX] Cancelled direct upload session: ${mux_upload_id}`);
      } catch (uploadErr) {
        console.warn(`[MUX] Could not cancel upload ${mux_upload_id}:`, uploadErr);
      }
    }

    // Delete asset if requested
    if (mux_asset_id) {
      try {
        await mux.video.assets.delete(mux_asset_id);
        console.log(`[MUX] Deleted asset: ${mux_asset_id}`);
      } catch (assetErr) {
        console.warn(`[MUX] Could not delete asset ${mux_asset_id}:`, assetErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[MUX] Error in delete/cancel:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to clean up Mux resource.' },
      { status: 500 }
    );
  }
}
