import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TEXT_MODELS = [
  'community/morriszdweck/glm-5.3-flash-free',
  'community/YoannDev90/poolside-laguna-s-2.1:free',
  'community/ZapGaming/llama3.1-8b-xturbo',
];

const SURPRISE_PRESETS = [
  'A bioluminescent jellyfish floating through the glowing neon skyscrapers of Neo-Tokyo, 8k cinematic lighting, octane render, volumetric fog',
  'An ancient samurai warrior standing on an icy mountaintop during sunset, golden hour reflections, 35mm lens photography, highly detailed',
  'A retro-futuristic steampunk laboratory filled with glowing vacuum tubes, copper gears, and volumetric smoke, masterpiece digital art',
  'A majestic celestial tiger made of stardust and nebula clouds roaming across the cosmos, hyper-realistic, dramatic deep space illumination',
  'Cyberpunk street food vendor in rain-slicked alleyway, neon signage reflections in puddles, volumetric steam, cinematic atmosphere',
];

const STUDIO_MODIFIERS = [
  'cinematic lighting, 8k resolution, highly detailed, photorealistic, octane render, unreal engine 5, volumetric smoke, sharp focus',
  'soft natural golden hour lighting, 35mm lens photography, sharp focus, intricate masterwork details, ray tracing, masterpiece composition',
  'dramatic shadows, vivid chromatic palette, depth of field, ultra-realistic textures, studio lighting, hyper-detailed render',
];

export async function POST(request: NextRequest) {
  try {
    const { prompt = '', mode = 'enhance', userToken } = await request.json();
    const isSurprise = mode === 'surprise';

    const systemPrompt = isSurprise
      ? 'Generate one vivid, unique, ultra-creative image prompt concept (cyberpunk, hyper-surrealism, cosmic fantasy, or ancient mythology). Output ONLY the prompt in 20 to 30 words. No chat, no quotes.'
      : 'Act as a master AI prompt engineer. Expand the following idea into an ultra-detailed cinematic masterpiece for image generation. Add lighting, camera lens, textures, 8k resolution, and mood. Keep under 45 words. Output ONLY raw prompt, no quotes.';

    const userMessage = isSurprise
      ? 'Inspire me with a random masterpiece prompt.'
      : `Expand this concept: "${prompt.trim()}"`;

    let generatedText = '';

    for (const modelId of TEXT_MODELS) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
        };
        if (userToken && userToken !== 'null' && userToken !== 'undefined') {
          headers['Authorization'] = `Bearer ${userToken.trim()}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            model: modelId,
            seed: Math.floor(Math.random() * 999999),
          }),
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeout);

        if (res.ok) {
          const text = await res.text();
          const cleaned = text
            .replace(/^(Prompt:|Improved Prompt:|Expanded Prompt:|Here is a prompt:|")|"$|^\s+|\s+$/g, '')
            .trim();

          if (cleaned.length > 15 && !cleaned.toLowerCase().includes('error')) {
            generatedText = cleaned;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!generatedText) {
      if (isSurprise) {
        generatedText = SURPRISE_PRESETS[Math.floor(Math.random() * SURPRISE_PRESETS.length)];
      } else {
        const mod = STUDIO_MODIFIERS[Math.floor(Math.random() * STUDIO_MODIFIERS.length)];
        generatedText = prompt.trim() ? `${prompt.trim()}, ${mod}` : mod;
      }
    }

    return NextResponse.json({ success: true, result: generatedText });
  } catch (error: any) {
    console.error('Enhance route fallback:', error);
    return NextResponse.json({
      success: true,
      result: 'A cinematic masterwork, dramatic volumetric lighting, 8k resolution, sharp focus, ray tracing',
    });
  }
}