"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Sparkles, Send, Mail, MessageSquare, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await addDoc(collection(db, "messages"), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      console.error("Firebase Error:", error);
      setStatus("idle");
      alert("An error occurred while sending your message. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 font-sans">
      {/* NAVIGATION */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Sparkles size={18} fill="currentColor" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase italic">
              Imagynex<span className="text-indigo-500 not-italic"> AI</span>
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition">
            <ArrowLeft size={14} /> Back to Studio
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
          {/* LEFT SIDE: BRANDING & INFO */}
          <div className="space-y-8">
            <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
              Support Center
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.9]">
              Connect With <br /><span className="text-indigo-500">Our Team.</span>
            </h1>
            <p className="text-zinc-500 text-lg max-w-md font-medium leading-relaxed">
              Have a question about our neural models or a suggestion to improve our engine? We are here to listen.
            </p>
          </div>

          {/* RIGHT SIDE: CONTACT FORM */}
          <div className="bg-zinc-900/30 border border-white/5 p-8 md:p-12 rounded-[40px] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[50px] rounded-full" />
            
            {status === "success" ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20 animate-in fade-in zoom-in duration-500">
                <div className="bg-green-500/20 p-6 rounded-full">
                  <CheckCircle2 size={60} className="text-green-500 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Transmission Received</h2>
                  <p className="text-zinc-500 text-sm font-medium">Thank you for reaching out. Our team will review your message and respond shortly.</p>
                </div>
                <button onClick={() => setStatus("idle")} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-white transition">
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-2">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={(e)=>setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 transition text-sm font-medium placeholder:text-zinc-700" 
                    placeholder="Enter your name" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-2">Email Address</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={(e)=>setFormData({...formData, email: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 transition text-sm font-medium placeholder:text-zinc-700" 
                    placeholder="name@example.com" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-2">Message</label>
                  <textarea 
                    required 
                    rows={4} 
                    value={formData.message} 
                    onChange={(e)=>setFormData({...formData, message: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 transition resize-none text-sm font-medium placeholder:text-zinc-700" 
                    placeholder="How can we help you?" 
                  />
                </div>
                
                <button 
                  disabled={status === "loading"} 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
                >
                  {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {status === "loading" ? "Transmitting..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="py-12 text-center opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Imagynex AI &copy; 2025 • Neural Creative Engine</p>
      </footer>
    </div>
  );
}