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
  Download, Search, Sparkles, UserMinus, Share2, ArrowLeft,
  User, Heart, Users, LayoutGrid, Trophy, Edit3, Check, Zap, Eye, Flame, Crown, Medal, TrendingUp, Gift, Info, Star, ShieldCheck, BadgeCheck, Lock, Globe
} from 'lucide-react';
import DownloadButton from "@/lib/DownloadButton";

import AdminInbox from "@/lib/AdminInbox";

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
  monthlyLikes: number; // New: Monthly tracker
  likedImages: string[];
  lastMonthlyReset?: any; // New: Track month changes
  // Remove weeklyLikes, isSeasonWinner, isSecondPlace
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
  const [myMonthlyRank, setMyMonthlyRank] = useState<number>(0);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<ArtistProfile[]>([]);

  const now = new Date();
  const day = now.getDay();
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

  const resetMonthlyLikes = async () => {
    const now = new Date();
    const currentDate = now.getDate(); // Mahine ki date (1-31)

    // Logic: Sirf mahine ki 1st se 7th date tak allow karein
    if (currentDate > 7) {
      alert("ACCESS DENIED: Reset is only allowed during the first week of the month (1st - 7th).");
      return;
    }

    const confirmReset = window.confirm("⚠️ DANGER: Reset ALL users' monthly likes to 0? This cannot be undone.");
    if (!confirmReset) return;

    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);

      querySnapshot.forEach((userDoc) => {
        batch.update(userDoc.ref, { 
          monthlyLikes: 0,
          lastMonthlyReset: now 
        });
      });

      await batch.commit();
      alert("SUCCESS: All monthly likes have been reset to 0.");
      fetchAdminStats();
    } catch (err: any) {
      console.error("Reset Error:", err);
      alert("Reset failed: Permission Denied.");
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

  // 2. Updated function with Types and proper checks
  const fetchRanks = async (totalLikes: number = 0, monthlyLikes: number = 0) => {
    try {
      // If likes are undefined, we stop here to prevent Firestore errors
      if (typeof totalLikes !== 'number' || typeof monthlyLikes !== 'number') return;

      // --- GLOBAL RANK CALCULATION ---
      const qGlobal = query(
        collection(db, "users"), 
        where("totalLikes", ">", totalLikes)
      );
      const globalSnap = await getCountFromServer(qGlobal);
      // Setting global rank (count of people above you + 1)
      setMyGlobalRank(globalSnap.data().count + 1);

      // --- MONTHLY RANK CALCULATION ---
      const qMonthly = query(
        collection(db, "users"), 
        where("monthlyLikes", ">", monthlyLikes)
      );
      const monthlySnap = await getCountFromServer(qMonthly);
      // Setting monthly rank
      setMyMonthlyRank(monthlySnap.data().count + 1);

    } catch (error) {
      console.error("Error fetching ranks:", error);
      // Safety fallback to prevent UI breakage
      setMyGlobalRank(0);
      setMyMonthlyRank(0);
    }
  };

  useEffect(() => {
    setMounted(true);
    
    const timer = setInterval(() => {
      const now = new Date();
      // Targets Midnight of the 1st of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      
      const diff = nextMonth.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("SEASON RESETTING...");
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        
        // Fixed: Explicit type for 'num' to stop the error
        const pad = (val: number) => String(val).padStart(2, '0');
        
        setTimeLeft(`${d}D ${pad(h)}H ${pad(m)}M ${pad(s)}S`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let uid = localStorage.getItem('imagynex_uid') || 'u_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('imagynex_uid', uid);
    setUserId(uid);

    // 1. User Profile & Monthly Reset Logic
    const unsubUser = onSnapshot(doc(db, "users", uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const now = new Date();
        const lastReset = data.lastMonthlyReset?.toDate() || new Date(0);
        
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          await updateDoc(doc(db, "users", uid), {
            monthlyLikes: 0,
            lastMonthlyReset: now
          });
        }

        setProfile({ ...data, id: uid } as ArtistProfile);
        setNewName(data.displayName);
        fetchRanks(data.totalLikes, data.monthlyLikes || 0);
      } else {
        await setDoc(doc(db, "users", uid), { 
          displayName: `Creator_${uid.slice(0, 4)}`, 
          totalLikes: 0, 
          monthlyLikes: 0,
          totalCreations: 0,
          likedImages: [],
          lastMonthlyReset: new Date()
        }, { merge: true });
      }
    });

    // 2. Global Leaderboard (Total Likes ke basis par)
    const qGlobal = query(collection(db, "users"), orderBy("totalLikes", "desc"), limit(10));
    const unsubGlobal = onSnapshot(qGlobal, (snap) => {
      setGlobalLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArtistProfile)));
    });

    // 3. NEW: Monthly Leaderboard (Season Rankers - Isse Hall of Fame chalega)
    const qMonthly = query(
      collection(db, "users"), 
      orderBy("monthlyLikes", "desc"), 
      limit(10)
    );
    
    const unsubMonthly = onSnapshot(qMonthly, (snap) => {
      setMonthlyLeaderboard(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as ArtistProfile)));
    });

    // Cleanup: Teeno listeners ko band karna zaroori hai
    return () => { 
      unsubUser(); 
      unsubGlobal(); 
      unsubMonthly(); 
    };
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

    // --- LIKED FILTER LOGIC ---
    if (activeFilter === "Liked") {
      const likedIds = profile?.likedImages || [];
      if (likedIds.length > 0) {
        if (likedIds.length <= 30) {
          constraints.push(where("__name__", "in", likedIds));
        }
      } else {
        setImages([]);
        setLoading(false);
        return;
      }
    } 
    // --- OTHER FILTERS ---
    else if (showMyCreations) {
      constraints.push(where("creatorId", "==", userId));
      constraints.push(orderBy("createdAt", "desc"));
    } else if (artistIdFromUrl) {
      constraints.push(where("creatorId", "==", artistIdFromUrl));
      constraints.push(orderBy("createdAt", "desc"));
    } else {
      if (activeFilter !== "All" && activeFilter !== "Trending") {
        constraints.push(where("style", "==", activeFilter));
      }
      const orderField = activeFilter === "Trending" ? "likesCount" : "createdAt";
      constraints.push(orderBy(orderField, "desc"));
    }

    const q = query(collection(db, "gallery"), ...constraints, limit(100));

    const unsub = onSnapshot(q, (snap) => {
      let fetchedImages = snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage));

      // --- UPDATED CLIENT-SIDE FILTER ---
      fetchedImages = fetchedImages.filter(img => {
        // 1. If viewing liked tab, only show images in liked list
        if (activeFilter === "Liked") return profile?.likedImages?.includes(img.id);
        
        // 2. If viewing 'My Studio', show everything (even your own private ones)
        if (showMyCreations) return true;

        // 3. NEW: If user is ADMIN, show EVERYTHING (Public + Private)
        if (isAdmin) return true;

        // 4. Regular users only see public images
        return img.isPrivate !== true;
      });

      // --- RECENTLY LIKED SORTING ---
      if (activeFilter === "Liked" && profile?.likedImages) {
        fetchedImages.sort((a, b) => {
          const indexA = profile.likedImages.indexOf(a.id);
          const indexB = profile.likedImages.indexOf(b.id);
          return indexB - indexA;
        });
      }

      if (searchQuery.trim() !== "") {
        fetchedImages = fetchedImages.filter(img => 
          img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setImages(fetchedImages);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 100);
      setLoading(false);
    });

    return () => unsub();
    // Added isAdmin to dependencies so it refreshes when admin logs in
  }, [mounted, activeFilter, showMyCreations, userId, searchQuery, profile?.likedImages, isAdmin]);

  // --- 2. LOAD MORE FUNCTION ---
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    let constraints: any[] = [];

    // 1. Core Logic Filters (Ownership & Artist Profile)
    const searchParams = new URLSearchParams(window.location.search);
    const artistIdFromUrl = searchParams.get('user');

    if (showMyCreations) {
      constraints.push(where("creatorId", "==", userId));
    } else if (artistIdFromUrl) {
      constraints.push(where("creatorId", "==", artistIdFromUrl));
    }

    // 2. Category Style Filter
    if (activeFilter !== "All" && activeFilter !== "Trending" && activeFilter !== "Liked" && !showMyCreations && !artistIdFromUrl) {
      constraints.push(where("style", "==", activeFilter));
    }

    // 3. Sorting Constraints
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

        // 4. UPDATED: Strict Client-side Filtering for Admin
        newImages = newImages.filter(img => {
          // Liked Tab Logic
          if (activeFilter === "Liked") {
            return profile?.likedImages?.includes(img.id);
          }
          
          // My Studio Logic (Show own private images)
          if (showMyCreations) return true;

          // NEW: Admin Override Logic
          // If user is admin, they skip the privacy check
          if (isAdmin) return true;

          // Public/Private Logic for regular users
          if (img.isPrivate === true) return false;
          return true;
        });

        // 5. Search Filter
        if (searchQuery.trim() !== "") {
          newImages = newImages.filter(img =>
            img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setImages(prev => {
          const combined = [...prev, ...newImages];
          
          // 6. Recently Liked Sorting
          if (activeFilter === "Liked" && profile?.likedImages) {
            return combined.sort((a, b) => {
              const idxA = profile.likedImages.indexOf(a.id);
              const idxB = profile.likedImages.indexOf(b.id);
              return idxB - idxA;
            });
          }
          return combined;
        });

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

  const handleLike = async (e: React.MouseEvent, img: GalleryImage) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId || !profile) return;

    // FIX 1: Change "images" to "gallery" to match your database
    const imgRef = doc(db, "gallery", img.id); 
    const userRef = doc(db, "users", userId);
    const creatorRef = doc(db, "users", img.creatorId);
    
    const isLiked = profile.likedImages?.includes(img.id);
    const isSelfLike = userId === img.creatorId;

    try {
      // 1. Update Current User's Liked List
      await updateDoc(userRef, {
        likedImages: isLiked ? arrayRemove(img.id) : arrayUnion(img.id)
      });

      // 2. Update Image Like Count in the GALLERY collection
      await updateDoc(imgRef, {
        likesCount: increment(isLiked ? -1 : 1)
      });

      // 3. Update Creator's Stats (Only if it's not a self-like, 
      // or handle carefully if it is to avoid double-updating userRef)
      if (!isSelfLike) {
        await updateDoc(creatorRef, {
          totalLikes: increment(isLiked ? -1 : 1),
          monthlyLikes: increment(isLiked ? -1 : 1)
        });
      } else {
        // If liking own image, update the same profile doc for the stats
        await updateDoc(userRef, {
          totalLikes: increment(isLiked ? -1 : 1),
          monthlyLikes: increment(isLiked ? -1 : 1)
        });
      }

    } catch (err) {
      console.error("Like failed:", err);
      alert("Action failed. Please check your internet or Firebase rules.");
    }
  };

  const updateNameGlobally = async () => {
    if (!newName || newName.trim() === "" || newName === profile?.displayName) {
      setIsEditing(false);
      return;
    }

    try {
      // 1. Update the User document (This fixes the Leaderboard)
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { 
        displayName: newName,
        // Ensure this field exists for the leaderboard listener
        lastActive: new Date() 
      });

      // 2. Find all images created by this user to update their "creatorName"
      const imgQuery = query(
        collection(db, "gallery"), 
        where("creatorId", "==", userId)
      );
      const querySnapshot = await getDocs(imgQuery);

      // 3. Batch update all gallery images (This fixes the Gallery display)
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);

      querySnapshot.forEach((imageDoc) => {
        batch.update(imageDoc.ref, { creatorName: newName });
      });

      await batch.commit();

      setIsEditing(false);
      // Optional: Refresh local state to show change immediately
      setNewName(newName);
      
    } catch (error) {
      console.error("Global Update Error:", error);
      alert("Update failed. Check your internet connection.");
      setNewName(profile?.displayName || "");
      setIsEditing(false);
    }
  };

  const nukeUserImages = async (targetUserId: string) => {
    if (!targetUserId) {
      alert("Error: No User ID found for this asset.");
      return;
    }

    setLoading(true);

    try {
      // 1. Find all documents where creatorId matches
      const galleryRef = collection(db, "gallery");
      const q = query(galleryRef, where("creatorId", "==", targetUserId));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("No images found for this user.");
        setLoading(false);
        return;
      }

      // 2. Delete all found documents
      const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, "gallery", d.id)));
      
      // Wait for all deletions to finish
      await Promise.all(deletePromises);

      // 3. Update UI: Remove all images belonging to this user from the current view
      setImages((prev) => prev.filter((img) => img.creatorId !== targetUserId));

      alert(`SUCCESS: Nuked ${snap.docs.length} images from the database.`);
    } catch (error: any) {
      console.error("Nuke Operation Failed:", error);
      alert(`System Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // GalleryContent function ke return ke andar, sabse upar:
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "ImageGallery",
    "name": "Imagynex AI Neural Art Gallery",
    "description": "Explore top-tier AI generated images, prompts, and neural art masterpieces.",
    "url": "https://imagynexai.vercel.app/gallery",
    "image": images.slice(0, 5).map(img => img.imageUrl) // Top 5 images ko schema mein dalna
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 font-sans">
      
      {/* JSON-LD Script for Google SEO */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />

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
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <Users size={16} className={!showMyCreations ? 'text-white' : 'text-zinc-400'} />
                <span className="hidden md:block">Community</span>
              </button>
              
              {/* My Studio Button */}
              <button 
                onClick={() => setShowMyCreations(true)} 
                className={`px-3 py-2 md:px-4 md:py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                  showMyCreations 
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <LayoutGrid size={16} className={showMyCreations ? 'text-white' : 'text-zinc-400'} />
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
              {/* Decorative Background Icon */}
              <div className="absolute top-0 right-0 p-4">
                <ShieldCheck className="text-red-500 opacity-20" size={80} />
              </div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-red-500 p-2 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    <Lock size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-red-500 leading-none">System Administrator</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Full Database Access Active</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdmin(false)} 
                  className="px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase transition-all duration-300 active:scale-95"
                >
                  Logout Admin
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                {/* Total Assets */}
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Total Assets</p>
                  <p className="text-3xl font-black text-white">{dbStats.total}</p>
                </div>

                {/* Public vs Private */}
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Public / Private</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-black text-indigo-500">{dbStats.public}</p>
                    <span className="text-zinc-600 font-bold">/</span>
                    <p className="text-xl font-black text-zinc-400">{dbStats.private}</p>
                  </div>
                </div>

                {/* Database Weight */}
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">DB Weight</p>
                  <p className="text-3xl font-black text-emerald-500">{dbStats.storageMB} <span className="text-sm">MB</span></p>
                </div>

                {/* Monthly Reset Control */}
                {(() => {
                  const today = new Date().getDate();
                  const isFirstWeek = today >= 1 && today <= 7;

                  return (
                    <button 
                      onClick={resetMonthlyLikes}
                      disabled={!isFirstWeek}
                      className={`relative overflow-hidden transition-all duration-300 rounded-3xl font-black uppercase text-[10px] flex flex-col items-center justify-center gap-1 p-4
                        ${isFirstWeek 
                          ? "bg-red-600/10 hover:bg-red-600 border border-red-500/50 text-red-500 hover:text-white cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.1)]" 
                          : "bg-zinc-900/50 border border-white/5 text-zinc-600 cursor-not-allowed opacity-50"
                        }`}
                    >
                      <Flame size={18} className={isFirstWeek ? "animate-pulse" : ""} />
                      <span className="tracking-tighter">{isFirstWeek ? "Reset Season" : "Reset Locked"}</span>
                      {!isFirstWeek && <span className="text-[7px] font-bold opacity-60">Opens 1st-7th</span>}
                    </button>
                  );
                })()}

                {/* Refresh Logic */}
                <button 
                  onClick={fetchAdminStats} 
                  className="bg-white hover:bg-zinc-200 text-black rounded-3xl font-black uppercase text-[10px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <Zap size={18} fill="currentColor" />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>
            <AdminInbox isAdmin={isAdmin} />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 md:mb-12">
            {/* GLOBAL & MONTHLY RANK PROFILE CARD */}
          <div className={`lg:col-span-4 bg-zinc-900/20 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border relative overflow-hidden group transition-all duration-500 ${
              myGlobalRank === 1 ? 'border-yellow-500 shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]' :
              myGlobalRank === 2 ? 'border-slate-400 shadow-[0_0_40px_-10px_rgba(148,163,184,0.3)]' :
              myGlobalRank === 3 ? 'border-orange-600' : 'border-white/5'
          }`}>
              {/* Decorative Background Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 transition-colors duration-500 ${
                  myGlobalRank === 1 ? 'bg-yellow-500/20' : 'bg-indigo-600/10'
              }`}></div>

              <div className="flex items-center gap-4 md:gap-6 relative z-10">
                  {/* Rank Icon Container */}
                  <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500 ${
                      myGlobalRank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 
                      myGlobalRank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500' : 
                      myGlobalRank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-700' : 
                      'bg-zinc-800'
                  }`}>
                      {myGlobalRank === 1 ? <Crown size={28} className="text-black/80" /> : 
                      myGlobalRank === 2 ? <ShieldCheck size={28} className="text-black/80" /> : 
                      myGlobalRank === 3 ? <Zap size={28} className="text-black/80" /> : 
                      <User size={28} className="text-white" />}
                  </div>

                  <div className="flex-1">
                      {isEditing ? (
                          <input 
                              value={newName} 
                              onChange={e => setNewName(e.target.value)} 
                              onBlur={updateNameGlobally} 
                              onKeyDown={(e) => e.key === 'Enter' && updateNameGlobally()} 
                              autoFocus 
                              className="bg-zinc-800 border-2 border-indigo-500 rounded-xl px-3 py-1 font-black outline-none text-base md:text-lg w-full text-indigo-100"
                          />
                      ) : (
                          <div className="flex flex-col">
                              <h2 onClick={() => setIsEditing(true)} className="text-lg md:text-2xl font-black uppercase italic tracking-tighter cursor-pointer flex items-center gap-2 hover:text-indigo-400 transition-all">
                                  {profile?.displayName} 
                                  {(profile && Number(myGlobalRank) >= 1 && Number(myGlobalRank) <= 3) && (
                                    <BadgeCheck size={18} className="text-indigo-400 fill-indigo-400/20" />
                                  )}
                                <Edit3 size={12} className="text-indigo-400 opacity-40"/>
                              </h2>
                              {/* Prize Status Tag */}
                              {myGlobalRank === 1 && (
                                  <span className="text-[7px] font-black text-yellow-500 tracking-[0.2em] uppercase">Global Sovereign • Aura Active</span>
                              )}
                          </div>
                      )}

                      <div className="flex flex-col gap-1 mt-2">
                          {/* Global Stats */}
                          <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${myGlobalRank === 1 ? 'bg-yellow-400 animate-pulse' : 'bg-indigo-500'}`}></div>
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Global Rank #{myGlobalRank || '?'}</p>
                          </div>
                          
                          {/* Monthly Stats */}
                          <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Monthly Rank #{myMonthlyRank || '?'}</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Bottom Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mt-6 md:mt-8 pt-6 border-t border-white/5">
                  <div className="bg-white/5 p-3 rounded-2xl text-center border border-indigo-500/10">
                      <p className="text-base md:text-lg font-black text-indigo-400">{profile?.totalLikes || 0}</p>
                      <p className="text-[7px] md:text-[8px] font-black uppercase text-zinc-400">Total Likes</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center border border-emerald-500/10">
                      <p className="text-base md:text-lg font-black text-emerald-500">{profile?.monthlyLikes || 0}</p>
                      <p className="text-[7px] md:text-[8px] font-black uppercase text-zinc-400">Monthly</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                      <p className="text-base md:text-lg font-black text-white">{profile?.totalCreations || 0}</p>
                      <p className="text-[7px] md:text-[8px] font-black uppercase text-zinc-400">Items</p>
                  </div>
              </div>
            </div>
          </div>

          {/* HALL OF FAME & SEASON PROTOCOL */}
          <div className="lg:col-span-8 bg-zinc-900/20 border border-white/5 rounded-[32px] md:rounded-[40px] p-6 md:p-8 relative overflow-hidden group">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Active Monthly Season</h3>
                </div>
                <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">Hall of Fame</h2>
              </div>

              {/* Timer Display */}
              <div className="bg-black/40 border border-emerald-500/30 px-4 py-2 rounded-2xl flex items-center gap-3 backdrop-blur-xl">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Season Ends In</span>
                  <span className="text-sm font-black text-white tabular-nums tracking-tight">{timeLeft}</span>
                </div>
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
            </div>

            {/* Top 3 Podium Grid - CHANGED TO monthlyLeaderboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
              {monthlyLeaderboard.slice(0, 3).map((artist, index) => (
                <div key={artist.id} className={`p-5 rounded-[28px] border transition-all duration-500 hover:-translate-y-1 ${
                  index === 0 ? 'bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/20 shadow-[0_20px_40px_-15px_rgba(234,179,8,0.15)]' :
                  index === 1 ? 'bg-slate-400/5 border-slate-400/10' :
                  'bg-orange-600/5 border-orange-600/10'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black ${
                      index === 0 ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      #{index + 1}
                    </div>
                    {index === 0 && <Crown size={18} className="text-yellow-400" />}
                  </div>
                  <p className="text-xs font-black uppercase truncate text-zinc-100">{artist.displayName}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">{artist.monthlyLikes || 0}</span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Season Likes</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Prize Protocol Section */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-5 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Gift size={16} className="text-indigo-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Current Prize Pool</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-yellow-500 uppercase">Rank 1: Sovereign</p>
                  <p className="text-[10px] text-zinc-300 font-medium leading-tight">Golden Profile Aura + Verified Badge + Feature on Home</p>
                </div>
                <div className="space-y-1 border-l border-white/5 md:pl-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Rank 2: Elite</p>
                  <p className="text-[10px] text-zinc-300 font-medium leading-tight">Silver Profile Border + Verified Badge + High-Res Exports</p>
                </div>
                <div className="space-y-1 border-l border-white/5 md:pl-6">
                  <p className="text-[9px] font-black text-orange-600 uppercase">Rank 3: Master</p>
                  <p className="text-[10px] text-zinc-300 font-medium leading-tight">Bronze Badge + Early access to Neural Beta Styles</p>
                </div>
              </div>
            </div>

            {/* Decorative Background Icon */}
            <Trophy size={180} className="absolute -bottom-10 -right-10 text-white/[0.02] pointer-events-none rotate-12" />
          </div>

        {/* Search & Filter Sticky Bar */}
        <div className="sticky top-[64px] md:top-[88px] z-50 bg-[#020202]/95 backdrop-blur-xl py-4 space-y-4 border-b border-white/5 -mx-4 px-4 shadow-xl">
          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14}/>
            <input placeholder="Search Prompts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase outline-none focus:border-indigo-500/50 transition-all" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-start md:justify-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveFilter(cat)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[8px] font-black uppercase border transition-all flex items-center gap-2 ${activeFilter === cat ? 'bg-white text-black border-white' : 'bg-zinc-900/40 border-white/5 text-zinc-400'}`}>
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
              const isGlobalKing = globalLeaderboard?.[0]?.id === img.creatorId;
              const isGlobalElite = globalLeaderboard?.[1]?.id === img.creatorId || globalLeaderboard?.[2]?.id === img.creatorId;
              const isMonthlyWinner = monthlyLeaderboard?.[0]?.id === img.creatorId;
              const isOwn = img.creatorId === userId;
              
              const frameStyle = isGlobalKing
                ? "border-yellow-500 shadow-[0_0_50px_-12px_rgba(234,179,8,0.7)] ring-2 ring-yellow-500/30 scale-[1.01]" 
                : isGlobalElite
                  ? "border-indigo-500/50 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]"
                  : isMonthlyWinner
                    ? "border-emerald-500/50 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]"
                    : "border-white/5";

              return (
                <div
                  key={img.id}
                  ref={idx === images.length - 1 ? lastImageElementRef : null}
                  className={`group relative w-full aspect-[4/5] bg-zinc-900 rounded-[24px] md:rounded-[40px] overflow-hidden border transition-all duration-500 ${frameStyle} 
                    ${isAdmin && img.isPrivate ? "opacity-80 ring-2 ring-red-500/20" : ""}`}
                >
                  {/* 1. ADMIN MASTER OVERLAY */}
                  {isAdmin && (
                    <div className="absolute top-4 left-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
                      <div className="flex justify-between items-start w-full">
                        {/* Left: Status & Identity */}
                        <div className="flex flex-col gap-1">
                          <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter backdrop-blur-md border ${
                            img.isPrivate ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          }`}>
                            {img.isPrivate ? "HIDDEN" : "VISIBLE"}
                          </div>
                          <div className="bg-black/80 px-2 py-1 rounded-md text-[7px] text-zinc-400 font-mono border border-white/5 backdrop-blur-md">
                            CID: {img.creatorId.slice(0,8)}
                          </div>
                        </div>

                        {/* Right: Master Actions */}
                        <div className="flex gap-1 pointer-events-auto">
                          {/* Force Privacy Toggle */}
                          <button
                            onClick={(e) => { e.preventDefault(); togglePrivacy(e, img.id, !!img.isPrivate); }}
                            className="p-2 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-lg transition-all shadow-xl active:scale-90"
                          >
                            {img.isPrivate ? <Globe size={12} strokeWidth={3} /> : <Lock size={12} strokeWidth={3} />}
                          </button>

                          {/* THE NUKE BUTTON: Delete all images by this user */}
                          <button 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              if(confirm(`NUKE ALERT: Delete ALL images from user ${img.creatorName || img.creatorId}?`)) {
                                nukeUserImages(img.creatorId); 
                              }
                            }}
                            className="p-2 bg-orange-600 text-white rounded-lg shadow-xl hover:bg-orange-500 transition-all active:scale-90"
                            title="Nuke User Assets"
                          >
                            <UserMinus size={12} strokeWidth={3} />
                          </button>

                          {/* Single Delete */}
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); adminDelete(img.id, img.creatorId); }}
                            className="p-2 bg-red-600 text-white rounded-lg shadow-xl hover:bg-red-500 transition-all active:scale-90"
                          >
                            <Trash2 size={12} strokeWidth={3} />
                          </button>

                          <button onClick={(e) => handleLike(e, img)} className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 flex items-center gap-2 transition-all ${profile?.likedImages?.includes(img.id) ? 'bg-red-500 border-red-400 text-white' : 'bg-black/60 text-white'}`}>
                        <Heart size={14} fill={profile?.likedImages?.includes(img.id) ? "white" : "none"} />
                        <span className="text-[10px] font-black">{img.likesCount || 0}</span>
                      </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GOLDEN AURA & IMAGE LINK (Same as previous logic) */}
                  {isGlobalKing && <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 via-transparent to-yellow-500/10 animate-pulse pointer-events-none z-10" />}

                  <Link href={`/gallery/${img.id}`} className="block w-full h-full cursor-zoom-in">
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      className={`w-full h-full object-cover transition-transform duration-[1s] group-hover:scale-110 ${isAdmin && img.isPrivate ? "grayscale-[0.4] brightness-75" : ""}`}
                      loading="lazy"
                    />
                    {/* Prompt Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 flex flex-col items-center justify-center p-8 backdrop-blur-[2px]">
                      <p className="text-[11px] md:text-xs text-white/90 font-medium italic text-center line-clamp-4 mb-4 leading-relaxed">"{img.prompt}"</p>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(img.prompt); alert("Copied!"); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <Edit3 size={12} /> Copy Prompt
                      </button>
                    </div>
                  </Link>

                  {/* REGULAR UI LAYER */}
                  <div className="absolute top-4 inset-x-4 flex justify-between items-start z-30 pointer-events-none">
                    <div className="flex flex-col gap-2 pointer-events-auto">
                      {(isGlobalKing || isGlobalElite) && (
                        <div className={`p-1.5 rounded-lg backdrop-blur-md border flex items-center gap-1.5 ${isGlobalKing ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500' : 'bg-indigo-600/20 border-indigo-400/40 text-indigo-300'}`}>
                          {isGlobalKing ? <Crown size={12} /> : <ShieldCheck size={12} />}
                          <span className="text-[7px] font-black uppercase tracking-tighter">{isGlobalKing ? "Global Sovereign" : "Legendary Elite"}</span>
                        </div>
                      )}
                      {isOwn && !isAdmin && (
                        <button 
                          onClick={(e) => togglePrivacy(e, img.id, !!img.isPrivate)} 
                          className={`p-2 md:p-2.5 rounded-xl backdrop-blur-xl border flex items-center gap-2 transition-all shadow-xl active:scale-95 ${
                            img.isPrivate 
                              ? 'bg-orange-500/20 border-orange-500/40 text-orange-500' 
                              : 'bg-black/60 border-white/10 text-white hover:bg-black/80'
                          }`}
                        >
                          {/* Icon Logic */}
                          {img.isPrivate ? (
                            <Lock size={14} strokeWidth={3} />
                          ) : (
                            <Globe size={14} className="text-green-400" strokeWidth={3} />
                          )}

                          {/* Text Label: Visible to Owner */}
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            {img.isPrivate ? 'Private' : 'Public'}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end pointer-events-auto">
                      <button onClick={(e) => handleLike(e, img)} className={`p-2.5 rounded-xl backdrop-blur-xl border border-white/10 flex items-center gap-2 transition-all ${profile?.likedImages?.includes(img.id) ? 'bg-red-500 border-red-400 text-white' : 'bg-black/60 text-white'}`}>
                        <Heart size={14} fill={profile?.likedImages?.includes(img.id) ? "white" : "none"} />
                        <span className="text-[10px] font-black">{img.likesCount || 0}</span>
                      </button>
                    </div>
                  </div>

                  {/* BOTTOM INFO */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-3 translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-20">
                    <div className="flex items-center gap-2 px-1">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isGlobalKing ? 'bg-yellow-500' : 'bg-indigo-500'}`}><User size={8} className="text-white" /></div>
                      <p className={`text-[9px] font-black uppercase tracking-tight ${isGlobalKing ? 'text-yellow-500' : 'text-indigo-400'}`}>
                        {img.creatorName || 'Anonymous'} 
                        {isAdmin && <span className="ml-2 text-red-500/60 font-mono text-[7px] tracking-widest">{img.creatorId.slice(-6)}</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <DownloadButton imageUrl={img.imageUrl} watermarkText="Imagynex.AI" />
                      <button onClick={() => router.push(`/?prompt=${encodeURIComponent(img.prompt)}`)} className="bg-zinc-800/80 p-2.5 rounded-lg border border-white/10 hover:bg-indigo-600 transition-colors">
                        <Zap size={14} className="fill-white" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Gallery Grid ke niche ye button add karein */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-12 mb-20">
            <button 
              onClick={loadMore}
              className="group relative px-8 py-3 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/50"
            >
              <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                {loadingMore ? 'Loading Assets...' : 'Load More Creations'}
                <Zap size={14} className="text-indigo-500" />
              </span>
            </button>
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