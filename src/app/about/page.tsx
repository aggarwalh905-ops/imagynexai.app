"use client";
import React from 'react';
import Link from 'next/link';
import { Sparkles, Zap, Shield, Globe, Cpu, Users, ArrowRight } from 'lucide-react';

export default function About() {
  const stats = [
    { label: "Images Generated", value: "500K+" },
    { label: "Active Creators", value: "10K+" },
    { label: "Neural Models", value: "v2.0 Turbo" },
    { label: "Avg. Speed", value: "2.4s" },
  ];

  const features = [
    {
      icon: <Cpu className="text-indigo-500" size={24} />,
      title: "Neural Engine",
      desc: "Powered by the latest FLUX and Turbo models for unmatched image fidelity and detail."
    },
    {
      icon: <Shield className="text-blue-500" size={24} />,
      title: "Safe Synthesis",
      desc: "Built-in safety filters ensure that every creation aligns with ethical AI standards."
    },
    {
      icon: <Globe className="text-purple-500" size={24} />,
      title: "Global Archive",
      desc: "A decentralized community gallery where creators share their vision with the world."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30">
      {/* DECORATIVE BACKGROUND */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      {/* NAVIGATION */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Sparkles size={18} fill="currentColor" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase italic">
              Imagynex<span className="text-indigo-500 not-italic"> AI</span>
            </span>
          </Link>
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition">
            Back to Studio
          </Link>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8">
            The Future of Creativity
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase mb-8 leading-none">
            We Bridge <span className="text-indigo-500">Dreams</span> <br /> & Pixels.
          </h1>
          <p className="max-w-2xl mx-auto text-zinc-500 text-lg md:text-xl font-medium leading-relaxed">
            Imagynex AI is a high-performance neural synthesis platform designed for the next generation of digital artists and visionaries.
          </p>
        </section>

        {/* STATS */}
        <section className="border-y border-white/5 bg-zinc-900/20 py-16">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CONTENT SECTION */}
        <section className="max-w-7xl mx-auto px-6 py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">Our Mission</h2>
              <p className="text-zinc-400 leading-relaxed text-lg">
                Our goal is to make AI technology so easy that anyone can turn their thoughts into reality (an image) with just a single click. We believe in pushing the boundaries of creativity.
              </p>
              <div className="pt-4 grid grid-cols-1 gap-6">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-4 p-6 rounded-3xl bg-zinc-900/40 border border-white/5">
                    <div className="mt-1">{f.icon}</div>
                    <div>
                      <h4 className="font-black uppercase tracking-wider text-sm mb-1">{f.title}</h4>
                      <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full" />
              <div className="relative aspect-square rounded-[40px] overflow-hidden border border-white/10 bg-zinc-900">
                 {/* Yahan aap koi bhi cool AI image placeholder laga sakte hain */}
                 <img 
                   src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800" 
                   alt="AI Vision" 
                   className="w-full h-full object-cover opacity-60"
                 />
                 <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
                    <p className="text-2xl font-black italic uppercase tracking-tighter">"If you can imagine it, you can create it."</p>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 mb-32">
           <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-8">Ready to start?</h2>
                <Link href="/" className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-transform">
                  Enter Studio <ArrowRight size={18} />
                </Link>
              </div>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 blur-[80px] rounded-full" />
           </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 text-center">
        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.5em]">
          Imagynex AI &copy; 2025 • Built for Visionaries
        </p>
      </footer>
    </div>
  );
}