"use client";

import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { 
  Download, Search, Sparkles, UserMinus, Share2, ArrowLeft,
  User, Heart, Users, LayoutGrid, Trophy, Edit3, Check, Zap, Eye, Flame, Crown, Medal, TrendingUp, Gift, Info, Star, ShieldCheck, BadgeCheck, Lock, Globe, Trash2
} from 'lucide-react';
import DownloadButton from "@/lib/DownloadButton";
import AdminInbox from "@/lib/AdminInbox";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  creatorId: string;
  creatorName: string;
  likesCount: number;
  style?: string;
  createdAt?: any;
  isPrivate?: boolean;
}

interface ArtistProfile {
  id: string;
  displayName: string;
  totalCreations: number;
  totalLikes: number;
  monthlyLikes: number;
  likedImages: string[];
  lastMonthlyReset?: any;
}

function GalleryContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);
  const [showMyCreations, setShowMyCreations] = useState(false);

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ArtistProfile[]>([]);
  const [myGlobalRank, setMyGlobalRank] = useState<number | string>("...");
  const [timeLeft, setTimeLeft] = useState("");
  const [myMonthlyRank, setMyMonthlyRank] = useState<number>(0);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<ArtistProfile[]>([]);

  const categories = ["All", "Trending", "Liked", "Cinematic", "Anime", "Cyberpunk", "3D Render"];

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [dbStats, setDbStats] = useState({ total: 0, public: 0, private: 0, storageMB: 0 });

  // Map raw Supabase record to GalleryImage
  const mapSupabaseImage = (row: any): GalleryImage => ({
    id: row.id,
    imageUrl: row.image_url || row.imageUrl || '',
    prompt: row.prompt || '',
    creatorId: row.user_id || row.creatorId || 'anonymous',
    creatorName: row.creator_name || row.creatorName || (row.user_id ? `Creator_${row.user_id.slice(0, 4)}` : 'Anonymous'),
    likesCount: Number(row.likes_count ?? row.likesCount ?? 0),
    style: row.style,
    createdAt: row.created_at || row.createdAt,
    isPrivate: row.is_gallery === false || row.isPrivate === true
  });

  // 1. Stats Fetcher
  const fetchAdminStats = async () => {
    try {
      // 1. Get Absolute Total
      const { count: totalCount, error: totalErr } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true });
      if (totalErr) throw totalErr;
      const total = totalCount || 0;

      // 2. Get Public count
      const { count: publicCountResult, error: pubErr } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('is_gallery', true);
      if (pubErr) throw pubErr;
      const publicCount = publicCountResult || 0;

      // 3. Get Private count
      const { count: privateCountResult, error: privErr } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('is_gallery', false);
      if (privErr) throw privErr;
      const privateCount = privateCountResult || 0;

      setDbStats({
        total,
        public: publicCount,
        private: privateCount,
        storageMB: Number(((total * 1.1) / 1024).toFixed(2))
      });
    } catch (error) {
      console.error("Stats Error:", error);
    }
  };

  // 2. Admin Login Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'admin') {
      const password = window.prompt("Enter Admin Security Key:");
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

  // 3. Admin Single Asset Delete (Connected to Admin Route)
  const adminDelete = async (imgId: string, creatorId: string) => {
    const confirm = window.confirm("ADMIN ACTION: Permanently delete this image?");
    if (!confirm) return;

    try {
      const targetImg = images.find(img => img.id === imgId);
      const res = await fetch('/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: imgId,
          publicId: (targetImg as any)?.publicId,
          creatorId: creatorId,
          requesterId: userId,
          adminKey: process.env.NEXT_PUBLIC_ADMIN_KEY
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      setImages(prev => prev.filter(img => img.id !== imgId));
      fetchAdminStats();
      alert("Deleted successfully from Supabase & Cloudinary.");
    } catch (err: any) {
      console.error(err);
      alert(`Delete failed: ${err.message || 'Permission Denied.'}`);
    }
  };

  // 4. Reset Monthly Likes
  const resetMonthlyLikes = async () => {
    const now = new Date();
    const currentDate = now.getDate();

    if (currentDate > 7) {
      alert("ACCESS DENIED: Reset is only allowed during the first week of the month (1st - 7th).");
      return;
    }

    const confirmReset = window.confirm("⚠️ DANGER: Reset ALL users' monthly likes to 0? This cannot be undone.");
    if (!confirmReset) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          monthly_likes: 0, 
          last_monthly_reset: new Date().toISOString() 
        })
        .neq('id', '');

      if (error) throw error;

      alert("SUCCESS: All monthly likes have been reset to 0.");
      fetchAdminStats();
      fetchLeaderboards();
    } catch (err: any) {
      console.error("Reset Error:", err);
      alert("Reset failed: " + (err.message || "Permission Denied."));
    }
  };

  // 5. Toggle Privacy
  const togglePrivacy = async (e: React.MouseEvent, imgId: string, currentIsPrivate: boolean) => {
    e.stopPropagation();
    
    const newIsPrivate = !currentIsPrivate;
    setImages(prev => prev.map(img => 
      img.id === imgId ? { ...img, isPrivate: newIsPrivate } : img
    ));

    try {
      const { error } = await supabase
        .from('generations')
        .update({ is_gallery: !newIsPrivate })
        .eq('id', imgId);

      if (error) throw error;
      console.log("Privacy updated successfully");
    } catch (err) {
      console.error("Error updating privacy:", err);
      setImages(prev => prev.map(img => 
        img.id === imgId ? { ...img, isPrivate: currentIsPrivate } : img
      ));
      alert("Permission Denied: You don't have access to change this image.");
    }
  };

  // 6. Fetch User Ranks (Fixed to snake_case)
  const fetchRanks = async (totalLikes: number = 0, monthlyLikes: number = 0) => {
    try {
      if (typeof totalLikes !== 'number' || typeof monthlyLikes !== 'number') return;

      const { count: globalCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('total_likes', totalLikes);

      setMyGlobalRank((globalCount || 0) + 1);

      const { count: monthlyCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('monthly_likes', monthlyLikes);

      setMyMonthlyRank((monthlyCount || 0) + 1);
    } catch (error) {
      console.error("Error fetching ranks:", error);
      setMyGlobalRank(0);
      setMyMonthlyRank(0);
    }
  };

  // 7. Fetch Leaderboards (Fixed to snake_case)
  const fetchLeaderboards = async () => {
    try {
      const { data: globalData } = await supabase
        .from('users')
        .select('*')
        .order('total_likes', { ascending: false })
        .limit(10);

      if (globalData) {
        setGlobalLeaderboard(globalData.map(d => ({
          id: d.id,
          displayName: d.display_name || `Creator_${d.id.slice(0, 4)}`,
          totalCreations: Number(d.total_creations ?? 0),
          totalLikes: Number(d.total_likes ?? 0),
          monthlyLikes: Number(d.monthly_likes ?? 0),
          likedImages: d.liked_images || []
        })));
      }

      const { data: monthlyData } = await supabase
        .from('users')
        .select('*')
        .order('monthly_likes', { ascending: false })
        .limit(10);

      if (monthlyData) {
        setMonthlyLeaderboard(monthlyData.map(d => ({
          id: d.id,
          displayName: d.display_name || `Creator_${d.id.slice(0, 4)}`,
          totalCreations: Number(d.total_creations ?? 0),
          totalLikes: Number(d.total_likes ?? 0),
          monthlyLikes: Number(d.monthly_likes ?? 0),
          likedImages: d.liked_images || []
        })));
      }
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    }
  };

  // 8. Countdown Timer Logic
  useEffect(() => {
    setMounted(true);
    
    const timer = setInterval(() => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      const diff = nextMonth.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("SEASON RESETTING...");
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        const pad = (val: number) => String(val).padStart(2, '0');
        setTimeLeft(`${d}D ${pad(h)}H ${pad(m)}M ${pad(s)}S`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 9. User Profile & Monthly Auto-Reset Check
  useEffect(() => {
    if (!mounted) return;
    
    let uid = localStorage.getItem('imagynex_uid') || 'u_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('imagynex_uid', uid);
    setUserId(uid);

    const initUser = async () => {
      try {
        const pollenToken = localStorage.getItem('pollen_token');
        let uid = localStorage.getItem('imagynex_uid');

        // 1. Agar user logged in hai, toh deterministic permanent ID force karein
        if (pollenToken) {
          let permanentUid = null;
          if (pollenToken.includes('.')) {
            try {
              const base64Url = pollenToken.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
              permanentUid = payload.sub || payload.user_id || payload.username || payload.email;
            } catch (e) {
              console.warn("JWT parse error:", e);
            }
          }
          if (!permanentUid) {
            permanentUid = pollenToken.slice(0, 16);
          }
          uid = `pol_${permanentUid}`;
          localStorage.setItem('imagynex_uid', uid);
        }

        // 2. Agar koi token nahi hai tabhi anonymous random ID banayein
        if (!uid) {
          uid = `u_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('imagynex_uid', uid);
        }

        setUserId(uid);

        // 3. Database se exact profile fetch karein (snake_case)
        const { data: userData, error: fetchErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        const now = new Date();

        if (userData) {
          // 1. Calculate Monthly Auto-Reset
          const rawReset = userData.last_monthly_reset;
          const lastReset = rawReset ? new Date(rawReset) : new Date(0);
          let mousedLikes = Number(userData.monthly_likes ?? 0);
          let activeResetTime = rawReset;

          if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            mousedLikes = 0;
            activeResetTime = now.toISOString();

            await supabase
              .from('users')
              .update({ 
                monthly_likes: 0, 
                last_monthly_reset: activeResetTime 
              })
              .eq('id', uid);
          }

          // 2. Resolve Active Display Identity (Prefers Official Username)
          const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('imagynex_username') : null;
          const resolvedDisplayName = 
            savedUsername || 
            userData.display_name || 
            userData.username || 
            (uid.startsWith('pol_') ? `Agent_${uid.slice(4, 8)}` : `Creator_${uid.slice(0, 4)}`);

          // 3. Construct Complete Artist Profile
          const currentProfile: ArtistProfile = {
            id: uid,
            displayName: resolvedDisplayName,
            totalLikes: Number(userData.total_likes ?? 0),
            monthlyLikes: mousedLikes,
            totalCreations: Number(userData.total_creations ?? 0),
            likedImages: Array.isArray(userData.liked_images) ? userData.liked_images : [],
            lastMonthlyReset: activeResetTime
          };

          // 4. Synchronize UI State & Ranks
          setProfile(currentProfile);
          setNewName(currentProfile.displayName);
          fetchRanks(currentProfile.totalLikes, currentProfile.monthlyLikes);
        } else {
          // Naya record sirf tab banayein jab DB me profile exist na kare
          const dbPayload = {
            id: uid,
            display_name: uid.startsWith('pol_') ? `Agent_${uid.slice(4, 8)}` : `Creator_${uid.slice(0, 4)}`,
            total_likes: 0,
            monthly_likes: 0,
            total_creations: 0,
            liked_images: [],
            last_monthly_reset: now.toISOString(),
            last_active: now.toISOString()
          };

          await supabase.from('users').upsert(dbPayload, { onConflict: 'id' });

          setProfile({
            id: uid,
            displayName: dbPayload.display_name,
            totalLikes: 0,
            monthlyLikes: 0,
            totalCreations: 0,
            likedImages: [],
            lastMonthlyReset: now.toISOString()
          });
          setNewName(dbPayload.display_name);
          fetchRanks(0, 0);
        }
      } catch (err) {
        console.error("User init failed:", err);
      }
    };

    initUser();
    fetchLeaderboards();
  }, [mounted]);

  // Infinite Scroll Intersection Observer
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

  // 10. Main Fetch Function
  const fetchImages = async () => {
    setLoading(true);
    const searchParams = new URLSearchParams(window.location.search);
    const artistIdFromUrl = searchParams.get('user');

    try {
      // Handle Liked Tab
      if (activeFilter === "Liked") {
        const likedIds = profile?.likedImages || [];
        if (likedIds.length === 0) {
          setImages([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('generations')
          .select('*')
          .in('id', likedIds.slice(0, 100));

        if (error) throw error;

        let fetched = (data || []).map(mapSupabaseImage);

        // Filter private unless admin or own
        fetched = fetched.filter(img => {
          if (showMyCreations) return true;
          if (isAdmin) return true;
          return !img.isPrivate;
        });

        // Sort by order of profile.likedImages
        fetched.sort((a, b) => {
          const indexA = profile?.likedImages.indexOf(a.id) ?? -1;
          const indexB = profile?.likedImages.indexOf(b.id) ?? -1;
          return indexB - indexA;
        });

        if (searchQuery.trim() !== "") {
          fetched = fetched.filter(img =>
            img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setImages(fetched);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Build standard Supabase Query
      let query = supabase.from('generations').select('*');

      if (showMyCreations) {
        const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('imagynex_username') : null;
        const lookupKey = (savedUsername && savedUsername.trim()) ? savedUsername.toLowerCase().trim() : userId;

        // Query by username OR creator_name OR userId
        query = query
          .or(`user_id.eq.${lookupKey},creator_name.eq.${lookupKey}`)
          .order('created_at', { ascending: false });
      } else if (artistIdFromUrl) {
        query = query.eq('user_id', artistIdFromUrl).order('created_at', { ascending: false });
        if (!isAdmin) {
          query = query.eq('is_gallery', true);
        }
      } else {
        if (!isAdmin) {
          query = query.eq('is_gallery', true);
        }
        if (activeFilter !== "All" && activeFilter !== "Trending") {
          query = query.eq('style', activeFilter);
        }
        if (activeFilter === "Trending") {
          query = query.order('likes_count', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }
      }

      const PAGE_SIZE = 100;
      query = query.range(0, PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;

      let fetched = (data || []).map(mapSupabaseImage);

      // Client-side privacy enforcement
      fetched = fetched.filter(img => {
        if (showMyCreations) return true;
        if (isAdmin) return true;
        return !img.isPrivate;
      });

      if (searchQuery.trim() !== "") {
        fetched = fetched.filter(img =>
          img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setImages(fetched);
      setPageOffset(PAGE_SIZE);
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    fetchImages();
  }, [mounted, activeFilter, showMyCreations, userId, searchQuery, profile?.likedImages, isAdmin]);

  // 11. Load More Function
  const loadMore = async () => {
    if (loadingMore || !hasMore || activeFilter === "Liked") return;
    setLoadingMore(true);

    const searchParams = new URLSearchParams(window.location.search);
    const artistIdFromUrl = searchParams.get('user');

    try {
      let query = supabase.from('generations').select('*');

      if (showMyCreations) {
        const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('imagynex_username') : null;
        const lookupKey = (savedUsername && savedUsername.trim()) ? savedUsername.toLowerCase().trim() : userId;

        query = query
          .or(`user_id.eq.${lookupKey},creator_name.eq.${lookupKey}`)
          .order('created_at', { ascending: false });
      } else if (artistIdFromUrl) {
        query = query.eq('user_id', artistIdFromUrl).order('created_at', { ascending: false });
        if (!isAdmin) {
          query = query.eq('is_gallery', true);
        }
      } else {
        if (!isAdmin) {
          query = query.eq('is_gallery', true);
        }
        if (activeFilter !== "All" && activeFilter !== "Trending") {
          query = query.eq('style', activeFilter);
        }
        if (activeFilter === "Trending") {
          query = query.order('likes_count', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }
      }

      const PAGE_CHUNK = 24;
      const from = pageOffset;
      const to = from + PAGE_CHUNK - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        let newMapped = data.map(mapSupabaseImage);

        newMapped = newMapped.filter(img => {
          if (showMyCreations) return true;
          if (isAdmin) return true;
          return !img.isPrivate;
        });

        if (searchQuery.trim() !== "") {
          newMapped = newMapped.filter(img =>
            img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setImages(prev => [...prev, ...newMapped]);
        setPageOffset(to + 1);
        setHasMore(data.length === PAGE_CHUNK);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("LoadMore Error:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // 12. Handle Like/Heart Interaction
  const handleLike = async (e: React.MouseEvent, img: GalleryImage) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || !profile) return;

    const currentLikedImages = profile.likedImages || [];
    const isLiked = currentLikedImages.includes(img.id);
    const isSelfLike = userId === img.creatorId;
    const delta = isLiked ? -1 : 1;

    // 1. Updated Array banayein
    const updatedLikesList = isLiked
      ? currentLikedImages.filter((id) => id !== img.id)
      : [...currentLikedImages, img.id];

    const previousProfile = { ...profile };
    const previousImages = [...images];

    // 2. Optimistic UI updates (Screen par instant update dikhega)
    setProfile((prev) => (prev ? { ...prev, likedImages: updatedLikesList } : null));
    setImages((prev) =>
      prev.map((item) =>
        item.id === img.id
          ? { ...item, likesCount: Math.max(0, (item.likesCount || 0) + delta) }
          : item
      )
    );

    try {
      // 3. User table ka liked_images array update karein (snake_case)
      const { error: userArrayError } = await supabase
        .from('users')
        .update({ liked_images: updatedLikesList })
        .eq('id', userId);

      if (userArrayError) throw userArrayError;

      // 4. Generations table ka likes_count update karein
      const newImageLikes = Math.max(0, (img.likesCount || 0) + delta);
      const { error: genError } = await supabase
        .from('generations')
        .update({ likes_count: newImageLikes })
        .eq('id', img.id);

      if (genError) throw genError;

      // 5. Creator ke Stats (total_likes, monthly_likes) update karein
      const targetUserId = isSelfLike ? userId : img.creatorId;

      const { data: targetUser, error: fetchTargetError } = await supabase
        .from('users')
        .select('total_likes, monthly_likes')
        .eq('id', targetUserId)
        .maybeSingle();

      if (fetchTargetError) throw fetchTargetError;

      if (targetUser) {
        const updatedTotal = Math.max(0, Number(targetUser.total_likes || 0) + delta);
        const updatedMonthly = Math.max(0, Number(targetUser.monthly_likes || 0) + delta);

        const { error: creatorUpdateError } = await supabase
          .from('users')
          .update({
            total_likes: updatedTotal,
            monthly_likes: updatedMonthly,
          })
          .eq('id', targetUserId);

        if (creatorUpdateError) throw creatorUpdateError;

        // Agar user ne apni hi image like ki hai, toh local state & rank sync karein
        if (isSelfLike) {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  totalLikes: updatedTotal,
                  monthlyLikes: updatedMonthly,
                }
              : null
          );
          if (typeof fetchRanks === 'function') {
            fetchRanks(updatedTotal, updatedMonthly);
          }
        }
      }
    } catch (err: any) {
      console.error("Like operation failed:", err);

      // Rollback to previous state on failure
      setProfile(previousProfile);
      setImages(previousImages);

      alert("Failed to update like. Please check your connection or database permissions.");
    }
  };

  // 13. Update Name Globally
  const updateNameGlobally = async () => {
    if (!newName || newName.trim() === "" || newName === profile?.displayName) {
      setIsEditing(false);
      return;
    }

    try {
      // 1. Update Users Table (Fixed to snake_case)
      await supabase
        .from('users')
        .update({ 
          display_name: newName,
          last_active: new Date().toISOString()
        })
        .eq('id', userId);

      // 2. Update all generations created by this user
      await supabase
        .from('generations')
        .update({ creator_name: newName })
        .eq('user_id', userId);

      setIsEditing(false);
      setProfile(prev => prev ? ({ ...prev, displayName: newName }) : null);
      setImages(prev => prev.map(img => img.creatorId === userId ? { ...img, creatorName: newName } : img));
    } catch (error) {
      console.error("Global Update Error:", error);
      alert("Update failed. Check your internet connection.");
      setNewName(profile?.displayName || "");
      setIsEditing(false);
    }
  };

  // 14. Admin Nuke All User Assets
  const nukeUserImages = async (targetUserId: string) => {
    if (!targetUserId) {
      alert("Error: No User ID found for this asset.");
      return;
    }

    setLoading(true);

    try {
      const { data: toDelete, error: fetchErr } = await supabase
        .from('generations')
        .select('id')
        .eq('user_id', targetUserId);

      if (fetchErr) throw fetchErr;

      if (!toDelete || toDelete.length === 0) {
        alert("No images found for this user.");
        setLoading(false);
        return;
      }

      const { error: delErr } = await supabase
        .from('generations')
        .delete()
        .eq('user_id', targetUserId);

      if (delErr) throw delErr;

      // Reset user's total creations count (Clean snake_case)
      await supabase
        .from('users')
        .update({ 
          total_creations: 0
        })
        .eq('id', targetUserId);

      setImages(prev => prev.filter(img => img.creatorId !== targetUserId));
      fetchAdminStats();
      alert(`SUCCESS: Nuked ${toDelete.length} images from the database.`);
    } catch (error: any) {
      console.error("Nuke Operation Failed:", error);
      alert(`System Error: ${error.message || 'Operation failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // SEO Schema
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "ImageGallery",
    "name": "Imagynex AI Neural Art Gallery",
    "description": "Explore top-tier AI generated images, prompts, and neural art masterpieces.",
    "url": "https://imagynexai.vercel.app/gallery",
    "image": images.slice(0, 5).map(img => img.imageUrl)
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
          
          {/* Header Toggle & Leaderboard Link */}
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

            {/* Top 3 Podium Grid */}
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
        </div>

        {/* Search & Filter Sticky Bar */}
        <div className="sticky top-[64px] md:top-[88px] z-50 bg-[#020202]/95 backdrop-blur-xl py-4 space-y-4 border-b border-white/5 -mx-4 px-4 shadow-xl">
          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14}/>
            <input 
              placeholder="Search Prompts..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-[10px] font-bold uppercase outline-none focus:border-indigo-500/50 transition-all" 
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-start md:justify-center">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveFilter(cat)} 
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-[8px] font-black uppercase border transition-all flex items-center gap-2 ${activeFilter === cat ? 'bg-white text-black border-white' : 'bg-zinc-900/40 border-white/5 text-zinc-400'}`}
              >
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
                  {/* ADMIN MASTER OVERLAY */}
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
                            CID: {img.creatorId.slice(0, 8)}
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

                  {/* GOLDEN AURA & IMAGE LINK */}
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
                          {img.isPrivate ? (
                            <Lock size={14} strokeWidth={3} />
                          ) : (
                            <Globe size={14} className="text-green-400" strokeWidth={3} />
                          )}

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
        
        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-12 mb-20">
            <button 
              onClick={loadMore}
              disabled={loadingMore}
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