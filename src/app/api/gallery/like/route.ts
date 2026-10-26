import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { imageId, userId } = await req.json();

    if (!imageId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Check if like exists
    const { data: existingLike } = await supabaseAdmin
      .from('image_likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('image_id', imageId)
      .maybeSingle();

    if (existingLike) {
      // Unlike: Delete record (Trigger automatically decrements count)
      await supabaseAdmin
        .from('image_likes')
        .delete()
        .eq('user_id', userId)
        .eq('image_id', imageId);

      return NextResponse.json({ liked: false });
    } else {
      // Like: Insert record (Trigger automatically increments count, composite PK prevents duplicates)
      await supabaseAdmin
        .from('image_likes')
        .insert({ user_id: userId, image_id: imageId });

      return NextResponse.json({ liked: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}