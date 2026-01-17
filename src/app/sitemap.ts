import { MetadataRoute } from 'next';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";

// Google discovery ko hamesha fresh rakhne ke liye dynamic config
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Har 1 ghante mein naya data fetch karega

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://imagynexai.vercel.app";
  let imageEntries: MetadataRoute.Sitemap = [];
  
  try {
    const galleryRef = collection(db, "gallery");
    
    // Sirf public images fetch karenge jo index honi chahiye
    const q = query(
      galleryRef, 
      where("isPrivate", "==", false), 
      orderBy("createdAt", "desc"),
      limit(1000) 
    );

    const querySnapshot = await getDocs(q);
    
    imageEntries = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      
      return {
        url: `${baseUrl}/gallery/${doc.id}`, 
        // Firebase timestamp check
        lastModified: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });

  } catch (error) {
    console.error("Sitemap Fetch Error for Imagynex:", error);
    imageEntries = []; // Error aane par empty array taaki static pages bache rahein
  }

  const staticPages: MetadataRoute.Sitemap = [
    { 
      url: baseUrl, 
      lastModified: new Date(), 
      changeFrequency: 'always' as const, 
      priority: 1.0 
    },
    { 
      url: `${baseUrl}/gallery`, 
      lastModified: new Date(), 
      changeFrequency: 'daily' as const, 
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

  return [...staticPages, ...imageEntries];
}