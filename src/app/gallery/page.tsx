"use client";
import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, limit, where,
  startAfter, getDocs, doc, setDoc, updateDoc, increment, 
  arrayUnion, arrayRemove, getCountFromServer, getDoc
} from "firebase/firestore";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Download, Search, Sparkles, Share2, ArrowLeft,
  User, Heart, Users, LayoutGrid, Trophy, Edit3, Check, Zap, Eye, Flame, Crown, Medal, TrendingUp, Gift, Info, Star, ShieldCheck, BadgeCheck, Lock, Globe
} from 'lucide-react';

import { deleteDoc } from "firebase/firestore"; // Add this to your firestore imports
import { Trash2 } from 'lucide-react'; // Add this to your lucide imports
import { getAuth } from "firebase/auth";

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  creatorId: string;   // Removed the '?' because an image must have an owner
  creatorName: string; // Removed the '?' 
  likesCount: number;  // Removed the '?'
  style?: string;
  createdAt?: any;
  isPrivate?: boolean;
}

interface ArtistProfile {
  id: string;
  displayName: string;
  totalCreations: number;
  totalLikes: number;
  weeklyLikes: number; 
  likedImages: string[];
  lastReset?: any;
  isSeasonWinner?: boolean;
  isSecondPlace?: boolean;
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
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ArtistProfile[]>([]);
  const [myRank, setMyRank] = useState<number | string>("...");
  const [myGlobalRank, setMyGlobalRank] = useState<number | string>("...");
  const [timeLeft, setTimeLeft] = useState("");

  const now = new Date();
  const day = now.getDay();
  const isMonday = day === 1;
  const isTuesday = day === 2;
  const isSunday = day === 0;

  const categories = ["All", "Trending", "Liked", "Cinematic", "Anime", "Cyberpunk", "3D Render"];

  // 1. Add these states at the top of your component
  const [isAdmin, setIsAdmin] = useState(false);
  const [dbStats, setDbStats] = useState({ total: 0, public: 0, private: 0, storageMB: 0 });

  // 2. Add the Stats Fetcher
  const fetchAdminStats = async () => {
    try {
      const galleryRef = collection(db, "gallery");
      
      // 1. Get Absolute Total
      const totalSnap = await getCountFromServer(galleryRef);
      const total = totalSnap.data().count;

      // 2. Get Public (Explicitly marked false)
      const publicQuery = query(galleryRef, where("isPrivate", "==", false));
      const publicSnap = await getCountFromServer(publicQuery);
      const publicCount = publicSnap.data().count;

      // 3. Get Private (Explicitly marked true)
      const privateQuery = query(galleryRef, where("isPrivate", "==", true));
      const privateSnap = await getCountFromServer(privateQuery);
      const privateCount = privateSnap.data().count;

      // 4. Calculate Unknowns (Old images without the field)
      const unassigned = total - (publicCount + privateCount);

      setDbStats({
        total,
        public: publicCount + unassigned, // Treat old images as public
        private: privateCount,
        storageMB: Number(((total * 1.1) / 1024).toFixed(2))
      });
    } catch (error) {
      console.error("Stats Error:", error);
    }
  };

