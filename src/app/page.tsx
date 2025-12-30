"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, Sparkles, Loader2, Image as ImageIcon, 
  Zap, Maximize, MessageSquareText, RefreshCw,
  MousePointer2, LayoutGrid, Menu, X, Share2,Wand2, Hash,
  History, Sliders, ShieldCheck, Info, AlertCircle, Ban, Copy, Check, Trash2, ChevronDown
} from 'lucide-react';

import { 
  updateDoc,
  getDoc, 
  setDoc, 
  increment, 
} from "firebase/firestore";

// import { db } from "./your-firebase-config-file";
// Ensure 'db' is also imported from your firebase config file

// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  limit,
  deleteDoc,
  doc
} from "firebase/firestore";

// --- CUSTOM COMPONENTS ---

const ImagynexLogo = () => (
  <div className="flex items-center gap-2 group cursor-pointer">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 group-hover:opacity-50 transition-all"></div>
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-500 p-1.5 rounded-xl border border-white/20 shadow-xl">
        <Sparkles size={18} className="text-white" fill="currentColor" />
      </div>
    </div>
    <span className="font-black text-lg md:text-xl tracking-tighter uppercase italic">
      Imagynex<span className="text-indigo-500 not-italic"> AI</span>
    </span>
  </div>
);

const VisionaryLoader = () => (
  <div className="flex flex-col items-center justify-center gap-6">
    <div className="relative w-16 h-16 md:w-20 md:h-20">
      <div className="absolute inset-0 border-t-2 border-r-2 border-indigo-500 rounded-full animate-spin"></div>
      <div className="absolute inset-3 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-full animate-pulse blur-sm opacity-50"></div>
      <div className="absolute inset-5 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
        <Zap size={18} className="text-indigo-500 animate-bounce" fill="currentColor" />
      </div>
    </div>
    <div className="text-center px-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse">
        Synthesizing Vision
      </p>
    </div>
  </div>
);

