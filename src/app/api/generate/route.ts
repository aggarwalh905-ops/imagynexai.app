export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt');
    const negative = searchParams.get('negative');
    const width = searchParams.get('width') || '1024';
    const height = searchParams.get('height') || '1024';
    const seed = searchParams.get('seed') || Math.floor(Math.random() * 1000000).toString();
    const model = searchParams.get('model') || 'flux';
    
    // 1. Get Upscale Status
    const isUpscale = searchParams.get('upscale') === 'true';

    if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

    // 2. Enhance Prompt for HD
    // Agar user ne HD click kiya hai, toh hum prompt mein quality tags auto-add kar sakte hain
    const hdTags = isUpscale ? ", extremely detailed, 8k resolution, masterpiece, sharp focus" : "";
    const finalPrompt = `${prompt}${hdTags}`;

    const negPart = negative ? `&negative_prompt=${encodeURIComponent(negative)}` : "";
    
    // 3. Pollinations URL Construction
    // Agar upscale true hai, toh 'enhance=true' pakka bhejna chahiye
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true&referrer=imagynex${negPart}`;
    
    const response = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
        'Referer': 'https://imagynexai.vercel.app',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Engine error or invalid key' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/webp';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        // Jab image upscale ho toh caching aur bhi important hai
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}