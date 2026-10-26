import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface ImageModelInfo {
  id: string;
  name: string;
  description: string;
  costPerGen: number;
  pricingLabel: string;
  rpm?: number;
  supportsImg2Img: boolean;
}

export async function GET() {
  try {
    // 1. Live Fetch from Pollinations API (15-min cache for fast client loads)
    const res = await fetch('https://gen.pollinations.ai/v1/models', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Imagynex-AI-Studio/1.0',
      },
      next: { revalidate: 900 }, // 15 minutes cache
    });

    if (!res.ok) {
      throw new Error(`Pollinations API responded with status ${res.status}`);
    }

    const data = await res.json();
    const rawModels: any[] = Array.isArray(data) ? data : data.data || data.models || [];

    // 2. Strict Filter: Only Image Generation & Editing Engines
    const imageModels: ImageModelInfo[] = [];

    for (const m of rawModels) {
      const id: string = (m.id || m.name || '').toLowerCase();
      const category: string = (m.category || m.type || '').toLowerCase();
      const outputType: string = (m.output || m.modality || '').toLowerCase();

      // Check if it's an image model
      const isImage = 
        category === 'image' || 
        outputType === 'image' || 
        id.includes('flux') || 
        id.includes('image') || 
        id.includes('seedream') || 
        id.includes('dreamshaper') || 
        id.includes('recraft') || 
        id.includes('banana') || 
        id.includes('turbo') || 
        id.includes('p-image') || 
        id.includes('krea');

      // Exclude pure text, audio, video engines
      const isExcluded = 
        category.includes('video') || 
        category.includes('audio') || 
        category.includes('decision') || 
        id.includes('wan') || 
        id.includes('tts') || 
        id.includes('whisper') || 
        id.includes('sound') || 
        id.includes('kling') || 
        id.includes('seedance');

      if (!isImage || isExcluded) continue;

      // 3. Real Dynamic Cost Parsing
      let costPerGen = 0.002; // Default fallback
      let pricingLabel = '$0.002 / gen';

      // Check flat generation cost (e.g., $0.002 / gen, $0.03 / gen)
      if (m.pricing?.image_out || m.image_out || m.cost_per_gen || m.price) {
        const rawPrice = m.pricing?.image_out || m.image_out || m.cost_per_gen || m.price;
        const parsed = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          costPerGen = parsed;
          pricingLabel = `$${costPerGen.toFixed(4).replace(/\.?0+$/, '')} / gen`;
        }
      } 
      // Check requests per dollar (e.g., 25 reqs/$1 -> $0.04)
      else if (m.requests_per_dollar || m.median_requests || m.requests) {
        const reqs = parseFloat(String(m.requests_per_dollar || m.median_requests || m.requests).replace(/[^0-9.]/g, ''));
        if (!isNaN(reqs) && reqs > 0) {
          costPerGen = +(1 / reqs).toFixed(5);
          pricingLabel = `≈ ${Math.round(reqs)} gens / $1 (~$${costPerGen})`;
        }
      }

      // Check if model supports reference image (Image-to-Image / Editing)
      const supportsImg2Img = Boolean(
        m.supports_image_input || 
        m.image_in || 
        id.includes('kontext') || 
        id.includes('edit') || 
        id.includes('flux.2') || 
        id.includes('seedream') || 
        id.includes('mai-image') || 
        id.includes('flare') || 
        id.includes('sunburst')
      );

      imageModels.push({
        id: m.id || m.name,
        name: m.name || m.id,
        description: m.description || 'High quality AI image generation engine.',
        costPerGen,
        pricingLabel,
        rpm: m.rpm ? Number(m.rpm) : undefined,
        supportsImg2Img,
      });
    }

    return NextResponse.json({
      success: true,
      count: imageModels.length,
      models: imageModels,
    });
  } catch (error: any) {
    console.error('Failed to fetch live Pollinations models:', error);
    return NextResponse.json(
      { error: 'Failed to load model catalog', details: error.message },
      { status: 500 }
    );
  }
}