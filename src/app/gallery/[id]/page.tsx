import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Sparkles, Lock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import ShareAction from "@/lib/ShareAction";
import DownloadButton from "@/lib/DownloadButton";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. Metadata Logic
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { title: "Not Found" };
  }

  // Privacy check: If not gallery visible or explicitly marked private
  const isPrivate = data.is_gallery === false || data.isPrivate === true;
  if (isPrivate) {
    return { title: "Private Art | Imagynex" };
  }

  const imageUrl = data.image_url || data.imageUrl || "";
  const prompt = data.prompt || "";

  return {
    title: `${prompt.slice(0, 50)}... | Imagynex AI`,
    openGraph: {
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// 2. Main Page Component
export default async function ImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch Current Image
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Image not found
      </div>
    );
  }

  // --- PRIVACY CHECK ---
  const isPrivate = data.is_gallery === false || data.isPrivate === true;
  if (isPrivate) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <Lock className="text-indigo-500" size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
          This Art is Private
        </h2>
        <p className="text-zinc-400 max-w-md mb-8">
          The creator has restricted access to this masterpiece. You can explore
          other public artworks in our gallery.
        </p>
        <Link
          href="/gallery"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all"
        >
          Back to Gallery
        </Link>
      </div>
    );
  }

  // Fetch Related Images (Only Public)
  const { data: relatedData } = await supabase
    .from("generations")
    .select("*")
    .eq("is_gallery", true)
    .limit(5);

  const relatedImages = (relatedData || [])
    .filter((img) => img.id !== id)
    .slice(0, 4);

  // Field fallbacks for database column consistency
  const imageUrl = data.image_url || data.imageUrl || "";
  const prompt = data.prompt || "";
  const creatorName = data.creator_name || data.creatorName || "Anonymous";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto p-4 flex items-center justify-between border-b border-white/5">
        <Link
          href="/gallery"
          className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 group"
        >
          <ChevronLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-xs font-bold uppercase tracking-widest hidden md:block">
            Back to Gallery
          </span>
        </Link>
        <h1 className="text-sm font-black tracking-[0.3em] uppercase text-indigo-500">
          Imagynex
        </h1>
        <div className="w-10"></div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-24">
          <div className="relative rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 group">
            <img
              src={imageUrl}
              alt={prompt}
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="flex flex-col gap-8 sticky top-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  AI Generated Masterpiece
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-medium leading-tight text-zinc-100 italic">
                "{prompt}"
              </p>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
                {creatorName.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">
                  Artist
                </p>
                <p className="text-sm font-bold text-white tracking-wide">
                  {creatorName}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <DownloadButton
                imageUrl={imageUrl}
                watermarkText="Imagynex.AI"
              />
              <ShareAction imageUrl={imageUrl} prompt={prompt} />
            </div>
          </div>
        </div>

        {/* Related Images grid */}
        <div className="space-y-8 border-t border-white/5 pt-16">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-widest text-white/90">
              More from Community
            </h2>
            <Link
              href="/gallery"
              className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedImages.map((img: any) => {
              const relImgUrl = img.image_url || img.imageUrl || "";
              return (
                <Link
                  key={img.id}
                  href={`/gallery/${img.id}`}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 transition-all hover:border-indigo-500/50"
                >
                  <img
                    src={relImgUrl}
                    alt={img.prompt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-[8px] text-white font-bold truncate uppercase tracking-tighter w-full">
                      {img.prompt}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}