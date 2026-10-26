export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToCloudinary, enforceUserImageLimit } from '@/lib/cloudinary';
import { supabaseAdmin } from '@/lib/supabase';
import { validatePromptSafety } from '@/lib/moderation';

const MAX_USER_STORAGE_LIMIT = 10;
const GUEST_DAILY_LIMIT = 5;

const SYSTEM_SAFETY_NEGATIVE = 
  'nsfw, nude, naked, cleavage, bikini, underwear, lingerie, gore, bloody, violence, distorted, extra limbs, bad anatomy, low quality';

// Map aliases strictly to upstream catalog models
const MODEL_MAP: Record<string, string> = {
  // Free Community Models
  'sana-free': 'community/tomdacatto/sana',
  'sana': 'community/tomdacatto/sana',
  'flux-2-dev-free': 'community/scriptsnsenses-sys/flux-2-dev-free',
  'sdxl-lightning-free': 'community/scriptsnsenses-sys/sdxl-lightning-free',

  // Official / Paid Models
  'flux': 'black-forest-labs/flux.1-schnell',
  'flux-schnell': 'black-forest-labs/flux.1-schnell',
  'dreamshaper': 'lykon/dreamshaper-8-lcm',
  'zimage': 'tongyi-mai/z-image-turbo',
  'flux-klein': 'black-forest-labs/flux.2-klein-4b',
  'recraft-flash': 'recraft/recraft-v4.1-flash',
  'gpt-mini': 'openai/gpt-image-1-mini',
  'flux-pro': 'black-forest-labs/flux.1.1-pro',
};

