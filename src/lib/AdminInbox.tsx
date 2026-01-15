"use client";
import React, { useEffect, useState, useRef } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { 
  Mail, Trash2, User, Clock, MessageSquareText, Loader2, 
  AlertCircle, Send, ChevronDown, Search, CheckCheck, 
  Copy, Eraser, Volume2, VolumeX, BellRing 
} from 'lucide-react';

export default function AdminInbox({ isAdmin }: { isAdmin: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Ref to track previous message count for audio triggers
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Audio Notification Logic
        if (soundEnabled && !loading && msgs.length > prevCountRef.current) {
          playNotificationSound();
        }
        
        prevCountRef.current = msgs.length;
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, soundEnabled, loading]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3');
      audio.volume = 0.4;
      audio.play();
    } catch (e) {
      console.log("Audio play blocked by browser policy");
    }
  };

  // --- ACTIONS ---
  const deleteMessage = async (id: string) => {
    if (!confirm("Confirm permanent deletion of this transmission?")) return;
    await deleteDoc(doc(db, "messages", id));
  };

  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "messages", id), { isRead: !currentStatus });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could replace alert with a toast notification here
  };

  const clearAllMessages = async () => {
    const code = Math.floor(1000 + Math.random() * 9000);
    if (confirm(`NUKE ALL MESSAGES? Enter this code to confirm: ${code}`)) {
       const userInput = prompt("Enter confirmation code:");
       if(userInput === code.toString()) {
         const batch = writeBatch(db);
         const snapshot = await getDocs(collection(db, "messages"));
         snapshot.forEach((doc) => batch.delete(doc.ref));
         await batch.commit();
         alert("Inbox Purged.");
       }
    }
  };

  const filteredMessages = messages.filter(msg => 
    msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="mt-20 max-w-6xl mx-auto px-6 pb-40 font-sans">
      
      {/* --- MASTER CONTROL PANEL --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-16">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="bg-indigo-600 p-5 rounded-[28px] shadow-[0_0_50px_-10px_rgba(79,70,229,0.6)] border border-indigo-400/50 relative z-10">
              <BellRing size={32} className="text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
          </div>
          <div>
            <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-white">
              Neural <span className="text-indigo-500">Inbox</span>
            </h2>
            <div className="flex items-center gap-3 mt-3">
               <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Monitoring</span>
               </div>
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                 {messages.filter(m => !m.isRead).length} Unread Transmissions
               </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/50 p-2 rounded-[24px] border border-white/5 backdrop-blur-md">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search buffer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-[11px] font-bold outline-none focus:border-indigo-500/50 w-full sm:w-48 transition-all"
            />
          </div>

          {/* Audio Toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-xl border transition-all ${soundEnabled ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-zinc-800 border-white/5 text-zinc-500'}`}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Wipe Button */}
          <button 
            onClick={clearAllMessages}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
          >
            <Eraser size={14} /> Purge
          </button>
        </div>
      </div>

      {/* --- TRANSMISSION FEED --- */}
      <div className="grid gap-8">
        {filteredMessages.slice(0, visibleCount).map((msg) => (
          <div 
            key={msg.id} 
            className={`group relative overflow-hidden rounded-[45px] transition-all duration-700 border ${
              msg.isRead 
              ? 'bg-zinc-900/20 border-white/5 opacity-50 scale-[0.98]' 
              : 'bg-zinc-900/60 border-indigo-500/20 shadow-2xl shadow-indigo-500/10 hover:border-indigo-500/40'
            }`}
          >
            <div className="p-8 md:p-10">
              <div className="flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex-1 space-y-6">
                  
                  {/* Sender Profile */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-5">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border transition-all ${msg.isRead ? 'bg-zinc-800 border-white/5' : 'bg-indigo-600/20 border-indigo-500/30'}`}>
                        <User size={24} className={msg.isRead ? "text-zinc-600" : "text-indigo-400"} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">{msg.name || "Unknown"}</h3>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <span className="text-[11px] font-bold tracking-tight">{msg.email}</span>
                          <button onClick={() => copyToClipboard(msg.email)} className="hover:text-indigo-400 transition-colors"><Copy size={12} /></button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                      <Clock size={12} className="text-zinc-600" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                        {msg.createdAt?.toDate() ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Timestamp Processing...'}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className={`relative p-8 rounded-[32px] border transition-all ${msg.isRead ? 'bg-black/10 border-white/5 italic text-zinc-600' : 'bg-black/60 border-indigo-500/10 text-zinc-200'}`}>
                    {!msg.isRead && <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                    <p className="text-base leading-relaxed font-medium">
                      "{msg.message}"
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="ml-auto p-4 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all group/del"
                    >
                      <Trash2 size={22} className="group-hover/del:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* --- LOAD MORE / EMPTY STATES --- */}
        {filteredMessages.length > visibleCount && (
          <button 
            onClick={() => setVisibleCount(prev => prev + 5)}
            className="w-full py-8 mt-6 bg-zinc-900/30 border border-white/5 hover:border-indigo-500/50 rounded-[40px] text-[11px] font-black uppercase tracking-[0.5em] text-zinc-500 hover:text-indigo-400 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="flex items-center justify-center gap-4 relative z-10">
              <ChevronDown size={18} className="group-hover:translate-y-1 transition-transform" /> 
              Decrypt Further Transmissions
            </span>
          </button>
        )}

        {filteredMessages.length === 0 && !loading && (
          <div className="text-center py-40 bg-zinc-900/10 border-2 border-dashed border-white/5 rounded-[60px]">
            <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
               <MessageSquareText size={32} />
            </div>
            <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">
              Neural Buffer Empty • No Signals Detected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}