  // 3. Add the Admin Login Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Trigger admin if URL has ?view=admin
    if (params.get('view') === 'admin') {
      const password = window.prompt("Enter Admin Security Key:");
      
      // Compares prompt to the password in your .env.local file
      if (password === process.env.NEXT_PUBLIC_ADMIN_KEY) {
        setIsAdmin(true);
        fetchAdminStats();
        alert("Admin Access Authorized.");
      } else {
        alert("Access Denied.");
        router.push('/gallery');
      }
    }
  }, []);

  // 4. Admin Delete Function
  const adminDelete = async (imgId: string, creatorId: string) => {
    const confirm = window.confirm("ADMIN ACTION: Permanently delete this image?");
    if (!confirm) return;

    try {
      // 1. We perform the delete. 
      // To make this work with the rules above, you would usually need 
      // Firebase Auth. Since we are using a 'No-Auth' setup, 
      // set your Rules to 'allow delete: if true' ONLY when you are actively 
      // cleaning up, then set it back to 'false' for security.
      
      await deleteDoc(doc(db, "gallery", imgId));

      // 2. Decrement count for the user
      const userRef = doc(db, "users", creatorId);
      await updateDoc(userRef, {
        totalCreations: increment(-1)
      });

      // 3. Update UI
      setImages(prev => prev.filter(img => img.id !== imgId));
      fetchAdminStats();
      
      alert("Deleted successfully.");
    } catch (err: any) {
      console.error(err);
      alert("Delete failed: Permission Denied. (You must set 'allow delete: if true' in Firebase Rules to use this button without Auth)");
    }
  };

  const togglePrivacy = async (e: React.MouseEvent, imgId: string, currentStatus: boolean) => {
    e.stopPropagation();
    
    // 1. Local state ko turant update karein taaki button turant change ho
    setImages(prev => prev.map(img => 
      img.id === imgId ? { ...img, isPrivate: !currentStatus } : img
    ));

    try {
      const docRef = doc(db, "gallery", imgId);
      await updateDoc(docRef, {
        isPrivate: !currentStatus
      });
      console.log("Privacy updated successfully");
    } catch (err) {
      console.error("Error updating privacy:", err);
      // 2. Agar error aaye toh wapas purane state par le jayein
      setImages(prev => prev.map(img => 
        img.id === imgId ? { ...img, isPrivate: currentStatus } : img
      ));
      alert("Permission Denied: You don't have access to change this image.");
    }
  };

  const fetchRanks = async (weekly: number, total: number) => {
    try {
      const qSeason = query(collection(db, "users"), where("weeklyLikes", ">", weekly));
      const qGlobal = query(collection(db, "users"), where("totalLikes", ">", total));
      const [snapSeason, snapGlobal] = await Promise.all([
        getCountFromServer(qSeason),
        getCountFromServer(qGlobal)
      ]);
      setMyRank(snapSeason.data().count + 1);
      setMyGlobalRank(snapGlobal.data().count + 1);
    } catch (e) {
      console.error("Rank fetch error:", e);
    }
  };

  const checkAndResetSeason = async (uid: string, currentWeeklyLikes: number) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const lastReset = userData.lastReset?.toDate() || new Date(0);
      const today = new Date();
      
      if (isSunday && today.toDateString() !== lastReset.toDateString()) {
        const isTopOne = leaderboard[0]?.id === uid && currentWeeklyLikes > 0;
        const isTopTwo = leaderboard[1]?.id === uid && currentWeeklyLikes > 0;
        
        await updateDoc(userRef, {
          weeklyLikes: 0,
          lastReset: today,
          isSeasonWinner: isTopOne,
          isSecondPlace: isTopTwo
        });
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      const today = new Date();
      const nextSun = new Date();
      nextSun.setDate(today.getDate() + (today.getDay() === 0 ? 7 : 7 - today.getDay()));
      nextSun.setHours(0, 0, 0, 0); 
      
      const diff = nextSun.getTime() - today.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      
      if (diff <= 0) {
        setTimeLeft("RESETTING...");
      } else {
        setTimeLeft(`ENDS IN: ${d}d ${h}h ${m}m`);
      }
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
        const data = snap.data() as ArtistProfile;
        setProfile({ ...data, id: uid });
        setNewName(data.displayName);
        fetchRanks(data.weeklyLikes, data.totalLikes);
        if (isSunday) checkAndResetSeason(uid, data.weeklyLikes);
      } else {
        setDoc(doc(db, "users", uid), { 
          displayName: `Creator_${uid.slice(0, 4)}`, 
          totalLikes: 0, 
          weeklyLikes: 0,
          totalCreations: 0,
          likedImages: [],
          lastReset: new Date(),
          isSeasonWinner: false,
          isSecondPlace: false
        }, { merge: true });
      }
    });

    const qLeader = query(collection(db, "users"), orderBy("weeklyLikes", "desc"), limit(3));
    const unsubLeader = onSnapshot(qLeader, (snap) => {
      setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArtistProfile)));
    });

    const qGlobalLeader = query(collection(db, "users"), orderBy("totalLikes", "desc"), limit(3));
    const unsubGlobalLeader = onSnapshot(qGlobalLeader, (snap) => {
      setGlobalLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArtistProfile)));
    });

    return () => { unsubUser(); unsubLeader(); unsubGlobalLeader(); };
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

  // --- 1. MAIN FETCH FUNCTION ---
  useEffect(() => {
    if (!mounted) return;
    setLoading(true);

    const searchParams = new URLSearchParams(window.location.search);
    const artistIdFromUrl = searchParams.get('user');

    let constraints: any[] = [];

    // Sorting & Ownership logic
    if (showMyCreations) {
      constraints.push(where("creatorId", "==", userId));
    } else if (artistIdFromUrl) {
      constraints.push(where("creatorId", "==", artistIdFromUrl));
    } else if (activeFilter === "Liked") {
      // Check if profile exists and has liked images to avoid crash
      const likedIds = profile?.likedImages || [];
      if (likedIds.length > 0) {
        // Firestore "in" query limits to 30 IDs
        constraints.push(where("__name__", "in", likedIds.slice(0, 30)));
      } else {
        // If no liked images, immediately set empty and stop loading
        setImages([]);
        setLoading(false);
        return; 
      }
    }
    
    // Category Filter
    // Added "Liked" to the exclusion list so it doesn't conflict with style queries
    if (activeFilter !== "All" && activeFilter !== "Trending" && activeFilter !== "Liked" && !showMyCreations && !artistIdFromUrl) {
      constraints.push(where("style", "==", activeFilter));
    }

    // Order By
    if (activeFilter === "Trending") {
      constraints.push(orderBy("likesCount", "desc"));
    } else if (activeFilter === "Liked") {
      // Note: 'in' queries in Firestore usually don't allow orderBy 'createdAt' 
      // without a complex index, so we omit it for the Liked filter to stay safe
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }

    const q = query(collection(db, "gallery"), ...constraints, limit(100)); 
    
    const unsub = onSnapshot(q, (snap) => {
      let fetchedImages = snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage));

      // --- STRICTOR CLIENT-SIDE FILTERING ---
      // Yeh ensure karta hai ki doosron ki private images hide ho jayein
      fetchedImages = fetchedImages.filter(img => {
        // 1. Agar user "My Creations" tab mein hai, toh apni private images dikhao
        if (showMyCreations) {
          return true; 
        }

        // 2. Agar user Main Feed ya kisi aur ki profile dekh raha hai:
        // Toh 'Private' image kisi ko nahi dikhni chahiye (Aapko bhi nahi)
        if (img.isPrivate === true) {
          return false;
        }

        // 3. Baaki sab dikhao (Public + Purani images)
        return true;
      });

      // Search Filter
      if (searchQuery.trim() !== "") {
        fetchedImages = fetchedImages.filter(img => 
          img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setImages(fetchedImages);
      setHasMore(snap.docs.length === 100);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsub();
    // Added profile?.likedImages to dependency array so the tab updates when likes change
  }, [mounted, activeFilter, showMyCreations, userId, searchQuery, profile?.likedImages]);

  // --- 2. LOAD MORE FUNCTION ---
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    const searchParams = new URLSearchParams(window.location.search);
    const artistIdFromUrl = searchParams.get('user');

    let constraints: any[] = [];
    
    if (showMyCreations) {
        constraints.push(where("creatorId", "==", userId));
    } else if (artistIdFromUrl) {
        constraints.push(where("creatorId", "==", artistIdFromUrl));
    }

    if (activeFilter !== "All" && activeFilter !== "Trending" && !showMyCreations && !artistIdFromUrl) {
      constraints.push(where("style", "==", activeFilter));
    }

    if (activeFilter === "Trending") {
      constraints.push(orderBy("likesCount", "desc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }
    
    try {
      const nextQ = query(
        collection(db, "gallery"), 
        ...constraints, 
        startAfter(lastDoc), 
        limit(24) 
      );
      
      const snap = await getDocs(nextQ);
      
      if (!snap.empty) {
        let newImages = snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage));

        // --- STRICTOR CLIENT-SIDE FILTERING (Load More) ---
        newImages = newImages.filter(img => {
          if (img.creatorId === userId) return true;
          if (img.isPrivate === true) return false;
          return true; 
        });

        // Search Filter
        if (searchQuery.trim() !== "") {
          newImages = newImages.filter(img => 
            img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setImages(prev => [...prev, ...newImages]);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === 24);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("LoadMore Error:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteImage = async (
    e: React.MouseEvent | React.TouchEvent,
    imgId: string,
    creatorId: string
  ) => {
    e.stopPropagation();

    // This is your LocalStorage ID (e.g., "u_12345")
    const currentUid = userId; 

    // Check if the current user is actually the owner
    if (creatorId !== currentUid) {
      alert("Permission Denied: You can only delete images that you created on this browser.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure? This action will permanently remove this image from the gallery.");
    
    if (confirmDelete) {
      try {
        // 1. Delete the document from the 'gallery' collection
        await deleteDoc(doc(db, "gallery", imgId));

        // 2. Decrement the creation count in the 'users' collection
        const userRef = doc(db, "users", currentUid);
        await updateDoc(userRef, {
          totalCreations: increment(-1)
        });

        // 3. Remove from the local UI state
        setImages(prev => prev.filter(img => img.id !== imgId));
        
        alert("Creation successfully deleted.");
      } catch (error: any) {
        console.error("Firestore Delete Error:", error);
        
        if (error.code === 'permission-denied') {
          alert("Database Error: Permission Denied. Please ensure your Firebase Security Rules are published.");
        } else {
          alert("An unexpected error occurred: " + error.message);
        }
      }
    }
  };

  const handleLike = async (e: React.MouseEvent, img: GalleryImage) => {
    e.stopPropagation();
    if (!profile || !userId) return;
    const isLiked = profile.likedImages?.includes(img.id);
    await updateDoc(doc(db, "users", userId), { likedImages: isLiked ? arrayRemove(img.id) : arrayUnion(img.id) });
    await updateDoc(doc(db, "gallery", img.id), { likesCount: increment(isLiked ? -1 : 1) });
    if (img.creatorId) {
      await updateDoc(doc(db, "users", img.creatorId), { 
        totalLikes: increment(isLiked ? -1 : 1),
        weeklyLikes: increment(isLiked ? -1 : 1) 
      });
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

    const isOwn = img.creatorId === userId;
    const is1stEligible = (isMonday || isTuesday) && profile?.isSeasonWinner && isOwn;
    const is2ndEligible = isMonday && profile?.isSecondPlace && isOwn;

    if (!is1stEligible && !is2ndEligible) {
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
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 font-sans">
      {/* Mobile Back Header Overlay */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('user') && (
        <div className="max-w-7xl mx-auto px-4 mb-2 pt-4">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-2xl flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 bg-indigo-500 rounded-lg shadow-lg">
                <ArrowLeft size={16} className="text-white" />
              </button>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Viewing Artist</p>
                <h2 className="text-[10px] font-bold uppercase tracking-tight text-white">Public Collection</h2>
              </div>
            </div>
            <button onClick={() => { window.location.href = '/gallery'; }} className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all text-white active:scale-95">
              Exit
            </button>
          </div>
        </div>
      )}

      <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-[60] px-4 py-3 md:p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Link href="/" className="p-2 md:p-2.5 bg-zinc-900/50 rounded-xl border border-white/10 hover:bg-indigo-600 transition-all duration-300 group shadow-lg">
              <ArrowLeft size={16} className="text-zinc-400 group-hover:text-white" />
            </Link>
             <Link href="/" className="flex items-center gap-2 group">
                <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-1.5 md:p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-500">
                  <Sparkles size={16} fill="currentColor" />
                </div>
                <span className="font-black text-lg md:text-xl tracking-tighter uppercase italic">
                  Imagynex<span className="text-indigo-500 not-italic">.AI</span>
                </span>
             </Link>
          </div>
          
          {/* Optimized Header Toggle & Leaderboard Link */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-zinc-900/90 p-1 rounded-xl border border-white/10 flex items-center shadow-2xl backdrop-blur-md">
              
              {/* Community Button */}
              <button 
                onClick={() => setShowMyCreations(false)} 
                className={`px-3 py-2 md:px-4 md:py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                  !showMyCreations 
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Users size={16} className={!showMyCreations ? 'text-white' : 'text-zinc-500'} />
                <span className="hidden md:block">Community</span>
              </button>
              
              {/* My Studio Button */}
              <button 
                onClick={() => setShowMyCreations(true)} 
                className={`px-3 py-2 md:px-4 md:py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                  showMyCreations 
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LayoutGrid size={16} className={showMyCreations ? 'text-white' : 'text-zinc-500'} />
                <span className="hidden md:block">My Studio</span>
              </button>
            </div>

            {/* Leaderboard Link */}
            <Link 
              href="/leaderboard" 
              className="p-2 md:p-2.5 bg-zinc-900/80 rounded-xl border border-white/10 hover:bg-indigo-600 hover:border-indigo-400 transition-all duration-300 shadow-xl group"
            >
              <Trophy 
                size={16} 
                className="text-zinc-400 group-hover:text-white transition-colors" 
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {isAdmin && (
          <div className="max-w-7xl mx-auto px-4 mb-10">
            <div className="bg-zinc-900 border-2 border-red-500/30 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <ShieldCheck className="text-red-500 opacity-20" size={80} />
              </div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-red-500">System Administrator</h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Master Database Control</p>
                </div>
                <button onClick={() => setIsAdmin(false)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase transition-all">Logout</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Total Assets</p>
                  <p className="text-3xl font-black">{dbStats.total}</p>
                </div>
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Public/Private</p>
                  <p className="text-3xl font-black text-indigo-500">{dbStats.public} <span className="text-zinc-700">/</span> {dbStats.private}</p>
                </div>
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Database Weight</p>
                  <p className="text-3xl font-black text-emerald-500">{dbStats.storageMB} <span className="text-sm">MB</span></p>
                </div>
                <button onClick={fetchAdminStats} className="bg-white text-black rounded-3xl font-black uppercase text-[10px] hover:scale-95 transition-transform">Refresh Data</button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 md:mb-12">
            {/* GLOBAL RANK PROFILE CARD */}
            <div className={`lg:col-span-4 bg-zinc-900/20 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border relative overflow-hidden group transition-all duration-500 ${
                myGlobalRank === 1 ? 'border-yellow-500 shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]' :
                myGlobalRank === 2 ? 'border-slate-400 shadow-[0_0_40px_-10px_rgba(148,163,184,0.3)]' :
                myGlobalRank === 3 ? 'border-orange-600' : 'border-white/5'
            }`}>
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[80px] -mr-16 -mt-16"></div>
               <div className="flex items-center gap-4 md:gap-6 relative z-10">
                  <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500 ${
                    myGlobalRank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 
                    myGlobalRank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500' : 
                    myGlobalRank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-700' : 
                    'bg-zinc-800'
                  }`}>
                     {myGlobalRank === 1 ? <Crown size={28} className="text-black/80" /> : 
                      myGlobalRank === 2 ? <Medal size={28} className="text-black/80" /> : 
                      <User size={28} className="text-white" />}
                  </div>
                  <div className="flex-1">
                     {isEditing ? (
                       <input value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => { updateDoc(doc(db, "users", userId), {displayName: newName}); setIsEditing(false); }} autoFocus className="bg-zinc-800 border-2 border-indigo-500 rounded-xl px-3 py-1 font-black outline-none text-base md:text-lg w-full text-indigo-100"/>
                     ) : (
                       <h2 onClick={() => setIsEditing(true)} className="text-lg md:text-2xl font-black uppercase italic tracking-tighter cursor-pointer flex items-center gap-2 hover:text-indigo-400 transition-all">
                         {profile?.displayName} 
                         {(myGlobalRank === 1 || myGlobalRank === 2 || myGlobalRank === 3) && <BadgeCheck size={18} className="text-indigo-400 fill-indigo-400/20" />}
                         <Edit3 size={12} className="text-indigo-400 opacity-40"/>
                       </h2>
                     )}
                     <div className="flex flex-col gap-1 mt-1">
                         <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${myGlobalRank === 1 ? 'bg-yellow-400' : 'bg-indigo-500'}`}></div>
                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Global Rank #{myGlobalRank}</p>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                           <p className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest">Season Rank #{myRank}</p>
                         </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2 mt-6 md:mt-8 pt-6 border-t border-white/5">
                  <div className="bg-white/5 p-3 rounded-2xl text-center border border-indigo-500/10">
                     <p className="text-base md:text-lg font-black text-indigo-400">{profile?.totalLikes || 0}</p>
                     <p className="text-[7px] md:text-[8px] font-black uppercase text-zinc-500">Total Likes</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center border border-yellow-500/10">
                     <p className="text-base md:text-lg font-black text-yellow-500">{profile?.weeklyLikes || 0}</p>
                     <p className="text-[7px] md:text-[8px] font-black uppercase text-zinc-500">Season</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                     <p className="text-base md:text-lg font-black text-white">{profile?.totalCreations || 0}</p>
                     <p className="text-[7px] md:text-[8px] font-black uppercase text-zinc-500">Items</p>
                  </div>
               </div>
            </div>

          <div className="lg:col-span-8 bg-zinc-900/10 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-white/5">
              <div className="flex items-center gap-2 mb-6">
                <Info size={16} className="text-indigo-500" />
                <h4 className="text-xs md:text-sm font-black uppercase tracking-widest italic">Rewards Protocol</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 md:p-5 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group hover:border-yellow-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500"><Crown size={14} /></div>
                    <p className="text-[10px] font-black uppercase">Champion Prize</p>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-zinc-400 leading-relaxed font-bold">1st Place: <span className="text-white">NO WATERMARK</span> for <span className="text-yellow-500">2 Days</span> (Mon-Tue).</p>
                </div>
                <div className="p-4 md:p-5 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group hover:border-slate-400/30 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-500/20 rounded-lg text-slate-400"><Medal size={14} /></div>
                    <p className="text-[10px] font-black uppercase">Elite Prize</p>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-zinc-400 leading-relaxed font-bold">2nd Place: <span className="text-white">NO WATERMARK</span> for <span className="text-slate-300">Monday</span>.</p>
                </div>
                <div className="md:col-span-2 p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                       <TrendingUp size={14} className="text-indigo-500" />
                       <p className="text-[9px] font-black uppercase text-zinc-300">Ranks reset every Sunday at midnight.</p>
                    </div>
                    <div className="bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 w-full md:w-auto text-center">
                       <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{timeLeft}</p>
                    </div>
                </div>
              </div>
          </div>
        </div>

        {/* Hall of Fame */}
        <div className="mb-12">
            <h4 className="text-lg md:text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 px-2">
              <Star size={18} className="text-yellow-500 fill-yellow-500" /> Hall of Fame
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {leaderboard.map((artist, idx) => {
                   const colors = [
                     { bg: 'from-yellow-400 to-amber-600', border: 'border-yellow-500/40', icon: 'text-yellow-500' },
                     { bg: 'from-slate-300 to-slate-500', border: 'border-slate-500/40', icon: 'text-slate-400' },
                     { bg: 'from-orange-400 to-orange-700', border: 'border-orange-500/40', icon: 'text-orange-600' }
                   ][idx] || { bg: 'from-zinc-600 to-zinc-800', border: 'border-white/5', icon: 'text-zinc-500' };

                   return (
                     <div key={artist.id} onClick={() => router.push(`/gallery?user=${artist.id}`)} className={`group relative p-4 rounded-2xl border transition-all duration-500 bg-gradient-to-b from-white/[0.03] to-transparent ${colors.border} cursor-pointer hover:-translate-y-1`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-xl`}>
                               {idx === 0 ? <Crown size={20} className="text-black/80"/> : <span className="text-sm font-black text-black/80">{idx + 1}</span>}
                            </div>
                            <div className="flex-1">
                               <p className="text-[10px] font-black uppercase italic truncate flex items-center gap-1">
                                 {artist.displayName}
                                 <BadgeCheck size={10} className="text-indigo-400" />
                               </p>
                               <div className="flex flex-col gap-0.5 mt-1">
                                 <div className="flex items-center gap-1.5">
                                   <Heart size={8} className={`${colors.icon}`} fill="currentColor"/>
                                   <p className="text-[9px] font-bold text-zinc-400">{artist.weeklyLikes} Season Likes</p>
                                 </div>
                                 <p className="text-[7px] font-black text-yellow-500/70 uppercase">Season Rank #{idx + 1}</p>
                               </div>
                            </div>
                        </div>
                     </div>
                   )
                 })}
            </div>
        </div>

        {/* Search & Filter Sticky Bar */}
        <div className="sticky top-[64px] md:top-[88px] z-50 bg-[#020202]/95 backdrop-blur-xl py-4 space-y-4 border-b border-white/5 -mx-4 px-4 shadow-xl">
          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
            <input placeholder="Search Prompts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase outline-none focus:border-indigo-500/50 transition-all" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-start md:justify-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveFilter(cat)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[8px] font-black uppercase border transition-all flex items-center gap-2 ${activeFilter === cat ? 'bg-white text-black border-white' : 'bg-zinc-900/40 border-white/5 text-zinc-500'}`}>
                {cat === "Trending" && <Flame size={10} fill={activeFilter === "Trending" ? "black" : "none"}/>} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {loading && images.length === 0 ? (
          <div className="py-24 text-center">
            <Zap className="text-indigo-500 animate-pulse mx-auto mb-4" size={32} />
            <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">Generating Flow...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
            {images.map((img, idx) => {
              // LEADERBOARD RANK LOGIC
              const isGlobalRank1 = globalLeaderboard[0]?.id === img.creatorId;
              const isGlobalRank2 = globalLeaderboard[1]?.id === img.creatorId;
              const isGlobalRank3 = globalLeaderboard[2]?.id === img.creatorId;

              // OWNERSHIP & PRIZE ELIGIBILITY
              const isOwn = img.creatorId === userId;
              const is1stEligible = (isMonday || isTuesday) && profile?.isSeasonWinner && isOwn;
              const is2ndEligible = isMonday && profile?.isSecondPlace && isOwn;
              const hasPrize = is1stEligible || is2ndEligible;

              // GLOBAL LEVEL FRAMES
              const frameStyle = isGlobalRank1
                ? "border-yellow-500 shadow-[0_0_25px_-5px_rgba(234,179,8,0.4)] ring-1 ring-yellow-500/20"
                : isGlobalRank2
                  ? "border-slate-400 shadow-[0_0_15px_-5px_rgba(148,163,184,0.3)]"
                  : isGlobalRank3
                    ? "border-orange-600/50"
                    : "border-white/5";

              return (
                <div
                  key={img.id}
                  ref={idx === images.length - 1 ? lastImageElementRef : null}
                  className={`group relative w-full aspect-[4/5] bg-zinc-900 rounded-[24px] md:rounded-[40px] overflow-hidden border transition-all duration-500 ${frameStyle}`}
                >
                  {/* Gold Glow for Rank 1 */}
                  {isGlobalRank1 && <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 to-transparent pointer-events-none z-10" />}

                  {/* Main Image */}
                  <img
                    src={img.imageUrl}
                    className="w-full h-full object-cover transition-transform duration-[1s] group-hover:scale-105"
                    loading="lazy"
                    alt={img.prompt}
                  />

                  {/* ADMIN DELETE BUTTON - Only visible when isAdmin is true */}
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        adminDelete(img.id, img.creatorId);
                      }}
                      className="absolute top-4 right-14 z-50 p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-2xl transition-all active:scale-90 flex items-center gap-2 border border-red-400/50"
                    >
                      <Trash2 size={16} />
                      <span className="text-[10px] font-black uppercase">Admin Delete</span>
                    </button>
                  )}

                  {/* Small Private Indicator (Top Right) */}
                  {img.creatorId === userId && img.isPrivate && (
                    <div className="absolute top-2 right-2 bg-black/60 p-1 rounded-full z-20 md:hidden">
                      <Lock size={14} className="text-yellow-500" />
                    </div>
                  )}

                  {/* Badges (Top Left - Desktop/Global) */}
                  {(isGlobalRank1 || isGlobalRank2 || isGlobalRank3) && (
                    <div className={`absolute top-4 left-4 z-20 p-1.5 rounded-lg backdrop-blur-md border flex items-center gap-1.5 ${isGlobalRank1 ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500' :
                        isGlobalRank2 ? 'bg-slate-400/20 border-slate-400/40 text-slate-300' :
                          'bg-orange-600/20 border-orange-600/40 text-orange-500'
                      }`}>
                      {isGlobalRank1 ? <Crown size={12} /> : <ShieldCheck size={12} />}
                      <span className="text-[7px] font-black uppercase tracking-tighter">
                        {isGlobalRank1 ? "Global King" : isGlobalRank2 ? "Elite" : "Master"}
                      </span>
                    </div>
                  )}

                  {/* Privacy Toggle (Top Left) - Only shown to Owner */}
                  {isOwn && (
                    <button
                      onClick={(e) => togglePrivacy(e, img.id, !!img.isPrivate)}
                      className={`absolute top-4 left-4 z-30 p-2 md:p-2.5 rounded-xl backdrop-blur-xl border flex items-center gap-2 transition-all shadow-xl active:scale-90 ${img.isPrivate
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-500'
                          : 'bg-black/60 border-white/10 text-white hover:bg-indigo-600'
                        }`}
                    >
                      {img.isPrivate ? <Lock size={14} /> : <Globe size={14} className="text-green-400" />}
                      <span className="text-[8px] font-black uppercase tracking-tighter hidden md:block">
                        {img.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </button>
                  )}

                  {/* Like Button (Top Right) */}
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={(e) => handleLike(e, img)}
                      className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 flex items-center gap-2 transition-all ${profile?.likedImages?.includes(img.id) ? 'bg-red-500 border-red-400 text-white' : 'bg-black/60 text-white'}`}
                    >
                      <Heart size={14} fill={profile?.likedImages?.includes(img.id) ? "white" : "none"} />
                      <span className="text-[10px] font-black">{img.likesCount || 0}</span>
                    </button>
                  </div>

                  {/* Bottom Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-3 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    
                    {/* Creator Name Label */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                        <User size={8} className="text-white" />
                      </div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tight">
                        {img.creatorName || 'Anonymous Creator'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadImage(img)}
                        className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${hasPrize ? 'bg-yellow-500 text-black' : 'bg-white text-black'}`}
                      >
                        {hasPrize ? <Gift size={14} /> : <Download size={14} />}
                        {hasPrize ? "No Watermark" : "Download"}
                      </button>
                      <button
                        onClick={() => router.push(`/?prompt=${encodeURIComponent(img.prompt)}`)}
                        className="bg-zinc-800/80 p-2.5 rounded-lg border border-white/10 hover:bg-indigo-600 transition-colors"
                      >
                        <Zap size={14} className="fill-white" />
                      </button>
                    </div>

                    {/* Prompt & Style Tag */}
                    <div className="flex items-center justify-between opacity-60">
                      <p className="text-[8px] font-bold italic line-clamp-1 truncate flex-1 text-zinc-400">"{img.prompt}"</p>
                      <span className="text-[7px] font-black uppercase bg-white/10 px-1.5 py-0.5 rounded ml-2">{img.style || 'AI'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {loadingMore && (
           <div className="py-10 text-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
           </div>
        )}
      </main>
    </div>
  );
}

export default function Gallery() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Zap className="text-indigo-500 animate-pulse" /></div>}>
      <GalleryContent />
    </Suspense>
  );
}