const COMMUNITY_FREE_MODELS = [
  'community/tomdacatto/sana',
  'community/scriptsnsenses-sys/flux-2-dev-free',
  'community/scriptsnsenses-sys/sdxl-lightning-free',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      negative,
      width = 1024,
      height = 1024,
      seed = Math.floor(Math.random() * 1000000).toString(),
      model: incomingModel = 'community/tomdacatto/sana',
      userToken,
      upscale = false,
      isPublic = true,
      creatorName,
      userId: incomingUserId,
    } = body;

    const resolvedModel = MODEL_MAP[incomingModel] || incomingModel;

    // 1. Input & Safety Check
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const safetyCheck = validatePromptSafety(prompt);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({ error: safetyCheck.reason }, { status: 400 });
    }

    // 2. Resolve User Identifier (Prefers Permanent Username)
    const clientIp = 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || 
      'anonymous_guest';

    const cleanCreatorName = creatorName && typeof creatorName === 'string' && creatorName.trim() !== '' && creatorName !== 'Anonymous' && creatorName !== 'Anonymous Guest'
      ? creatorName.trim()
      : null;

    // Identity priority: 1) cleanCreatorName, 2) incomingUserId, 3) IP
    const finalUserId = cleanCreatorName 
      ? cleanCreatorName.toLowerCase() 
      : (incomingUserId || `guest_${clientIp}`);

    const finalDisplayName = cleanCreatorName || 'Anonymous';
    const isGuest = !cleanCreatorName;

    // 3. Rate Limit for Guests
    const today = new Date().toISOString().split('T')[0];
    if (isGuest) {
      const { data: usage } = await supabaseAdmin
        .from('user_usage')
        .select('count')
        .eq('user_id', finalUserId)
        .eq('date', today)
        .maybeSingle();

      if (usage && usage.count >= GUEST_DAILY_LIMIT) {
        return NextResponse.json(
          { error: `Daily guest limit reached (${GUEST_DAILY_LIMIT}/day). Please sign in to continue generating.` },
          { status: 429 }
        );
      }
    }

    // 4. Model & Auth Header Selection
    const isCommunityModel = 
      resolvedModel.startsWith('community/') ||
      incomingModel.includes('free') ||
      COMMUNITY_FREE_MODELS.includes(resolvedModel);

    const hasUserToken = Boolean(
      userToken && 
      userToken !== 'null' && 
      userToken !== 'undefined' && 
      typeof userToken === 'string' &&
      userToken.trim().length > 5
    );

    const combinedNegative = negative 
      ? `${SYSTEM_SAFETY_NEGATIVE}, ${negative}` 
      : SYSTEM_SAFETY_NEGATIVE;

    const hdTags = upscale ? ', sharp focus, 8k resolution, cinematic lighting, masterpiece' : '';
    const finalPrompt = `${prompt.trim()}${hdTags}`;

    const buildPollinationsUrl = (modelId: string) => {
      let url = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&seed=${seed}&model=${modelId}&nologo=true`;
      if (!modelId.startsWith('community/')) {
        url += `&enhance=true&negative_prompt=${encodeURIComponent(combinedNegative)}`;
      }
      return url;
    };

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    };

    if (!isCommunityModel && hasUserToken) {
      headers['Authorization'] = `Bearer ${userToken.trim()}`;
    }

    // 5. Execution Pipeline
    const candidateModels = isCommunityModel
      ? [resolvedModel, ...COMMUNITY_FREE_MODELS.filter(m => m !== resolvedModel)]
      : [resolvedModel];

    let aiRes: Response | null = null;
    let successfulModel = resolvedModel;

    for (const targetModel of candidateModels) {
      try {
        const url = buildPollinationsUrl(targetModel);
        const res = await fetch(url, { 
          method: 'GET', 
          headers, 
          cache: 'no-store' 
        });

        if (res.ok) {
          aiRes = res;
          successfulModel = targetModel;
          break;
        }
        console.warn(`Node ${targetModel} status: ${res.status}. Trying fallback node...`);
      } catch (err) {
        console.warn(`Node error on ${targetModel}:`, err);
      }
    }

    if (!aiRes || !aiRes.ok) {
      return NextResponse.json(
        { 
          error: 'GPU compute nodes are busy. Please retry in a few seconds.',
          type: 'engine_busy'
        },
        { status: 503 }
      );
    }

    const rawBuffer = Buffer.from(await aiRes.arrayBuffer());

    // 6. Cloudinary Upload
    const folder = isPublic && !isGuest ? 'imagynex/gallery' : `imagynex/users/${finalUserId}`;
    const tags = [`user_${finalUserId}`, isPublic && !isGuest ? 'global_gallery' : 'private_user'];

    const uploadResult = await uploadBufferToCloudinary(rawBuffer, folder, tags);

    enforceUserImageLimit(finalUserId, MAX_USER_STORAGE_LIMIT).catch(err => 
      console.error('Limit cleanup error:', err)
    );

    // 7. Supabase Insert (Saves directly under finalUserId = username)
    // Guest generations do not save to public gallery
    const shouldSaveToGallery = Boolean(isPublic && !isGuest);

    const { error: insertError } = await supabaseAdmin.from('generations').insert({
      user_id: finalUserId,
      creator_name: finalDisplayName,
      prompt: finalPrompt,
      seed: seed.toString(),
      model: successfulModel,
      image_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      is_gallery: shouldSaveToGallery,
      is_saved: true,
      likes_count: 0
    });

    if (insertError) {
      console.error("Generations insert warning:", insertError);
    }

    // 8. Stats Increment
    if (!isGuest) {
      const { count: freshCreationsCount } = await supabaseAdmin
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', finalUserId);

      await supabaseAdmin
        .from('users')
        .update({
          total_creations: freshCreationsCount || 1,
          last_active: new Date().toISOString()
        })
        .or(`username.ilike.${finalUserId},id.eq.${finalUserId}`);
    } else {
      const { data: currentUsage } = await supabaseAdmin
        .from('user_usage')
        .select('count')
        .eq('user_id', finalUserId)
        .eq('date', today)
        .maybeSingle();

      const newCount = (currentUsage?.count || 0) + 1;
      await supabaseAdmin.from('user_usage').upsert(
        { user_id: finalUserId, date: today, count: newCount },
        { onConflict: 'user_id,date' }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      seed,
      prompt: finalPrompt,
      model: successfulModel,
      owner: finalUserId,
    });

  } catch (error: any) {
    console.error('Generation Pipeline Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}