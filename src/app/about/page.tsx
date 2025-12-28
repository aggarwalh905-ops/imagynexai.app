"use client";
import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Globe, 
  Cpu, 
  ArrowRight, 
  Wand2, 
  Layers, 
  Command,
  Activity
} from 'lucide-react';

export default function About() {
  const stats = [
    { label: "Neural Syntheses", value: "950K+" },
    { label: "Active Creators", value: "30K+" },
    { label: "Core Engine", value: "Pollinations" },
    { label: "Uptime", value: "99.9%" },
  ];

  const features = [
    {
      icon: <Cpu className="text-indigo-500" size={24} />,
      title: "Pollinations AI Backbone",
      desc: "Powered by the Pollinations decentralized network for rapid, high-fidelity image synthesis without hardware limits."
    },
    {
      icon: <Wand2 className="text-amber-400" size={24} />,
      title: "Puter Prompt Logic",
      desc: "Advanced prompt engineering and enhancement powered by Puter AI to bridge the gap between human thought and machine art."
    },
    {
      icon: <Shield className="text-emerald-500" size={24} />,
      title: "Encrypted Protocol",
      desc: "Your creative session is protected by end-to-end encryption, ensuring your artistic intent remains private."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 font-sans">
      {/* BACKGROUND ORBS */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      {/* NAVIGATION */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Sparkles size={18} fill="currentColor" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase italic">
              Imagynex<span className="text-indigo-500 not-italic">.</span>
            </span>
          </Link>
          <Link href="/" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition">
            <Command size={12} /> Back to Studio
          </Link>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-8">
            Neural Ecosystem v2.0
          </div>
          <h1 className="text-5xl md:text-9xl font-black tracking-tighter italic uppercase mb-8 leading-[0.85] bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent">
            Where Dreams <br /> <span className="text-white">Synthesize.</span>
          </h1>
          <p className="max-w-xl mx-auto text-zinc-500 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
            Integrating Pollinations AI with Puter-driven prompt architecture for the next generation of visual visionaries.
          </p>
        </section>

        {/* STATS STRIP */}
        <section className="border-y border-white/5 bg-white/[0.02] py-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
            {stats.map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="text-3xl md:text-5xl font-black text-white mb-2 group-hover:text-indigo-500 transition-colors">{stat.value}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CONTENT SECTION */}
        <section className="max-w-7xl mx-auto px-6 py-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-6">The Infrastructure</h2>
                <p className="text-zinc-500 leading-relaxed text-lg font-medium">
                  Imagynex is a high-performance workspace utilizing a hybrid stack of decentralized neural networks and cloud-based LLM logic.
                </p>
              </div>
              
              <div className="space-y-4">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-6 p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <div className="mt-1 group-hover:scale-110 transition-transform">{f.icon}</div>
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-xs mb-2 text-white">{f.title}</h4>
                      <p className="text-zinc-500 text-[10px] leading-relaxed font-bold uppercase tracking-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-600/20 blur-[120px] rounded-full group-hover:bg-indigo-600/30 transition-all" />
              <div className="relative aspect-[4/5] rounded-[48px] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2574&auto=format&fit=crop" 
                  alt="Neural Art Output" 
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="text-indigo-500 animate-pulse" size={20} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Signal Active: Pollinations v1</span>
                  </div>
                  <p className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                    "Artificial creativity is the new frontier."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="max-w-5xl mx-auto px-6 mb-40">
           <div className="bg-indigo-600 rounded-[64px] p-12 md:p-24 text-center relative overflow-hidden group">
              <div className="relative z-10">
                <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-10 leading-none">Initialize <br /> System</h2>
                <Link href="/" className="inline-flex items-center gap-4 bg-white text-black px-12 py-6 rounded-full font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black hover:text-white transition-all active:scale-95 shadow-2xl">
                  Enter Neural Studio <ArrowRight size={16} />
                </Link>
              </div>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-white/10 blur-[100px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-black/20 blur-[80px] rounded-full" />
           </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-20 text-center bg-black">
        <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="bg-zinc-800 p-1 rounded-md">
                    <Sparkles size={14} fill="currentColor" />
                </div>
                <span className="font-black text-sm tracking-tighter uppercase italic">Imagynex.</span>
            </div>
        </div>
        <p className="text-zinc-800 text-[9px] font-black uppercase tracking-[0.8em]">
          End of Transmission • 2025
        </p>
      </footer>
    </div>
  );
}