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

    // 2. Get the mux_asset_id from request body
    const body = await request.json();
    const { mux_asset_id } = body;

    if (!mux_asset_id) {
      return NextResponse.json({ ok: true }); // Nothing to delete
    }

    // 3. Delete the Mux asset
    try {
      await mux.video.assets.delete(mux_asset_id);
      console.log(`[MUX] Deleted asset: ${mux_asset_id}`);
    } catch (muxErr: unknown) {
      // Asset may already be deleted or not found — log but don't fail
      console.warn(`[MUX] Could not delete asset ${mux_asset_id}:`, muxErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MUX] Error deleting asset:', err);
    return NextResponse.json(
      { error: 'Failed to delete Mux asset.' },
      { status: 500 }
    );
  }
}
