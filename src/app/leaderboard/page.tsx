"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { db, auth } from "@/lib/firebase"; 
import { 
  collection, query, doc, getDoc, orderBy, limit, getDocs, 
  startAfter, QueryDocumentSnapshot, DocumentData, where 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Trophy, Medal, User, ArrowLeft, Heart, Zap, Star, Crown, Flame, 
  ShieldCheck, Target, Sparkles, Share2, Check, TrendingUp, Search, 
  RefreshCw, Activity, Cpu, Rocket, Diamond, Globe, Ghost, Wand2, Info, X, 
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Artist {
  id: string;
  displayName: string;
  totalLikes: number;
  totalCreations: number;
  lastActive?: any;
  "imagynex_uid"?: string;
}

export default function GlobalLeaderboard() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'all-time' | 'rising'>('all-time');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [shared, setShared] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<Artist | null>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const [percentile, setPercentile] = useState<string>("...");
  const [stats, setStats] = useState({ totalGlobalLikes: 0, activeAgents: 0 });

  const BATCH_SIZE = 15;

  const milestones = [
    { name: "GOD-MOD", likes: 10000, creations: 500, color: "text-red-500", icon: <Ghost size={14} /> },
    { name: "Architect", likes: 5000, creations: 200, color: "text-fuchsia-500", icon: <Cpu size={14} /> },
    { name: "Oracle", likes: 2500, creations: 150, color: "text-indigo-400", icon: <Globe size={14} /> },
    { name: "Legend", likes: 1000, creations: 100, color: "text-yellow-500", icon: <Crown size={14} /> },
    { name: "Artisan", likes: 500, creations: 50, color: "text-cyan-400", icon: <Diamond size={14} /> },
    { name: "Elite", likes: 100, creations: 20, color: "text-emerald-400", icon: <Rocket size={14} /> },
    { name: "Pro", likes: 10, creations: 5, color: "text-orange-400", icon: <Zap size={14} /> },
    { name: "Novice", likes: 0, creations: 0, color: "text-zinc-500", icon: <Activity size={14} /> },
  ];

  const getLevelInfo = (creations: number = 0, likes: number = 0) => {
    if (likes >= 10000) return { name: "GOD-MOD", color: "text-red-500", icon: <Ghost size={10} />, bg: "bg-red-500/10", border: "border-red-500/30" };
    if (likes >= 5000 || creations >= 200) return { name: "Architect", color: "text-fuchsia-500", icon: <Cpu size={10} />, bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20" };
    if (likes >= 2500) return { name: "Oracle", color: "text-indigo-400", icon: <Globe size={10} />, bg: "bg-indigo-500/10", border: "border-indigo-500/20" };
    if (likes >= 1000 || creations >= 100) return { name: "Legend", color: "text-yellow-500", icon: <Crown size={10} />, bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    if (likes >= 500) return { name: "Artisan", color: "text-cyan-400", icon: <Diamond size={10} />, bg: "bg-cyan-500/10", border: "border-cyan-500/20" };
    if (likes >= 100 || creations >= 20) return { name: "Elite", color: "text-emerald-400", icon: <Rocket size={10} />, bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
    if (likes >= 10 || creations >= 5) return { name: "Pro", color: "text-orange-400", icon: <Zap size={10} />, bg: "bg-orange-500/10", border: "border-orange-500/20" };
    return { name: "Novice", color: "text-zinc-500", icon: <Activity size={10} />, bg: "bg-zinc-500/10", border: "border-zinc-500/10" };
  };

  const getNextMilestoneProgress = () => {
    if (!userData) return null;
    const currentLikes = userData.totalLikes || 0;
    const next = [...milestones].reverse().find(m => currentLikes < m.likes);
    if (!next) return { name: "MAX EVOLUTION", percent: 100, remaining: 0 };
    const prevMilestone = milestones.find(m => currentLikes >= m.likes) || { likes: 0 };
    const range = next.likes - prevMilestone.likes;
    const progress = currentLikes - prevMilestone.likes;
    const percent = Math.min(Math.round((progress / range) * 100), 100);
    return { name: next.name, percent, remaining: next.likes - currentLikes, icon: next.icon, color: next.color };
  };

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserSpecificData(user.uid);
      }
    });
    initialLoad();
    return () => unsubscribe();
  }, [activeTab]);

  const initialLoad = async () => {
    setLoading(true);
    await Promise.all([fetchLeaderboard(), fetchRealGlobalStats()]);
    setLoading(false);
  };

  const fetchRealGlobalStats = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      let totalLikes = 0;
      snap.forEach(d => totalLikes += (d.data().totalLikes || 0));
      setStats({ totalGlobalLikes: totalLikes, activeAgents: snap.size });
    } catch (e) { console.error(e); }
  };

  const fetchUserSpecificData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as Artist;
        setUserData({ ...data, id: uid });
        
        const identifier = data["imagynex_uid"] || uid;
        const moreLikesQ = query(collection(db, "users"), where("totalLikes", ">", data.totalLikes || 0));
        const moreLikesSnap = await getDocs(moreLikesQ);
        const sameLikesQ = query(collection(db, "users"), where("totalLikes", "==", data.totalLikes || 0));
        const sameLikesSnap = await getDocs(sameLikesQ);
        
        const tieBreakerCount = sameLikesSnap.docs.filter(doc => {
            const docId = doc.data()["imagynex-uid"] || doc.id;
            return docId < identifier;
        }).length;

        const rank = moreLikesSnap.size + tieBreakerCount + 1;
        setUserRank(rank);

        // Calculate Percentile
        const usersSnap = await getDocs(collection(db, "users"));
        const total = usersSnap.size;
        const topPerc = ((rank / total) * 100).toFixed(1);
        setPercentile(topPerc);
      }
    } catch (e) { console.error(e); }
  };

  const fetchLeaderboard = async () => {
    try {
      let q;
      if (activeTab === 'rising') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        q = query(
          collection(db, "users"),
          where("lastActive", ">=", sevenDaysAgo),
          orderBy("lastActive", "desc"),
          orderBy("totalLikes", "desc"),
          limit(BATCH_SIZE)
        );
      } else {
        q = query(collection(db, "users"), orderBy("totalLikes", "desc"), orderBy("__name__", "asc"), limit(BATCH_SIZE));
      }
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setArtists(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Artist[]);
        setHasMore(querySnapshot.docs.length === BATCH_SIZE);
      }
    } catch (error) { console.error(error); }
  };

  const loadMore = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "users"), orderBy("totalLikes", "desc"), orderBy("__name__", "asc"), startAfter(lastVisible), limit(BATCH_SIZE));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLastVisible(snap.docs[snap.docs.length - 1]);
        const next = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Artist[];
        setArtists(prev => [...prev, ...next]);
        setHasMore(snap.docs.length === BATCH_SIZE);
      } else { setHasMore(false); }
    } catch (e) { console.error(e); }
    setLoadingMore(false);
  };

  const filteredArtists = useMemo(() => {
    return artists.filter(a => a.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [artists, searchQuery]);

  const handleShare = async () => {
    const text = `Check out my rank #${userRank} (Top ${percentile}%) on Imagynex Hall of Fame!`;
    try {
      if (navigator.share) await navigator.share({ title: 'Imagynex', text, url: window.location.href });
      else {
        await navigator.clipboard.writeText(text + " " + window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch (e) { console.error(e); }
  };

  if (!mounted) return null;
  const nextTier = getNextMilestoneProgress();

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-indigo-500/30 pb-56 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(1000%); } }
        .scanline { animation: scanline 8s linear infinite; }
        .gold-glow { text-shadow: 0 0 25px rgba(234,179,8,0.4); }
        .no-wrap { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}} />

      {/* Milestone Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowInfo(false)} />
          <div className="relative bg-[#080808] border border-white/10 w-full max-w-md rounded-[40px] p-6 md:p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase">Evolution Portal</h2>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Global Standings & Milestones</p>
              </div>
              <button onClick={() => setShowInfo(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20} /></button>
            </div>

            {/* Percentile Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Network Dominance</p>
                    <p className="text-lg font-black italic text-emerald-400">Top {percentile}%</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Global Position</p>
                    <p className="text-lg font-black italic">#{userRank}</p>
                </div>
            </div>

            {nextTier && (
                <div className="mb-8 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><BarChart3 size={40} /></div>
                    <div className="flex justify-between items-end mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`${nextTier.color}`}>{nextTier.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Goal: {nextTier.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-400">{nextTier.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]" style={{ width: `${nextTier.percent}%` }} />
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-3 font-bold italic uppercase tracking-tighter">
                        Reach {milestones.find(m => m.name === nextTier.name)?.likes.toLocaleString()} Hearts to Ascend
                    </p>
                </div>
            )}

            <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`${m.color} p-2 rounded-lg bg-white/5`}>{m.icon}</div>
                    <span className="font-bold uppercase text-xs tracking-widest">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-zinc-400 uppercase">{m.likes.toLocaleString()}+</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 scanline bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent z-50" />
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <Link href="/gallery" className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-[9px] font-black tracking-[0.4em] text-indigo-500 uppercase">Hall of Fame</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter bg-gradient-to-b from-white to-white/20 bg-clip-text text-transparent">RANKINGS</h1>
          </div>
          <button onClick={() => setShowInfo(true)} className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 active:scale-90 transition-all">
            <Info size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Global Hearts", value: stats.totalGlobalLikes.toLocaleString(), icon: <Heart className="text-red-500 fill-red-500" size={14} /> },
            { label: "Global Status", value: `Top ${percentile}%`, icon: <BarChart3 className="text-emerald-400" size={14} /> },
            { label: "Your Rank", value: `#${userRank}`, icon: <Target className="text-fuchsia-400" size={14} /> },
            { label: "Security", value: "Locked", icon: <ShieldCheck className="text-indigo-400" size={14} /> },
          ].map((stat, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 p-5 rounded-3xl backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-1">
                {stat.icon}
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
              </div>
              <p className="text-xl font-black italic">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex p-1.5 bg-white/5 rounded-[28px] mb-10 max-w-sm mx-auto border border-white/5">
          <button onClick={() => setActiveTab('all-time')} className={`flex-1 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all-time' ? 'bg-white text-black' : 'text-zinc-500'}`}>All-Time</button>
          <button onClick={() => setActiveTab('rising')} className={`flex-1 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rising' ? 'bg-indigo-500 text-white' : 'text-zinc-500'}`}>Rising</button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="Search Agent Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-[24px] py-5 pl-16 pr-6 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all" />
        </div>

        {!searchQuery && artists.length >= 3 && activeTab === 'all-time' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-24 mt-12 px-2">
            <div onClick={() => router.push(`/gallery?user=${artists[1].id}`)} className="order-2 md:order-1 relative p-8 rounded-[40px] border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer min-h-[220px]">
              <div className="absolute top-6 right-8 text-7xl font-black italic text-white/5">#2</div>
              <Medal size={36} className="text-zinc-400 mb-4" />
              <h3 className="text-2xl font-black uppercase no-wrap leading-tight">{artists[1].displayName}</h3>
              <div className="flex items-center gap-2 mt-4 bg-zinc-900 px-4 py-2 rounded-full w-fit">
                <Heart size={14} className="text-red-500 fill-red-500" />
                <span className="font-bold text-sm">{artists[1].totalLikes.toLocaleString()}</span>
              </div>
            </div>
            <div onClick={() => router.push(`/gallery?user=${artists[0].id}`)} className="order-1 md:order-2 relative p-10 rounded-[50px] border-2 border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-transparent hover:scale-105 transition-all cursor-pointer min-h-[300px] shadow-[0_0_50px_rgba(234,179,8,0.1)]">
              <Crown size={60} className="text-yellow-500 absolute -top-10 left-1/2 -translate-x-1/2 drop-shadow-[0_0_20px_rgba(234,179,8,1)]" />
              <div className="absolute top-8 right-10 text-9xl font-black italic text-yellow-500/5">#1</div>
              <h3 className="text-3xl font-black uppercase italic gold-glow text-center no-wrap leading-tight">{artists[0].displayName}</h3>
              <div className="flex items-center gap-3 mt-6 bg-yellow-500/20 px-6 py-3 rounded-full w-fit mx-auto border border-yellow-500/40">
                <Heart size={18} className="text-yellow-500 fill-yellow-500" />
                <span className="font-black text-xl">{artists[0].totalLikes.toLocaleString()}</span>
              </div>
            </div>
            <div onClick={() => router.push(`/gallery?user=${artists[2].id}`)} className="order-3 relative p-8 rounded-[40px] border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer min-h-[200px]">
              <div className="absolute top-6 right-8 text-7xl font-black italic text-orange-500/5">#3</div>
              <Flame size={36} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black uppercase no-wrap leading-tight">{artists[2].displayName}</h3>
              <div className="flex items-center gap-2 mt-4 bg-zinc-900 px-4 py-2 rounded-full w-fit">
                <Heart size={14} className="text-red-500 fill-red-500" />
                <span className="font-bold text-sm">{artists[2].totalLikes.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredArtists.slice((searchQuery || activeTab === 'rising') ? 0 : 3).map((artist, index) => {
            const pos = (searchQuery || activeTab === 'rising') ? index + 1 : index + 4;
            const isMe = artist.id === currentUser?.uid;
            const tier = getLevelInfo(artist.totalCreations, artist.totalLikes);
            return (
              <div key={artist.id} onClick={() => router.push(`/gallery?user=${artist.id}`)} className={`flex items-center gap-4 p-4 md:p-5 rounded-[32px] border transition-all cursor-pointer active:scale-[0.98] ${isMe ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}>
                <div className="w-8 md:w-10 text-center font-black italic text-zinc-700 text-xs md:text-sm">#{pos}</div>
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 ${isMe ? 'bg-indigo-500' : 'bg-zinc-800'}`}><User size={20} className={isMe ? 'text-white' : 'text-zinc-500'} /></div>
                <div className="flex-1">
                  <h4 className="font-black uppercase italic no-wrap leading-tight text-sm md:text-lg flex flex-wrap items-center gap-2">
                    {artist.displayName}
                    {isMe && <span className="text-[7px] bg-indigo-500 px-2 py-0.5 rounded-full text-white not-italic font-bold tracking-widest uppercase">YOU</span>}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-[7px] md:text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${tier.bg} ${tier.color} ${tier.border}`}>{tier.icon} {tier.name}</span>
                    <span className="text-[7px] md:text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-white/5 text-zinc-400 border border-white/5 flex items-center gap-1.5"><Wand2 size={10} /> {artist.totalCreations || 0} Artifacts</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-3 rounded-2xl border border-white/5 shrink-0"><Heart size={14} className="text-red-500 fill-red-500" /><span className="font-black text-sm md:text-base">{artist.totalLikes.toLocaleString()}</span></div>
              </div>
            );
          })}
        </div>

        {hasMore && !loading && (
          <button onClick={loadMore} className="w-full mt-10 py-8 flex flex-col items-center gap-3 group">
            <div className="h-px w-20 bg-zinc-800 group-hover:w-full transition-all duration-700" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 group-hover:text-indigo-400 transition-colors">{loadingMore ? "Syncing Network..." : "Access More Entities"}</span>
          </button>
        )}
      </div>

      {userData && (
        <div className="fixed bottom-6 left-0 right-0 z-[100] px-4">
          <div className="max-w-md mx-auto bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-[35px] p-2 flex items-center justify-between shadow-2xl shadow-indigo-500/20">
            <div className="flex items-center gap-3 pl-3 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-2xl flex items-center justify-center rotate-3"><Trophy size={18} className="text-white -rotate-3" /></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black flex items-center justify-center"><Check size={8} className="text-black font-bold" /></div>
              </div>
              <div className="min-w-0">
                <h4 className="font-black italic text-sm md:text-base truncate leading-none mb-1">{userData.displayName}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Rank #{userRank}</span>
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-[9px] font-bold text-zinc-600 truncate max-w-[80px]">ID: {userData["imagynex_uid"] || userData.id.substring(0,8)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 pr-1">
              <button onClick={handleShare} className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:scale-90"><Share2 size={16} className={shared ? "text-green-500" : "text-zinc-400"} /></button>
              <button onClick={() => router.push(`/gallery?user=${currentUser?.uid}`)} className="bg-white text-black px-4 md:px-6 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-90 shadow-lg">PORTAL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}