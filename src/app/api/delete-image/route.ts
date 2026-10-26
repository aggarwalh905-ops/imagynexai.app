import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { imageId, publicId, creatorId, requesterId, adminKey } = await request.json();

    const isAdmin = adminKey && adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY;
    const isOwner = requesterId && requesterId === creatorId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized to delete this asset' }, { status: 403 });
    }

    // 1. Likes cleanup (Safe await without invalid .catch on PostgrestBuilder)
    try {
      const { error: likesError } = await supabaseAdmin
        .from('image_likes')
        .delete()
        .eq('image_id', imageId);

      if (likesError) {
        console.warn('Likes cleanup warning:', likesError.message);
      }
    } catch (likeErr: unknown) {
      console.warn('Likes cleanup exception:', likeErr);
    }

    // 2. Supabase Generations Table se delete karein
    const { error: dbError } = await supabaseAdmin
      .from('generations')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Supabase DB Delete Error:', dbError);
      throw dbError;
    }

    // 3. Cloudinary se delete karein (Cloudinary uploader return promise supports .catch)
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr: unknown) {
        console.warn('Cloudinary delete warning:', cloudErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete API Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}