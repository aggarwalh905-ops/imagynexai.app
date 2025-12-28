"use client";
import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, limit, where,
  startAfter, getDocs, doc, setDoc, updateDoc, increment, 
  arrayUnion, arrayRemove 
} from "firebase/firestore";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Download, Search, Sparkles, Share2, 
  User, Heart, Trophy, Edit3, Check, Zap, Eye, Flame, Crown, Medal, TrendingUp
} from 'lucide-react';

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  style?: string;
  createdAt?: any;
  likesCount?: number;
  creatorId?: string;
}

interface ArtistProfile {
  id: string;
  displayName: string;
  totalCreations: number;
  totalLikes: number;
  likedImages: string[];
}

function GalleryContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showMyCreations, setShowMyCreations] = useState(false);

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [leaderboard, setLeaderboard] = useState<ArtistProfile[]>([]);
  const [timeLeft, setTimeLeft] = useState("");

  const categories = ["All", "Trending", "Cinematic", "Anime", "Cyberpunk", "3D Render"];

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      const now = new Date();
      const nextSun = new Date();
      nextSun.setDate(now.getDate() + (7 - now.getDay()));
      nextSun.setHours(23, 59, 59);
      const diff = nextSun.getTime() - now.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let uid = localStorage.getItem('imagynex_uid') || 'u_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('imagynex_uid', uid);
    setUserId(uid);

    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        setProfile({ ...snap.data(), id: uid } as ArtistProfile);
        setNewName(snap.data().displayName);
      } else {
        setDoc(doc(db, "users", uid), { 
          displayName: `Creator_${uid.slice(0, 4)}`, 
          totalLikes: 0, 
          totalCreations: 0, 
          likedImages: [] 
        });
      }
    });

    const qLeader = query(collection(db, "users"), orderBy("totalLikes", "desc"), limit(3));
    const unsubLeader = onSnapshot(qLeader, (snap) => {
      setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArtistProfile)));
    });

    return () => { unsubUser(); unsubLeader(); };
  }, [mounted]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastImageElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !searchQuery && !showMyCreations) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, searchQuery, showMyCreations]);

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);

    let constraints: any[] = [];
    if (activeFilter === "Trending") constraints.push(orderBy("likesCount", "desc"));
    else constraints.push(orderBy("createdAt", "desc"));

    if (showMyCreations) {
      constraints.push(where("creatorId", "==", userId));
    } else if (activeFilter !== "All" && activeFilter !== "Trending") {
      constraints.push(where("style", "==", activeFilter));
    }

    const q = query(collection(db, "gallery"), ...constraints, limit(12));
    const unsub = onSnapshot(q, (snap) => {
      let fetchedImages = snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage));
      if (searchQuery.trim() !== "") {
        fetchedImages = fetchedImages.filter(img => img.prompt.toLowerCase().includes(searchQuery.toLowerCase()));
        setHasMore(false);
      } else {
        setHasMore(snap.docs.length === 12);
        setLastDoc(snap.docs[snap.docs.length - 1]);
      }
      setImages(fetchedImages);
      setLoading(false);
    });
    return () => unsub();
  }, [mounted, activeFilter, showMyCreations, userId, searchQuery]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    let constraints: any[] = [];
    if (activeFilter === "Trending") constraints.push(orderBy("likesCount", "desc"));
    else constraints.push(orderBy("createdAt", "desc"));
    if (showMyCreations) constraints.push(where("creatorId", "==", userId));

    const nextQ = query(collection(db, "gallery"), ...constraints, startAfter(lastDoc), limit(12));
    const snap = await getDocs(nextQ);
    if (!snap.empty) {
      const newImages = snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage));
      setImages(prev => [...prev, ...newImages]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 12);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const handleLike = async (e: React.MouseEvent, img: GalleryImage) => {
    e.stopPropagation();
    if (!profile || !userId) return;
    const isLiked = profile.likedImages?.includes(img.id);
    await updateDoc(doc(db, "users", userId), { likedImages: isLiked ? arrayRemove(img.id) : arrayUnion(img.id) });
    await updateDoc(doc(db, "gallery", img.id), { likesCount: increment(isLiked ? -1 : 1) });
    if (img.creatorId) {
      await updateDoc(doc(db, "users", img.creatorId), { totalLikes: increment(isLiked ? -1 : 1) });
    }
  };

  const downloadImage = async (img: GalleryImage) => {
    const response = await fetch(img.imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    ctx.drawImage(bitmap, 0, 0);
    const isWinner = leaderboard[0]?.id === userId;
    const isOwn = img.creatorId === userId;
    if (!(isWinner && isOwn)) {
      ctx.font = `bold ${canvas.width * 0.04}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.textAlign = "center";
      ctx.fillText("Imagynex.AI", canvas.width / 2, canvas.height - 40);
    }
    const link = document.createElement("a");
    link.download = `Imagynex-${img.id}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 font-sans selection:text-white">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-2.5 rounded-xl shadow-lg shadow-indigo-600/20 group-hover:rotate-12 transition-transform duration-500">
              <Sparkles size={20} fill="currentColor" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">
              Imagynex<span className="text-indigo-500 not-italic">.AI</span>
            </span>
          </Link>
          <div className="flex gap-3">
             <button onClick={() => setShowMyCreations(!showMyCreations)} className={`p-3 rounded-2xl border transition-all duration-300 ${showMyCreations ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-zinc-900/50 border-white/10 hover:border-white/20'}`}>
               <Eye size={20} className={showMyCreations ? "text-white" : "text-zinc-400"}/>
             </button>
             <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link Copied!"); }} className="p-3 bg-zinc-900/50 rounded-2xl border border-white/10 hover:bg-zinc-800 transition-all">
               <Share2 size={20} className="text-zinc-400"/>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        
        {/* HUD SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
          
          {/* USER CARD */}
          <div className="lg:col-span-4 bg-zinc-900/20 p-8 rounded-[40px] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[80px] -mr-16 -mt-16 group-hover:bg-indigo-600/20 transition-all duration-700"></div>
             
             <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-black/50">
                   <User size={38} className="text-white" />
                </div>
                <div className="flex-1">
                   {isEditing ? (
                     <input value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => { updateDoc(doc(db, "users", userId), {displayName: newName}); setIsEditing(false); }} autoFocus className="bg-zinc-800 border-2 border-indigo-500 rounded-xl px-3 py-2 font-black outline-none text-lg w-full text-indigo-100"/>
                   ) : (
                     <h2 onClick={() => setIsEditing(true)} className="text-2xl font-black uppercase italic tracking-tighter cursor-pointer flex items-center gap-2 group/name hover:text-indigo-400 transition-all">
                       {profile?.displayName} 
                       <Edit3 size={14} className="opacity-0 group-hover/name:opacity-100 transition-opacity text-indigo-400"/>
                     </h2>
                   )}
                   <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Rank #42</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-white/5">
                <div className="bg-white/5 p-4 rounded-3xl hover:bg-white/[0.08] transition-colors">
                   <p className="text-2xl font-black text-indigo-400 tracking-tight">{profile?.totalLikes || 0}</p>
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Points</p>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl hover:bg-white/[0.08] transition-colors">
                   <p className="text-2xl font-black text-white tracking-tight">{profile?.totalCreations || 0}</p>
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Creations</p>
                </div>
             </div>
          </div>

          {/* LEADERBOARD CARD */}
          <div className="lg:col-span-8 bg-zinc-900/20 p-8 rounded-[40px] border border-white/5 relative overflow-hidden backdrop-blur-sm">
             <div className="flex justify-between items-end mb-8">
                <div>
                   <h3 className="text-sm font-black uppercase tracking-[0.4em] text-indigo-500/80 mb-1">Global Standings</h3>
                   <h4 className="text-3xl font-black italic uppercase tracking-tighter">Hall of Fame</h4>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <TrendingUp size={12}/> Season Reset
                   </span>
                   <div className="bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                     <p className="text-xs font-black text-indigo-400 tabular-nums">{timeLeft}</p>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {leaderboard.map((artist, idx) => {
                  const colors = [
                    { bg: 'from-yellow-400 to-amber-600', text: 'text-amber-500', border: 'border-yellow-500/40', icon: 'text-yellow-500' },
                    { bg: 'from-slate-300 to-slate-500', text: 'text-slate-400', border: 'border-slate-500/40', icon: 'text-slate-400' },
                    { bg: 'from-orange-400 to-orange-700', text: 'text-orange-500', border: 'border-orange-500/40', icon: 'text-orange-600' }
                  ][idx] || { bg: 'from-zinc-600 to-zinc-800', text: 'text-zinc-500', border: 'border-white/5', icon: 'text-zinc-500' };

                  return (
                    <div key={artist.id} className={`group relative p-5 rounded-[32px] border transition-all duration-500 hover:-translate-y-1 bg-gradient-to-b from-white/[0.03] to-transparent ${colors.border}`}>
                       <div className="flex flex-col items-center text-center">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-4 shadow-xl ring-4 ring-black/20 group-hover:scale-110 transition-transform`}>
                             {idx === 0 ? <Crown size={28} className="text-black/80"/> : <span className="text-xl font-black text-black/80">{idx + 1}</span>}
                          </div>
                          <p className="text-xs font-black uppercase italic truncate max-w-full mb-1 group-hover:text-indigo-400 transition-colors">{artist.displayName}</p>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 rounded-full border border-white/5">
                            <Heart size={10} className={`${colors.icon}`} fill="currentColor"/>
                            <p className="text-[11px] font-bold text-zinc-300 tabular-nums">{artist.totalLikes.toLocaleString()}</p>
                          </div>
                       </div>
                       {idx === 0 && <div className="absolute top-4 right-4 animate-bounce"><Medal size={18} className="text-yellow-500/50"/></div>}
                    </div>
                  )
                })}
             </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="sticky top-[96px] z-40 bg-[#020202]/80 backdrop-blur-2xl py-6 space-y-5 border-b border-white/5 -mx-4 px-4">
          <div className="relative group max-w-3xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" size={20}/>
            <input 
              placeholder="Explore the prompt architecture..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/40 border-2 border-white/5 rounded-[24px] py-5 pl-14 pr-6 text-sm font-bold uppercase tracking-tight outline-none focus:border-indigo-500/40 focus:bg-indigo-500/5 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 justify-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveFilter(cat)} className={`whitespace-nowrap px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase border transition-all duration-300 flex items-center gap-2.5 ${activeFilter === cat ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.2)] scale-105' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'}`}>
                {cat === "Trending" && <Flame size={14} fill={activeFilter === "Trending" ? "black" : "none"}/>} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        {loading && images.length === 0 ? (
          <div className="py-40 text-center">
            <div className="relative inline-block">
               <Zap className="text-indigo-500 animate-pulse relative z-10" size={48}/>
               <div className="absolute inset-0 bg-indigo-600 blur-3xl opacity-20 animate-pulse"></div>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.8em] opacity-30 mt-6 animate-pulse">Calibrating Realities...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {images.map((img, idx) => {
              const isWinner = leaderboard[0]?.id === userId;
              const isOwn = img.creatorId === userId;
              const canDownloadFree = isWinner && isOwn;

              return (
                <div 
                  key={img.id} 
                  ref={idx === images.length - 1 ? lastImageElementRef : null}
                  className="group relative w-full aspect-[4/5] bg-zinc-900 rounded-[48px] overflow-hidden border border-white/5 shadow-2xl transition-all duration-700 hover:-translate-y-3 hover:shadow-indigo-500/10 hover:border-white/20"
                >
                  <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" loading="lazy" />
                  
                  <div className="absolute top-7 right-7 z-20">
                    <button 
                      onClick={(e) => handleLike(e, img)} 
                      className={`p-4.5 rounded-[22px] backdrop-blur-3xl border border-white/10 flex items-center gap-2.5 transition-all duration-500 ${profile?.likedImages?.includes(img.id) ? 'bg-red-500 border-red-400 scale-110 shadow-lg shadow-red-500/30' : 'bg-black/60 hover:bg-white hover:text-black hover:border-white'}`}
                    >
                      <Heart size={18} fill={profile?.likedImages?.includes(img.id) ? "white" : "none"} />
                      <span className="text-sm font-black">{img.likesCount || 0}</span>
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-5 translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => downloadImage(img)} 
                        className={`flex-1 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all active:scale-95 ${canDownloadFree ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}
                      >
                        <Download size={18}/> {canDownloadFree ? "Winner Asset" : "Download"}
                      </button>
                      <button onClick={() => router.push(`/?prompt=${img.prompt}`)} className="bg-zinc-800/80 p-4 rounded-2xl border border-white/10 hover:bg-indigo-600 hover:border-indigo-400 transition-all">
                        <Zap size={20} className="fill-white"/>
                      </button>
                    </div>
                    <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                       <p className="text-[10px] font-bold italic line-clamp-1 truncate w-40 text-zinc-400">"{img.prompt}"</p>
                       <span className="text-[9px] font-black uppercase bg-white/10 px-2 py-1 rounded-md">{img.style || 'AI'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !searchQuery && !showMyCreations && (
          <div className="flex justify-center mt-24 mb-20">
             <div className="flex items-center gap-4 bg-zinc-900/30 px-10 py-5 rounded-full border border-white/5 animate-pulse">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Streaming Assets</p>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Gallery() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <GalleryContent />
    </Suspense>
  );
}