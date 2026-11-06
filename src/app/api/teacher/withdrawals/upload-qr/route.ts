import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration.');
  return createAdminClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a PNG, JPEG, or WEBP image.' },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds maximum 5MB limit.' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${Date.now()}_qr.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to withdrawal_qr_codes bucket
    const { error: uploadError } = await admin.storage
      .from('withdrawal_qr_codes')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload QR Error]:', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = admin.storage
      .from('withdrawal_qr_codes')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    });
  } catch (err: any) {
    console.error('[Upload QR Route Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload QR code image.' },
      { status: 500 }
    );
  }
}

