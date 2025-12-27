"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  startAfter, 
  getDocs,
  deleteDoc,
  doc,
  getCountFromServer 
} from "firebase/firestore";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Search, Sparkles, ArrowLeft, Share2, Trash2, Database, Zap, HardDrive } from 'lucide-react';

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  style?: string;
  seed?: string;
  createdAt?: any;
}

export default function Gallery() {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  const categories = ["All", "Cinematic", "Anime", "Cyberpunk", "3D Render", "Oil Painting"];

  // 1. Admin Access Check & Fetch Total Count
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Your specific secret key
    if (params.get('admin') === process.env.NEXT_PUBLIC_ADMIN_KEY) {
      setIsAdmin(true);
      const fetchTotalCount = async () => {
        try {
          const coll = collection(db, "gallery");
          const snapshot = await getCountFromServer(coll);
          setTotalCount(snapshot.data().count);
        } catch (e) { console.error(e); }
      };
      fetchTotalCount();
    }
  }, []);

  // 2. Initial Fetch
  useEffect(() => {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GalleryImage[];
      setImages(docs);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
      if (snapshot.docs.length < 12) setHasMore(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Admin Delete Function
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("CRITICAL: Permanent Deletion?")) {
      try {
        await deleteDoc(doc(db, "gallery", id));
        setTotalCount(prev => prev - 1);
      } catch (error) {
        alert("Unauthorized.");
      }
    }
  };

  // 4. Pagination Load More
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const nextQuery = query(collection(db, "gallery"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(12));
    try {
      const snapshot = await getDocs(nextQuery);
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GalleryImage[];
        setImages(prev => [...prev, ...newDocs]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        if (snapshot.docs.length < 12) setHasMore(false);
      }
    } catch (error) { console.error(error); } finally { setLoadingMore(false); }
  };

  const handleRemix = (img: GalleryImage) => {
    const params = new URLSearchParams({
      prompt: img.prompt,
      style: img.style || "Default",
      seed: img.seed || "",
      img: img.imageUrl,
      id: img.id
    });
    router.push(`/?${params.toString()}`);
  };

  const downloadImg = async (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Imagynex-${filename}.jpg`;
      link.click();
    } catch (e) { window.open(url, "_blank"); }
  };

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const matchesSearch = img.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "All" || img.style === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [images, searchQuery, activeFilter]);

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-all">
              <Sparkles size={20} fill="currentColor" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">
              Imagynex<span className="text-indigo-500 not-italic"> AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
             {isAdmin && (
               <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 animate-pulse">
                 <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                 <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">Master Admin</span>
               </div>
             )}
             <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition">
               <ArrowLeft size={14} /> Back to Studio
             </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* TITLE AND SEARCH */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-16">
          <div className="space-y-8">
            {/* STATS BOX - ONLY VISIBLE TO ADMIN */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-5 py-2.5 rounded-2xl">
                    <Database size={16} className="text-indigo-500" />
                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Total Entries</p>
                      <p className="text-xs font-bold text-indigo-400">{totalCount}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-5 py-2.5 rounded-2xl">
                    <HardDrive size={16} className="text-blue-500" />
                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Storage Weight</p>
                      <p className="text-xs font-bold text-blue-400">{(totalCount * 1.5 / 1024).toFixed(2)} MB</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-5 py-2.5 rounded-2xl">
                    <Zap size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Sync Status</p>
                      <p className="text-xs font-bold text-emerald-400">Realtime</p>
                    </div>
                 </div>
              </div>
            )}
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter italic uppercase leading-[0.8]">
              Global <span className="text-indigo-500">Archive</span>
            </h1>
          </div>

          <div className="w-full lg:w-[400px] relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" size={22} />
            <input 
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/30 border border-white/10 rounded-[32px] py-7 pl-16 pr-8 text-sm outline-none focus:border-indigo-500/50 focus:bg-zinc-900/60 transition-all font-bold uppercase tracking-widest"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-12 no-scrollbar">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              className={`whitespace-nowrap px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilter === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 animate-pulse">Syncing Neurons...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {filteredImages.map((img) => (
                <div key={img.id} onClick={() => handleRemix(img)} 
                  className="group relative aspect-[3/4] rounded-[50px] overflow-hidden border border-white/5 bg-zinc-900/20 transition-all hover:border-indigo-500/50 cursor-pointer active:scale-95 shadow-2xl"
                >
                  <img src={img.imageUrl} alt="AI" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" />
                  
                  {/* LAPTOP HOVER OVERLAY: md:opacity-0 hides it until group-hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500">
                     <div className="bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[40px] p-6 space-y-6 transform translate-y-4 md:translate-y-8 md:group-hover:translate-y-0 transition-transform duration-500">
                        <p className="text-[11px] text-zinc-100 font-bold leading-relaxed line-clamp-3 uppercase italic tracking-tight opacity-95">
                          "{img.prompt}"
                        </p>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                             <span className="px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                               {img.style || 'Neural'}
                             </span>
                             {isAdmin && (
                               <button onClick={(e) => handleDelete(e, img.id)} className="p-2.5 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
                                 <Trash2 size={16} />
                               </button>
                             )}
                          </div>
                          <button onClick={(e) => downloadImg(e, img.imageUrl, img.id)} className="p-3.5 bg-white text-black rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-xl">
                            <Download size={20} />
                          </button>
                        </div>
                        <div className="w-full py-4 bg-indigo-600/90 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-center flex items-center justify-center gap-2 group-hover:bg-indigo-500 transition-colors shadow-lg">
                          <Share2 size={14} /> Remix Data
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-28">
                <button onClick={loadMore} disabled={loadingMore}
                  className="px-16 py-6 bg-zinc-900 border border-white/10 rounded-[32px] text-[12px] font-black uppercase tracking-[0.5em] hover:bg-indigo-600 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? "Accessing Core..." : "Load More Concepts"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 text-center mt-20 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[1em]">Imagynex Archive System</p>
      </footer>
    </div>
  );
}