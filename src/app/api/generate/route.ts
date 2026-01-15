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
    const model = searchParams.get('model') || 'flux'; // Default flux sasta aur acha hai

    if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

    // Negative prompt handling
    const negPart = negative ? `&negative_prompt=${encodeURIComponent(negative)}` : "";
    
    // Final URL Construction
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true&referrer=imagynex${negPart}`;
    
    const response = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
        'Referer': 'https://imagynexai.vercel.app',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      // Agar pollen khatam ho jayein ya key galat ho
      return NextResponse.json({ error: 'Engine error or invalid key' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Response headers ko dynamic rakhna behtar hai
    const contentType = response.headers.get('content-type') || 'image/webp';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // User gallery ke liye caching achi hai
      },
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}