import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

// Har 1 ghante (3600 seconds) mein sitemap background me revalidate hokar naya data lega
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://imagynexai.vercel.app";
  let dynamicImageEntries: MetadataRoute.Sitemap = [];

  try {
    // Supabase se public images fetch karenge jo gallery me visible hain
    const { data: images, error } = await supabaseAdmin
      .from('generations')
      .select('id, created_at')
      .eq('is_gallery', true)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Supabase Sitemap Fetch Error:", error);
    } else if (images && images.length > 0) {
      dynamicImageEntries = images.map((img) => ({
        url: `${baseUrl}/gallery/${img.id}`,
        lastModified: img.created_at ? new Date(img.created_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error("Unexpected error in sitemap generation:", err);
    dynamicImageEntries = [];
  }

  const staticPages: MetadataRoute.Sitemap = [
    { 
      url: baseUrl, 
      lastModified: new Date(), 
      changeFrequency: 'hourly' as const, 
      priority: 1.0 
    },
    { 
      url: `${baseUrl}/gallery`, 
      lastModified: new Date(), 
      changeFrequency: 'hourly' as const, 
      priority: 0.9 
    },
    { 
      url: `${baseUrl}/leaderboard`, 
      lastModified: new Date(), 
      changeFrequency: 'daily' as const, 
      priority: 0.8 
    },
    { 
      url: `${baseUrl}/about`, 
      lastModified: new Date(), 
      changeFrequency: 'monthly' as const, 
      priority: 0.5 
    },
    { 
      url: `${baseUrl}/contact`, 
      lastModified: new Date(), 
      changeFrequency: 'monthly' as const, 
      priority: 0.5 
    },
    { 
      url: `${baseUrl}/privacy`, 
      lastModified: new Date(), 
      changeFrequency: 'yearly' as const, 
      priority: 0.3 
    },
  ];

  return [...staticPages, ...dynamicImageEntries];
}