export default function AIStudio() {
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState<number | string>(""); 
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState("flux");
  const [ratio, setRatio] = useState("1:1");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("Default");
  const [communityImages, setCommunityImages] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("blurry, bad anatomy, low quality, distorted, extra fingers, ugly, low-resolution, out of frame");
  
  const [error, setError] = useState<{message: string, type: string} | null>(null);

  // Error auto-hide karne ke liye useEffect
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000); // 8 seconds baad gayab ho jayega
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  // Toast ko automatic hide karne ke liye useEffect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const hasSeenv2 = localStorage.getItem('imagynex_v2_init');
    if (!hasSeenv2) {
      setShowReleaseModal(true);
    }
  }, []);

  const closeReleaseModal = () => {
    localStorage.setItem('imagynex_v2_init', 'true');
    setShowReleaseModal(false);
  };
  
  const ProBadge = () => (
    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
      <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400">Pro</span>
    </span>
  );

  // Quick tip: Add this to your useEffect where you handle the modal
  useEffect(() => {
    if (showReleaseModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showReleaseModal]);

  const styles = [
    { name: "Default", suffix: "" },
    { name: "Cinematic", suffix: ", cinematic lighting, 8k, highly detailed, masterpiece" },
    { name: "Anime", suffix: ", anime style, vibrant colors, studio ghibli aesthetic" },
    { name: "Cyberpunk", suffix: ", neon lights, futuristic, synthwave palette, tech" },
    { name: "3D Render", suffix: ", octane render, unreal engine 5, volumetric lighting" },
    { name: "Oil Painting", suffix: ", textured canvas, heavy brushstrokes, classical art" }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('imagynex_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommunityImages(docs);
    });
    return () => unsubscribe();
  }, []);

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const handlePuterChat = async () => {
    if (!chatInput) return;
    setLoading(true); // Loading state on karein
    try {
      // @ts-ignore
      const response = await puter.ai.chat(
        `Act as a professional prompt engineer. Convert this idea into a concise, high-impact image generation prompt (max 25 words). Focus on lighting, style, and quality. Idea: ${chatInput}`
      );

      setPrompt(response.toString().trim()); // response ko clean karke set karein
      // Seedha main prompt box mein text daalna
      setPrompt(response.toString());
      setIsChatOpen(false); // Chat band
      setChatInput(""); // Input clear
    } catch (err) {
      console.error("Puter Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const enhancePrompt = async () => {
    if (!prompt) return;
    setEnhancing(true);
    try {
      // System instructions add ki gayi hain taaki AI extra baatein na kare
      const systemInstruction = "Master AI Artist. Rewrite the user prompt into a high-detail cinematic masterpiece. Add specific lighting (e.g. volumetric, 8k), camera lens (e.g. 35mm), and textures. Keep it under 60 words. Return ONLY the prompt.";
      const encodedPrompt = encodeURIComponent(`${systemInstruction} \n\nUser Prompt: ${prompt}`);
      
      const response = await fetch(`https://text.pollinations.ai/${encodedPrompt}`);
      let data = await response.text();
      
      // Cleaning: Agar AI phir bhi quotes ya "Prompt:" likh de toh use remove karne ke liye
      data = data.replace(/^(Prompt:|Improved Prompt:|")|"$|^\s+|\s+$/g, '');
      
      setPrompt(data.trim());
    } catch (error) { 
      console.error("Enhancement failed:", error); 
    }
    finally { setEnhancing(false); }
  };

  const applyMagicPrompt = () => {
    const modifiers = [
      "cinematic lighting, 8k, highly detailed, masterpiece",
      "bioluminescent, surreal atmosphere, dreaming vibe",
      "macro photography, sharp focus, intricate textures",
      "neon glow, cyberpunk aesthetic, retro-futurism",
      "soft moonlight, ethereal fog, fantasy art style",
      "octane render, unreal engine 5, volumetric lighting"
    ];

    const randomMod = modifiers[Math.floor(Math.random() * modifiers.length)];

    if (!prompt) {
      const randomBases = ["A futuristic city", "A mystical forest", "A cosmic astronaut", "A majestic lion"];
      setPrompt(randomBases[Math.floor(Math.random() * randomBases.length)]);
    } else {
      // Check taaki baar-baar same cheez add na ho
      if (!prompt.includes(randomMod)) {
        setPrompt(`${prompt.trim()}, ${randomMod}`);
      }
    }
  };

  const downloadImage = async (imgUrl: string) => {
    // 1. Immediately show intent (even if it takes 100ms, UI feels responsive)
    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      // Use anonymous to avoid CORS canvas "tainting"
      img.crossOrigin = "anonymous";
      
      // Adding the timestamp is good for fresh generations, 
      // but ensure your storage (S3/Firebase) allows CORS
      img.src = imgUrl; 

      img.onload = () => {
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // --- Watermark Logic ---
        const fontSize = Math.floor(canvas.width * 0.035);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 10;
        
        ctx.fillText("IMAGYNEX AI", canvas.width - 20, canvas.height - 20);

        // --- Instant Trigger ---
        const link = document.createElement('a');
        // Using 'image/png' is sometimes faster for canvas than 'jpeg' encoding
        link.href = canvas.toDataURL("image/png");
        link.download = `Imagynex-${Date.now()}.png`;
        link.click();
        
        setLoading(false);
      };

      img.onerror = () => {
        throw new Error("Direct draw failed");
      };

    } catch (err) {
      console.error("Fast download failed, trying fallback", err);
      // Fallback if canvas is blocked
      const link = document.createElement('a');
      link.href = imgUrl;
      link.target = "_blank";
      link.download = "Imagynex-Art.jpg";
      link.click();
      setLoading(false);
    }
  };

  const shareProject = async () => {
    if (!image) return;
    setLoading(true);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;

    img.onload = () => {
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 10/10 Watermark Logic: Added Shadow for visibility on bright images
      const fontSize = Math.floor(canvas.width * 0.03);
      ctx.font = `black ${fontSize}px sans-serif`;
      ctx.textAlign = "right";
      
      // Subtle Shadow
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "white";
      ctx.fillText("IMAGYNEX NEURAL CORE", canvas.width - 40, canvas.height - 40);

      // Convert to blob at slightly higher quality (0.8) for the sweet spot
      canvas.toBlob(async (blob) => {
        if (!blob) return setLoading(false);

        const file = new File([blob], "ImagynexArt.png", { type: "image/png" });
        const shareData = {
          title: 'Imagynex.AI Masterpiece',
          text: `Synthesized with Imagynex Neural Engine: "${prompt}"`,
          files: [file],
        };

        try {
          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            copyImageLinkFallback();
          }
        } catch (err) {
          // User cancelled share or error occurred
          console.log("Share cancelled");
        }
        setLoading(false);
      }, "image/png", 0.8);
    };
  };

  // Fallback function agar share support na ho
  const copyImageLinkFallback = () => {
    if (!image) return;

    // 1. Copy Link
    navigator.clipboard.writeText(image);
    
    // 2. Trigger your 10/10 Toast instead of Alert
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);

    // 3. Silent Auto-Download
    const link = document.createElement("a");
    link.href = image;
    link.download = `Imagynex-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cloudId = params.get('id');
    const sharedPrompt = params.get('prompt');
    const sharedImg = params.get('img');

    // Case A: Agar Cloud ID hai toh Firebase se fetch karega
    if (cloudId) {
      const fetchCloudData = async () => {
        setLoading(true);
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const docSnap = await getDoc(doc(db, "gallery", cloudId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setPrompt(data.prompt);
            setImage(data.imageUrl);
            setSelectedStyle(data.style || "Default");
            setSeed(data.seed || "");
          }
        } catch (err) { console.error("Cloud fetch error:", err); }
        finally { setLoading(false); }
      };
      fetchCloudData();
    } 
    // Case B: Agar Local share hai toh URL se uthayega
    else if (sharedPrompt) {
      setPrompt(sharedPrompt);
      if (sharedImg) setImage(sharedImg);
      setSeed(params.get('seed') || "");
      setSelectedStyle(params.get('style') || "Default");
    }
  }, []);

  const handleImageSelection = (data: any) => {
    if (!data) return;

    // 1. Load the Core Prompt
    setPrompt(data.prompt || "");

    // 2. Restore Advanced Parameters (The Secret Sauce)
    if (data.negativePrompt !== undefined) {
      setNegativePrompt(data.negativePrompt);
    } else {
      // Default fallback if the selected image didn't have one
      setNegativePrompt("blurry, low quality, low-resolution");
    }

    if (data.seed !== undefined) {
      setSeed(data.seed);
    }

    if (data.ratio) {
      setRatio(data.ratio);
    }

    if (data.model) {
      setModel(data.model);
    }

    // 3. Update the Preview Image
    setImage(data.imageUrl || data.url);
    
    // 4. Smooth Scroll back to the top so the user can see the loaded settings
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 5. Optional: Close mobile menu if open
    setIsMenuOpen(false);
  };

  const removeFromHistory = async (e: React.MouseEvent, index: number, firestoreId?: string) => {
    e.stopPropagation();

    // Step 1: Confirm removal from the phone/local history
    const confirmLocal = window.confirm("Remove this image from your recent history?");
    
    if (confirmLocal) {
      // Step 2: If it's a cloud image, ask if they want to delete it from the Database too
      let deleteFromCloud = false;
      
      if (firestoreId) {
        deleteFromCloud = window.confirm(
          "Do you also want to delete this image from the Global Gallery (Database)? \n\nClick 'OK' to delete everywhere, or 'Cancel' to keep it in the Gallery."
        );
      }

      // --- EXECUTION ---

      // 1. Remove from local UI state and LocalStorage (Phone)
      const updatedHistory = history.filter((_, i) => i !== index);
      setHistory(updatedHistory);
      localStorage.setItem('imagynex_history', JSON.stringify(updatedHistory));

      // 2. Conditionally remove from Firebase (Database)
      if (firestoreId && deleteFromCloud) {
        try {
          await deleteDoc(doc(db, "gallery", firestoreId));
          console.log("Cloud record purged.");
        } catch (error) {
          console.error("Cloud delete failed:", error);
          alert("Local history cleared, but cloud deletion failed. Please try again.");
        }
      }
    }
  };

  // --- SEARCH FOR generateImage FUNCTION IN YOUR CODE AND UPDATE IT ---

  const generateImage = async (overrideSeed?: number) => {
    // Ensure we have a prompt before proceeding
    if (!prompt) return;

    setLoading(true);
    setSaveStatus(null);
    setError(null);

    // 1. Get UID and Fetch Profile Name
    let storedUid = localStorage.getItem('imagynex_uid');
    if (!storedUid) {
      storedUid = 'u_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('imagynex_uid', storedUid);
    }

    let currentDisplayName = "Artist";
    try {
      const userDoc = await getDoc(doc(db, "users", storedUid));
      if (userDoc.exists()) {
        currentDisplayName = userDoc.data().displayName;
      }
    } catch (err) {
      console.error("User fetch error:", err);
    }

    // Handle Seed Logic
    const finalSeed = overrideSeed !== undefined
      ? overrideSeed
      : (seed !== "" ? Number(seed) : Math.floor(Math.random() * 1000000));

    if (overrideSeed !== undefined || seed === "") {
      setSeed(finalSeed);
    }

    // Aspect Ratio Logic
    let w = 1024, h = 1024;
    if (ratio === "16:9") { w = 1280; h = 720; }
    if (ratio === "9:16") { w = 720; h = 1280; }

    const styleSuffix = styles.find(s => s.name === selectedStyle)?.suffix || "";
    const fullPrompt = `${prompt}${styleSuffix}`;

    // 2. Request through your SECURE proxy 
    // ADDED: &negative_prompt parameter
    const proxyUrl = `/api/generate?prompt=${encodeURIComponent(fullPrompt)}&negative_prompt=${encodeURIComponent(negativePrompt || "")}&width=${w}&height=${h}&model=flux&seed=${finalSeed}&t=${Date.now()}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Server Error");

      const blob = await response.blob();
      
      // Safety: If the image is too small, it's likely an error placeholder
      if (blob.size < 50000) {
        throw new Error("Authentication failed. Check your API Key in Vercel.");
      }

      const objectURL = URL.createObjectURL(blob);
      setImage(objectURL);
      setLoading(false);

      // Prepare history entry with negativePrompt
      const newEntry = {
        url: proxyUrl,
        prompt: fullPrompt,
        negativePrompt: negativePrompt || "", // Added here
        seed: finalSeed,
        ratio,
        model: "flux",
        timestamp: Date.now(),
        firestoreId: null
      };

      try {
        // --- FIREBASE SAVE LOGIC ---
        const docRef = await addDoc(collection(db, "gallery"), {
          imageUrl: proxyUrl,
          prompt: fullPrompt,
          negativePrompt: negativePrompt || "", // Added here
          style: selectedStyle,
          seed: finalSeed,
          ratio: ratio,
          model: "flux",
          createdAt: serverTimestamp(),
          creatorId: storedUid,
          creatorName: currentDisplayName,
          likesCount: 0,
          likedBy: []
        });

        const userRef = doc(db, "users", storedUid);
        await setDoc(userRef, {
          totalCreations: increment(1),
          displayName: currentDisplayName
        }, { merge: true });

        const entryWithId = { ...newEntry, firestoreId: docRef.id };
        const updatedHistory = [entryWithId, ...history].slice(0, 15);
        setHistory(updatedHistory);
        localStorage.setItem('imagynex_history', JSON.stringify(updatedHistory));
        setSaveStatus('cloud');
      } catch (e) {
        console.error("Firebase Save Error:", e);
        const updatedHistory = [newEntry, ...history].slice(0, 15);
        setHistory(updatedHistory);
        localStorage.setItem('imagynex_history', JSON.stringify(updatedHistory));
        setSaveStatus('local');
      }
    } catch (err: any) {
      setLoading(false);
      setError({
        message: err.message || "Engine overloaded. Please try again.",
        type: "server_busy"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-indigo-600/50">
      {/* Error Toast Notification */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in fade-in slide-in-from-top-8 duration-500">
          <div className="bg-zinc-900/90 backdrop-blur-2xl border border-red-500/20 p-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-start gap-4">
            <div className="bg-red-500/10 p-2 rounded-full text-red-500 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">
                System Congestion
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {error.message}
              </p>
              <div className="mt-3">
                <button 
                  onClick={() => setError(null)}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-5 h-16 flex items-center justify-between">
          <Link href="/"><ImagynexLogo /></Link>
          
          {/* Desktop Menu - Yahan Gallery add kiya hai */}
          <div className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <Link href="/" className="hover:text-white transition">Create</Link>
            <Link href="/gallery" className="text-indigo-500 hover:text-white transition">Gallery</Link>
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-zinc-400">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu - Yahan bhi Gallery add kiya hai */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-black/80 backdrop-blur-3xl border-b border-white/10 p-8 flex flex-col gap-6 z-[100] animate-in fade-in slide-in-from-top-4">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">Studio</Link>
            <Link href="/gallery" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-indigo-500">Global Gallery</Link>
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">About</Link>
            <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">Contact</Link>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-5 pt-8 md:pt-16 pb-32">
        <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4 md:mb-6">
            Imagynex Neural Engine v2
          </div>
          <h1 className="text-4xl md:text-8xl font-black leading-tight md:leading-[0.9] tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent italic">
            IMAGINE <br className="hidden md:block" /> ANYTHING.
          </h1>
        </div>

        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          <div className="bg-zinc-900/40 border border-white/10 p-5 md:p-8 rounded-[24px] md:rounded-[48px] backdrop-blur-3xl shadow-2xl space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Art Style</label>
              <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth snap-x">
                {styles.map((s) => (
                  <button 
                    key={s.name} 
                    onClick={() => setSelectedStyle(s.name)} 
                    className={`whitespace-nowrap px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 border snap-center active:scale-90 ${
                      selectedStyle === s.name 
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_25px_rgba(79,70,229,0.5)] scale-105 z-10' 
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white hover:bg-white/10 hover:-translate-y-0.5'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Input Prompt</label>
                
                <div className="flex gap-3 md:gap-4">
                  {/* 1. Magic Button */}
                  <button onClick={applyMagicPrompt} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition">
                    <Sparkles size={12} fill="currentColor" /> 
                    <span className="hidden xs:inline">Magic</span>
                  </button>

                  {/* 2. Puter AI Assistant Trigger */}
                  {/* In-line Assistant Trigger */}
                  <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 transition">
                    <MessageSquareText size={12} />
                    <span className="hidden xs:inline">Assistant</span>
                  </button>

                  <button 
                    onClick={enhancePrompt} 
                    disabled={enhancing || !prompt}
                    className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-300 transition disabled:opacity-30"
                  >
                    {enhancing ? (
                      <Loader2 size={12} className="animate-spin" /> 
                    ) : (
                      <Wand2 size={12} />
                    )}
                    <span className="hidden xs:inline">{enhancing ? "Refining..." : "Enhance"}</span>
                  </button>

                  {/* 3. Copy Button */}
                  <button onClick={handleCopy} disabled={!prompt} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white disabled:opacity-20 transition">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    <span className="hidden xs:inline">{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <textarea 
                className="w-full bg-black/80 border border-white/10 rounded-2xl p-5 text-sm md:text-lg outline-none transition-all h-32 md:h-28 resize-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:shadow-[0_0_30px_rgba(79,70,229,0.15)] placeholder:text-zinc-700" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Describe your wildest imagination..." 
              />
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-widest px-1"
              >
                <Sliders size={12} className={showAdvanced ? "text-indigo-500" : ""} /> 
                {showAdvanced ? "Collapse" : "Configure"} Neural Parameters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black/40 rounded-[32px] border border-white/5 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 ease-out">
                  
                  {/* 1. Negative Prompt */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase flex items-center justify-between px-1">
                      <span className="flex items-center gap-1"><Ban size={10} /> Negative Elements</span>
                      {negativePrompt && (
                        <button 
                          onClick={() => setNegativePrompt("")}
                          className="text-[8px] text-zinc-700 hover:text-red-400 transition-colors uppercase tracking-widest"
                        >
                          Clear Filters
                        </button>
                      )}
                    </label>
                    <input 
                      type="text" 
                      value={negativePrompt} 
                      onChange={(e) => setNegativePrompt(e.target.value)} 
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-800 text-zinc-300" 
                      placeholder="Avoid: blurry, distorted, text..." 
                    />
                  </div>

                  {/* 2. Advanced Seed Control */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase flex items-center justify-between px-1">
                      <span className="flex items-center gap-1"><Hash size={10} /> Seed Path</span>
                      {seed && seed !== -1 && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(seed.toString());
                            // You can trigger your showToast here
                          }}
                          className="text-[8px] text-indigo-500/50 hover:text-indigo-400 transition-colors tracking-[0.2em]"
                        >
                          Copy Seed
                        </button>
                      )}
                    </label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={seed} 
                        onChange={(e) => setSeed(e.target.value)} 
                        className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm outline-none focus:border-indigo-500/50 transition-all" 
                        placeholder="Random (-1)" 
                      />
                      <button 
                        onClick={() => setSeed(Math.floor(Math.random() * 999999999))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-indigo-400 transition-colors"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Flex Container for Engine and Ratio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 3. Neural Engine with Pro Badge */}
                <div className="space-y-2">
                  <label htmlFor="engine-select" className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1 flex items-center">
                    Neural Engine <ProBadge />
                  </label>
                  <div className="relative group">
                    <select 
                      id="engine-select" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-indigo-500/50 text-white appearance-none cursor-pointer transition-all hover:bg-black/60"
                    >
                      <option value="zimage" className="bg-zinc-900 text-white">
                        ZIMAGE (Ultra Detail & Realism)
                      </option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-hover:text-white transition-colors">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* 4. Canvas Ratio */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {["1:1", "16:9", "9:16"].map(r => (
                      <button 
                        key={r} 
                        onClick={() => setRatio(r)} 
                        className={`flex-1 p-3 rounded-xl text-[10px] font-black border transition-all duration-300 ${
                          ratio === r 
                          ? 'bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.1)]' 
                          : 'bg-black/60 border-white/5 text-zinc-500 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <button 
                onClick={() => generateImage()} 
                disabled={loading || !prompt?.trim()} 
                className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-black py-6 rounded-2xl md:rounded-[32px] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(79,70,229,0.2)] active:scale-[0.97] uppercase tracking-[0.25em] text-[11px]"
              >
                {/* Shimmer Effect Layer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Content */}
                {/* Update the span inside your generate button */}
                <div className="flex items-center justify-center gap-3 relative z-10">
                  {loading ? (
                    <Loader2 className="animate-spin text-white" size={20} />
                  ) : (
                    <Zap size={20} className="group-hover:scale-125 transition-transform" fill="currentColor" />
                  )}
                  <span>
                    {loading 
                      ? (prompt.length > 60 ? "Encoding Deep Architecture..." : "Synthesizing...") 
                      : "Fire Neural Core"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-end h-6">
              {saveStatus && (
                <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-in fade-in zoom-in duration-300 ${saveStatus === 'cloud' ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                  {saveStatus === 'cloud' ? '● Cloud Synced' : '● Local Vault Only'}
                </div>
              )}
            </div>
            <div id="canvas" className="relative rounded-[24px] md:rounded-[48px] overflow-hidden border border-white/5 bg-zinc-900/30 aspect-square md:aspect-video flex items-center justify-center group shadow-2xl transition-all">
            {image ? (
              <div className="w-full h-full relative">
                <img 
                  src={image} 
                  loading="eager"
                  onError={(e) => {
                    // Fallback if the image URL fails
                    e.currentTarget.src = "https://placehold.co/1024x1024/09090b/4f46e5?text=Signal+Lost";
                  }}
                  className={`w-full h-full object-contain transition-all duration-700 ${
                    loading ? 'blur-2xl scale-95 opacity-50' : 'blur-0 scale-100 opacity-100'
                  }`} 
                  alt="Neural Result" 
                />
                
                {!loading && (
                  <div className="absolute inset-0 bg-black/40 md:opacity-0 group-hover:opacity-100 transition-all flex flex-col md:flex-row items-center justify-center gap-3 p-6">
                    <button 
                      onClick={() => downloadImage(image)} 
                      className="w-full md:w-auto bg-white text-black px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition shadow-2xl uppercase"
                    >
                      <Download size={18}/> Download
                    </button>
                    
                    <button 
                      onClick={shareProject}
                      disabled={!image || loading}
                      className={`w-full md:w-auto px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 transition shadow-2xl uppercase ${
                        !image || loading 
                          ? "opacity-50 cursor-not-allowed bg-zinc-800" 
                          : "bg-zinc-900/80 backdrop-blur-md text-white border border-white/10 hover:bg-zinc-800"
                      }`}
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin text-indigo-400" />
                      ) : (
                        <Share2 size={18} className="text-indigo-400" />
                      )}
                      {loading ? "Preparing File..." : "Share Masterpiece"}
                    </button>

                    <button 
                      onClick={() => generateImage(Math.floor(Math.random()*999999))} 
                      className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition shadow-2xl backdrop-blur-md uppercase"
                    >
                      <RefreshCw size={16}/> New Variant
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* 10/10 Blueprint Empty State */
              <div className="text-center p-10 relative overflow-hidden w-full h-full flex items-center justify-center">
                {/* Subtle Neural Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:40px_40px]" />
                
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/10 animate-pulse">
                    <ImageIcon size={32} className="text-indigo-500/40" />
                  </div>
                  <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">
                    Awaiting Neural Input
                  </p>
                </div>
              </div>
            )}

            {/* High-Z-Index Loader Overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-2xl z-[30]">
                <VisionaryLoader />
              </div>
            )}
          </div>
          </div>

          {history.length > 0 && (
            <section className="mt-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-indigo-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Recent Creations</h3>
                </div>
                <button onClick={() => {setHistory([]); localStorage.removeItem('imagynex_history');}} className="text-[10px] font-black text-zinc-500 hover:text-white transition uppercase">Clear Vault</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {history.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleImageSelection(item)} 
                    className="aspect-square rounded-xl md:rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-indigo-500 transition group relative"
                  >
                    <img src={item.url} className="w-full h-full object-cover" alt="History" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2 text-center">
                      <p className="text-[7px] text-white font-bold uppercase tracking-tighter line-clamp-2 px-1">
                        {item.prompt}
                      </p>
                      <div className="flex gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Maximize size={12} /></div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Taaki image select na ho jaye delete karne par
                            removeFromHistory(e, idx, item.firestoreId);
                          }} 
                          className="bg-red-600 p-1.5 rounded-lg text-white hover:bg-red-500 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-20">
            <div className="flex items-end justify-between mb-8 px-2">
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic">Live Feed</h2>
                <p className="text-zinc-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Real-time syntheses from the cloud</p>
              </div>
              
              {/* Yeh Button Add Kiya Gaya Hai */}
              <Link href="/gallery" className="hidden md:block text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-white transition">
                View Full Archive →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {communityImages.map((data, i) => (
                <div 
                  key={data.id || i} 
                  className="aspect-[4/5] rounded-[24px] md:rounded-[32px] overflow-hidden border border-white/5 relative group hover:border-indigo-500/50 transition cursor-pointer" 
                  onClick={() => handleImageSelection(data)}
                >
                  {/* Update the <img> inside communityImages.map */}
                  <img 
                    src={data.imageUrl} 
                    loading="lazy" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt="Feed" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                      <p className="text-[8px] font-black text-white truncate uppercase tracking-widest mb-1">
                        {data.prompt || "Neural Synthesis"}
                      </p>
                      <p className="text-[7px] text-indigo-400 font-bold uppercase tracking-widest">
                        Click to remix →
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile ke liye "View All" Button */}
            <div className="mt-8 text-center md:hidden">
              <Link href="/gallery" className="inline-block bg-white/5 border border-white/10 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Explore Global Gallery
              </Link>
            </div>
          </section>
        </div>

        {/* --- GLOBAL UI COMPONENTS (Always placed at the end of Main) --- */}
  
        {/* --- FLOATING CHAT UI --- */}
        <button onClick={() => setIsChatOpen(true)} className="fixed bottom-24 right-6 z-50 p-4 bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:scale-110 active:scale-95 transition-all md:bottom-10">
          <MessageSquareText size={24} className="text-white" />
        </button>

        {isChatOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setIsChatOpen(false)} />
            <div className="fixed z-[70] bottom-0 left-0 right-0 h-[50vh] bg-zinc-900 border-t border-white/10 rounded-t-[32px] p-6 md:top-0 md:right-0 md:left-auto md:w-[350px] md:h-full md:rounded-none md:border-l animate-in slide-in-from-bottom md:slide-in-from-right">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase text-indigo-400">Imagynex Nexus AI</h3>
                <button onClick={() => setIsChatOpen(false)}><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  placeholder="What's your idea?" 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm h-32 outline-none focus:border-indigo-500 text-white"
                />
                <button 
                  onClick={handlePuterChat} 
                  disabled={loading || !chatInput}
                  className="w-full py-4 bg-white text-black font-black rounded-2xl text-[10px] tracking-widest uppercase hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {loading ? "Optimizing..." : "Generate & Close"}
                </button>
              </div>
            </div>
          </>
        )}

        {toast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 min-w-[320px] ${
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              toast.type === 'success' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
              'bg-zinc-900/90 border-white/10 text-white'
            }`}>
              {toast.type === 'success' && <Check size={18} />}
              {toast.type === 'error' && <ShieldCheck size={18} />}
              {toast.type === 'info' && <Info size={18} />}
              
              <div className="flex flex-col">
                <p className="text-[11px] font-black uppercase tracking-wider leading-none mb-1">
                  {toast.type === 'error' ? 'System Limit' : 'Generation Update'}
                </p>
                <p className="text-[10px] font-bold opacity-90">{toast.message}</p>
              </div>

              {toast.type === 'error' && (
                <Link href="/gallery" className="ml-auto bg-red-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">
                  Gallery
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-black/60 border-t border-white/5 pt-16 md:pt-20 pb-44 px-5 text-center">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-[32px] p-8 md:p-12 text-zinc-700 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em]">Imagynex AI Neural Creative Suite</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
            <div className="md:col-span-2">
               <ImagynexLogo /><p className="text-zinc-600 text-xs leading-relaxed mt-4 max-w-xs">Pioneering the intersection of human creativity and machine intelligence.</p>
            </div>
            <div className="space-y-3">
               <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Platform</h4>
               <ul className="text-zinc-500 text-[10px] space-y-2 font-bold uppercase tracking-wider">
                  <li><Link href="/privacy">Privacy</Link></li>
                  <li><Link href="/about">About</Link></li>
               </ul>
            </div>
            <div className="space-y-3">
               <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Connect</h4>
               <ul className="text-zinc-500 text-[10px] space-y-2 font-bold uppercase tracking-wider">
                  <li><Link href="#">Discord</Link></li>
                  <li><Link href="#">Twitter</Link></li>
               </ul>
            </div>
          </div>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-10 shadow-2xl z-50 transition-all border-b-indigo-500/50">
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-zinc-400"><MousePointer2 size={20} /></button>
        <button onClick={() => generateImage()} className="text-indigo-500 scale-125"><Zap size={24} fill="currentColor" /></button>
        <button onClick={() => { const el = document.getElementById('canvas'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }} className="text-zinc-400"><LayoutGrid size={20} /></button>
      </div>

      {showToast && (
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[24px] flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-zinc-900">
              <Download size={12} className="text-white" />
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center border-2 border-zinc-900">
              <Check size={12} className="text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Vault Synced</span>
            <span className="text-[8px] font-bold uppercase tracking-tight text-zinc-500">Image Saved & Link Copied</span>
          </div>
        </div>
      </div>
    )}

    {showReleaseModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
        {/* High-blur backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-700" />
        
        <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
          {/* Decorative Top Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          
          <div className="p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 rotate-12">
              <Sparkles className="text-indigo-500 animate-pulse" size={32} />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white mb-4">
              SYSTEM INITIALIZED
            </h2>
            
            <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] leading-relaxed mb-8">
              Welcome to Neural Engine v2.0. <br/> 
              Deep learning models upgraded. <br/>
              Latency reduced by 40%. <br/>
              Imagination limits removed.
            </p>

            <div className="space-y-3">
              <button 
                onClick={closeReleaseModal}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-[11px] tracking-[0.3em] uppercase transition-all active:scale-95 shadow-[0_10px_20px_rgba(79,70,229,0.3)]"
              >
                Enter Neural Studio
              </button>
              
              <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                Build 2025.04.12 // Secure Connection Active
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}