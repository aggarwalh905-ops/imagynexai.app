export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // 1. Security Check (Supports Authorization Header OR Query Parameter for direct browser testing)
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');

    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret) {
      const isHeaderValid = authHeader === `Bearer ${expectedSecret}`;
      const isQueryValid = querySecret === expectedSecret;

      if (!isHeaderValid && !isQueryValid) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing Cron Secret' },
          { status: 401 }
        );
      }
    }

    // 2. Fetch live models catalog from Pollinations API
    const response = await fetch('https://gen.pollinations.ai/v1/models', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Imagynex-AI-Sync/1.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Pollinations API: ${response.status} ${response.statusText}`);
    }

    const modelsData = await response.json();
    
    // Normalize model list based on structure (array or nested object)
    const modelsList = Array.isArray(modelsData) 
      ? modelsData 
      : (modelsData.data || modelsData.models || []);

    if (!modelsList || modelsList.length === 0) {
      return NextResponse.json({ success: false, message: 'No models received from Pollinations.' }, { status: 400 });
    }

    // 3. Transform and map models for database batch insertion
    const formattedRecords = modelsList.map((m: any) => {
      const modelId = m.id || m.name || 'unknown-model';
      
      // Smart category detection based on ID or metadata
      let category = m.category;
      if (!category) {
        const lowerId = modelId.toLowerCase();
        if (lowerId.includes('video') || lowerId.includes('wan') || lowerId.includes('seedance') || lowerId.includes('kling')) {
          category = 'Video';
        } else if (lowerId.includes('audio') || lowerId.includes('tts') || lowerId.includes('voice') || lowerId.includes('music')) {
          category = 'Audio';
        } else if (lowerId.includes('3d') || lowerId.includes('rodin') || lowerId.includes('trellis')) {
          category = '3D';
        } else if (lowerId.includes('gpt') || lowerId.includes('claude') || lowerId.includes('gemini') || lowerId.includes('llama') || lowerId.includes('qwen')) {
          category = 'Text';
        } else {
          category = 'Image'; // Default fallback
        }
      }

      // Extract approximate cost or pricing info if available
      const costPerGen = Number(m.cost || m.price || m.cost_per_gen || 0.002);

      return {
        id: modelId,
        name: m.name || modelId,
        category: category,
        description: m.description || m.details || '',
        cost_per_gen: isNaN(costPerGen) ? 0.002 : costPerGen,
        raw_data: m,
        updated_at: new Date().toISOString()
      };
    });

    // 4. Batch Upsert into Supabase for maximum performance
    const { error: upsertError } = await supabaseAdmin
      .from('pollinations_models')
      .upsert(formattedRecords, { onConflict: 'id' });

    if (upsertError) {
      throw new Error(`Supabase Upsert Error: ${upsertError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      count: formattedRecords.length,
      message: `Successfully synced ${formattedRecords.length} models from Pollinations AI.` 
    });

  } catch (error: any) {
    console.error('Model Sync Pipeline Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}