export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt');
    const negative = searchParams.get('negative'); // Negative prompt fetch karein
    const width = searchParams.get('width') || '1024';
    const height = searchParams.get('height') || '1024';
    const seed = searchParams.get('seed') || '123';
    const model = searchParams.get('model') || 'flux';

    if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

    // Negative prompt part build karein
    const negPart = negative ? `&negative_prompt=${encodeURIComponent(negative)}` : "";
    
    // Updated Pollinations URL
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=zimage&nologo=true${negPart}`;

    const response = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'API Key Rejected' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}