"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { 
  Trophy, User, ArrowLeft, Heart, Crown, Activity, 
  Search, Share2, Rocket, Zap, Globe, Cpu, Ghost, Star,
  ShieldCheck, Flame, Sparkles, Diamond, Medal, Info, X, ChevronDown, Clock, Users
} from 'lucide-react';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Artist {
  id: string;
  displayName: string;
  totalLikes: number;
  totalCreations: number;
  monthlyLikes: number;
  imagynex_uid?: string;
  isVerified?: boolean;
}

interface RawUserRow {
  id: string;
  display_name: string | null;
  total_likes: number | null;
  total_creations: number | null;
  monthly_likes: number | null;
  is_verified: boolean | null;
  last_active?: string | null;
}

export default function GlobalLeaderboard() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'all-time' | 'season'>('season');
  const [myId, setMyId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Global Stats
  const [totalNetworkUsers, setTotalNetworkUsers] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");

  const [myRank, setMyRank] = useState<number>(0);
  const [myData, setMyData] = useState<Artist | null>(null);

  const PAGE_SIZE = 15;

  const milestones = [
    { name: "GOD-MOD", likes: 10000, creations: 500, color: "text-red-500", bg: "bg-red-500/10", icon: <Ghost size={14} />, desc: "Absolute Network Dominance" },
    { name: "Architect", likes: 5000, creations: 200, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", icon: <Cpu size={14} />, desc: "Master of Neural Structure" },
    { name: "Oracle", likes: 2500, creations: 150, color: "text-indigo-400", bg: "bg-indigo-400/10", icon: <Globe size={14} />, desc: "Seer of the Digital Realm" },
    { name: "Legend", likes: 1000, creations: 100, color: "text-yellow-500", bg: "bg-yellow-500/10", icon: <Crown size={14} />, desc: "Known across all Nodes" },
    { name: "Artisan", likes: 500, creations: 50, color: "text-cyan-400", bg: "bg-cyan-400/10", icon: <Diamond size={14} />, desc: "Crafting High-Tier Visuals" },
    { name: "Elite", likes: 100, creations: 20, color: "text-emerald-400", bg: "bg-emerald-400/10", icon: <Rocket size={14} />, desc: "Breaking through the atmosphere" },
    { name: "Pro", likes: 10, creations: 5, color: "text-orange-400", bg: "bg-orange-400/10", icon: <Zap size={14} />, desc: "Active Network Contributor" },
    { name: "Novice", likes: 0, creations: 0, color: "text-zinc-400", bg: "bg-zinc-500/10", icon: <Activity size={14} />, desc: "New Agent Initialized" },
  ];

  // Helper Functions
  const getMilestone = (likes: number, creations: number) => {
    return milestones.find(m => likes >= m.likes && creations >= m.creations) || milestones[milestones.length - 1];
  };

  const getLevelInfo = (likes: number) => {
    const level = Math.floor(Math.sqrt(likes / 5)) + 1;
    const currentLevelExp = Math.pow(level - 1, 2) * 5;
    const nextLevelExp = Math.pow(level, 2) * 5;
    const progress = ((likes - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
    return { level, progress: Math.min(100, Math.max(0, progress)), next: Math.max(0, nextLevelExp - likes) };
  };

  // Transformation helper: DB snake_case -> Artist camelCase
  const transformRowToArtist = (row: RawUserRow): Artist => ({
    id: row.id,
    displayName: row.display_name || `Agent_${row.id.slice(0, 4)}`,
    totalLikes: Number(row.total_likes ?? 0),
    totalCreations: Number(row.total_creations ?? 0),
    monthlyLikes: Number(row.monthly_likes ?? 0),
    isVerified: Boolean(row.is_verified),
    imagynex_uid: row.id
  });

  // Fetch Current User's Specific Rank and Data
  const fetchCurrentUserRank = useCallback(async (currentUserId: string, sortColumn: 'monthly_likes' | 'total_likes') => {
    if (!currentUserId) return;

    try {
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      if (userError || !userRow) return;

      const userArtist = transformRowToArtist(userRow);
      setMyData(userArtist);

      const targetValue = sortColumn === 'monthly_likes' ? userArtist.monthlyLikes : userArtist.totalLikes;

      // Count players with strictly higher score
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt(sortColumn, targetValue);

      if (!countError && count !== null) {
        setMyRank(count + 1);
      }
    } catch (err) {
      console.error("Error fetching user rank:", err);
    }
  }, []);

  // Fetch Initial Leaderboard & Count
  const fetchLeaderboard = useCallback(async (isReset = true) => {
    if (isReset) {
      setLoading(true);
      setPage(0);
    }

    const sortColumn = activeTab === 'season' ? 'monthly_likes' : 'total_likes';
    const from = isReset ? 0 : (page + 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      // 1. Fetch Total Network Users Count
      if (isReset) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        if (count !== null) setTotalNetworkUsers(count);
      }

      // 2. Fetch Leaderboard Records
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, total_likes, total_creations, monthly_likes, is_verified, last_active')
        .order(sortColumn, { ascending: false })
        .range(from, to);

      if (error) throw error;

      const mappedArtists = (data || []).map(transformRowToArtist);

      if (isReset) {
        setArtists(mappedArtists);
        setHasMore(mappedArtists.length === PAGE_SIZE);
      } else {
        setArtists(prev => [...prev, ...mappedArtists]);
        setPage(prev => prev + 1);
        setHasMore(mappedArtists.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      if (isReset) setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, page]);

  // Handle Tab Switch & Initial Mount
  useEffect(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('imagynex_uid') : null;
    if (savedId) {
      setMyId(savedId);
      const sortColumn = activeTab === 'season' ? 'monthly_likes' : 'total_likes';
      fetchCurrentUserRank(savedId, sortColumn);
    }

    fetchLeaderboard(true);
  }, [activeTab, fetchCurrentUserRank]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          // Re-fetch to keep exact sorted ranges consistent on changes
          fetchLeaderboard(true);
          const savedId = localStorage.getItem('imagynex_uid');
          if (savedId) {
            const sortColumn = activeTab === 'season' ? 'monthly_likes' : 'total_likes';
            fetchCurrentUserRank(savedId, sortColumn);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, fetchLeaderboard, fetchCurrentUserRank]);

  // Countdown Logic (Resets on the 1st of every month at 00:00:00)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      const diff = nextMonth.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("RESETTING...");
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        setTimeLeft(`${d}D ${h}H ${m}M`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchLeaderboard(false);
  };

  // Search Logic (Artist Name or Milestone Name)
  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    const queryLower = searchQuery.toLowerCase();

    return artists.filter(a => {
      const milestoneName = getMilestone(a.totalLikes, a.totalCreations).name.toLowerCase();
      return (
        a.displayName.toLowerCase().includes(queryLower) ||
        milestoneName.includes(queryLower)
      );
    });
  }, [artists, searchQuery]);

  const topThree = filteredArtists.slice(0, 3);
  const theRest = filteredArtists.slice(3);

  const handleShare = async () => {
    if (!myData) return;

    const milestone = getMilestone(myData.totalLikes, myData.totalCreations);
    const profileUrl = `${window.location.origin}/gallery?user=${myId}`;
    const shareTitle = `🏆 I'm Ranked #${myRank || '--'} on Imagynex!`;
    const shareText = 
      `Level ${getLevelInfo(myData.totalLikes).level} Artist | Class: ${milestone.name}\n` +
      `Check out my Neural Engine creations here:`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl,
        });
      } else {
        const fullCopy = `${shareTitle}\n${shareText}\n${profileUrl}`;
        await navigator.clipboard.writeText(fullCopy);
        setToastMsg("Neural Link Copied to Clipboard");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white pb-44 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Milestone Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/70"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-[40px] p-6 shadow-2xl backdrop-blur-3xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black italic text-2xl uppercase tracking-tighter">System Intel</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Milestones & Leveling Guide</p>
                </div>
                <button 
                  onClick={() => setShowInfo(false)} 
                  className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X size={20}/>
                </button>
              </div>

              {/* Level System Explanation */}
              <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl">
                <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-2 flex items-center gap-2">
                  <Zap size={12}/> How Levels Work
                </h4>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Levels are calculated using your total likes. Higher levels require exponentially more points. 
                  <span className="block mt-1 text-indigo-300 font-bold italic">Formula: Level = √(Likes / 5) + 1</span>
                </p>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center ${m.color} shrink-0`}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className={`font-black text-xs uppercase ${m.color}`}>{m.name}</p>
                        <div className="flex gap-2">
                          <span className="text-[8px] font-black text-red-500 uppercase">{m.likes}+ Likes</span>
                          <span className="text-[8px] font-black text-cyan-400 uppercase">{m.creations}+ Creations</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-medium italic mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.back()} 
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[8px] font-black tracking-[0.5em] text-indigo-500 uppercase mb-1">Neural Network</p>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Leaderboard</h1>
          </div>
          <button 
            onClick={() => setShowInfo(true)} 
            className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 active:scale-90 transition-all hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Info size={20} />
          </button>
        </div>

        {/* Dynamic Global Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] text-center backdrop-blur-md">
            <Users size={14} className="mx-auto mb-2 text-indigo-500" />
            <p className="text-lg font-black italic leading-none">{totalNetworkUsers.toLocaleString()}</p>
            <p className="text-[7px] font-black text-zinc-500 uppercase mt-1">Total Agents</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-[24px] text-center backdrop-blur-md">
            <Clock size={14} className="mx-auto mb-2 text-indigo-400" />
            <p className="text-lg font-black italic leading-none text-indigo-400">{timeLeft || "--"}</p>
            <p className="text-[7px] font-black text-indigo-500 uppercase mt-1">Season Ends</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] text-center backdrop-blur-md">
            <Star size={14} className="mx-auto mb-2 text-yellow-500" />
            <p className="text-lg font-black italic leading-none">{myRank ? `#${myRank}` : '--'}</p>
            <p className="text-[7px] font-black text-zinc-500 uppercase mt-1">Your Rank</p>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="space-y-3 mb-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search Agents or Milestones (e.g. Oracle)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            {(['season', 'all-time'] as const).map((t) => (
              <button 
                key={t} 
                onClick={() => { setActiveTab(t); }}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  activeTab === t ? 'bg-indigo-600 shadow-xl text-white' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {t === 'season' ? 'Current Season' : 'Hall of Fame'}
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced 3D Podium */}
        {!loading && topThree.length > 0 && (
          <div className="flex items-end justify-center gap-2 mb-12 mt-20 px-2">
            {[1, 0, 2].map((displayIdx) => {
              const artist = topThree[displayIdx];
              if (!artist) return <div key={displayIdx} className="flex-1" />;

              const isChamp = displayIdx === 0;
              const isSilver = displayIdx === 1;
              const isBronze = displayIdx === 2;
              const actualRank = displayIdx + 1;
              const mile = getMilestone(artist.totalLikes, artist.totalCreations);
              const lvl = getLevelInfo(artist.totalLikes);

              const pedestalBorder = isChamp 
                ? 'border-yellow-500/40 bg-yellow-500/5' 
                : isSilver 
                ? 'border-slate-300/30 bg-slate-300/5' 
                : 'border-orange-500/30 bg-orange-500/5';

              const rankBadgeStyle = isChamp
                ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                : isSilver
                ? 'bg-slate-300 text-black'
                : 'bg-orange-600 text-white';

              return (
                <div 
                  key={artist.id} 
                  onClick={() => router.push(`/gallery?user=${artist.id}`)} 
                  className={`${isChamp ? 'flex-[1.4]' : 'flex-1'} group cursor-pointer relative`}
                >
                  {isChamp && (
                    <div className="absolute -inset-4 bg-yellow-500/15 blur-3xl rounded-full animate-pulse pointer-events-none" />
                  )}
                  
                  <div className={`relative ${pedestalBorder} ${isChamp ? 'pt-16 pb-6' : 'pt-12 pb-5'} border-x border-t rounded-t-[40px] p-4 text-center transition-all duration-300 group-hover:-translate-y-1 active:scale-95 backdrop-blur-xl`}>
                    
                    {/* Podium Avatar Box */}
                    <div className={`absolute ${isChamp ? '-top-14 w-24 h-24' : '-top-10 w-16 h-16'} left-1/2 -translate-x-1/2 bg-zinc-900 rounded-3xl border-4 border-[#020202] flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-105`}>
                      {isChamp ? (
                        <Crown size={40} className="text-yellow-500 animate-bounce" />
                      ) : (
                        <User size={28} className={isSilver ? "text-slate-300" : "text-orange-400"} />
                      )}
                      
                      {/* Rank Number Tag */}
                      <div className={`absolute -bottom-2 ${rankBadgeStyle} ${isChamp ? 'px-4' : 'px-2.5'} text-[10px] font-black rounded-full ring-4 ring-[#020202]`}>
                        {actualRank}
                      </div>
                    </div>

                    <p className={`${isChamp ? 'text-sm' : 'text-[10px]'} font-black uppercase truncate mb-1 text-zinc-100`}>
                      {artist.displayName}
                    </p>
                    
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${mile.bg} ${mile.color}`}>
                        {mile.name}
                      </span>
                      <div className="flex items-center gap-1 text-red-500 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                        <Heart size={10} fill="currentColor" />
                        <span className="text-[10px] font-black tabular-nums">
                          {(activeTab === 'season' ? artist.monthlyLikes : artist.totalLikes).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                        {activeTab === 'season' ? 'Season Progress' : `LVL ${lvl.level}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List Section */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-20 opacity-30">
              <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Linking Nodes...</p>
            </div>
          ) : (
            <>
              {theRest.map((artist, index) => {
                const pos = index + 4;
                const isMe = artist.id === myId || artist.imagynex_uid === myId;
                const mile = getMilestone(artist.totalLikes, artist.totalCreations);
                const lvl = getLevelInfo(artist.totalLikes);

                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    key={artist.id} 
                    onClick={() => router.push(`/gallery?user=${artist.id}`)}
                    className={`flex items-center gap-4 p-4 rounded-[32px] border transition-all active:scale-[0.98] cursor-pointer group ${
                      isMe 
                        ? 'bg-indigo-600/10 border-indigo-500/40 shadow-[0_0_20px_rgba(79,70,229,0.15)]' 
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    <div className="w-8 text-center font-black italic text-zinc-600 text-xs">#{pos}</div>
                    
                    <div className="relative w-12 h-12 shrink-0 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                      <User size={22} className="text-zinc-500" />
                      {artist.isVerified && (
                        <ShieldCheck size={14} className="absolute -top-1.5 -right-1.5 text-cyan-400 fill-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black uppercase italic text-xs truncate tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                          {artist.displayName}
                        </h4>
                        {isMe && <span className="text-[6px] bg-indigo-500 px-1.5 py-0.5 rounded-md font-black text-white">YOU</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${mile.bg} ${mile.color}`}>
                          {mile.icon} {mile.name}
                        </span>
                        <span className="text-[7px] text-zinc-400 font-bold uppercase">Lvl {lvl.level}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <Heart size={12} className="text-red-500 fill-red-500" />
                        <span className="font-black text-sm tabular-nums">
                          {(activeTab === 'season' ? artist.monthlyLikes : artist.totalLikes).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-12 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${lvl.progress}%` }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {hasMore && (
                <button 
                  onClick={loadMore} 
                  disabled={loadingMore} 
                  className="w-full py-10 flex flex-col items-center gap-2 group transition-all focus-visible:outline-none"
                >
                  {loadingMore ? (
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ChevronDown size={24} className="text-zinc-500 group-hover:text-white transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 group-hover:text-zinc-300">Sync More Data</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Persistent Me-Bar */}
      {myData && (() => {
        const lvlInfo = getLevelInfo(myData.totalLikes);
        const currentMilestone = getMilestone(myData.totalLikes, myData.totalCreations);
        const nextMilestoneIndex = milestones.findIndex(m => m.name === currentMilestone.name) - 1;
        const nextMilestone = nextMilestoneIndex >= 0 ? milestones[nextMilestoneIndex] : null;

        return (
          <div className="fixed bottom-6 left-4 right-4 z-[100]">
            <div className="max-w-md mx-auto bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[35px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="w-full h-1.5 bg-white/5 flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${lvlInfo.progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" 
                />
              </div>
              
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 pl-2">
                  <div className="relative">
                    <div className={`w-12 h-12 ${currentMilestone.bg} rounded-2xl flex items-center justify-center shadow-lg border border-white/10`}>
                      <span className={currentMilestone.color}>{currentMilestone.icon}</span>
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 bg-white text-black text-[9px] font-black px-2 py-0.5 rounded-lg border-2 border-zinc-950">
                      {myRank ? `#${myRank}` : '--'}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black italic text-xs uppercase truncate max-w-[100px] leading-tight text-white">
                        {myData.displayName}
                      </h4>
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${currentMilestone.bg} ${currentMilestone.color} border border-current/10`}>
                        {currentMilestone.name}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">
                          {activeTab === 'season' ? 'Season Stats' : `LVL ${lvlInfo.level}`}
                        </p>
                        <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">
                          <Heart size={8} className="inline mr-1 text-red-500" fill="currentColor" />
                          {(activeTab === 'season' ? myData.monthlyLikes : myData.totalLikes).toLocaleString()}
                        </p>
                      </div>

                      {nextMilestone && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[7px] font-bold text-zinc-400 uppercase">
                            Next: <span className={nextMilestone.color}>{nextMilestone.name}</span>
                          </p>
                          <p className="text-[7px] font-black text-cyan-500 uppercase">
                            Need: {Math.max(0, nextMilestone.creations - myData.totalCreations)} Creations
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleShare}
                    className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Share2 size={18} />
                  </button>
                  <button 
                    onClick={() => router.push(`/gallery?user=${myId}`)}
                    className="bg-white text-black px-5 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Portal
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Animated Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ y: 50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 20, opacity: 0, x: '-50%' }}
            className="fixed bottom-32 left-1/2 z-[200] px-6 py-3 bg-indigo-600 border border-indigo-400/50 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center gap-3 min-w-[280px]"
          >
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Zap size={16} className="text-white animate-pulse" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white">
              {toastMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}