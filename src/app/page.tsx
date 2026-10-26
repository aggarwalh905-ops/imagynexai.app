"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Download, Sparkles, Loader2, Image as ImageIcon, 
  Zap, Maximize, Lock, Unlock, RefreshCw,
  MousePointer2, LayoutGrid, Menu, X, Wand2, Hash,
  History, Sliders, ShieldCheck, Info, AlertCircle, Ban, Copy, Check, Trash2, ChevronDown, UserCheck
} from 'lucide-react';

// --- SUPABASE IMPORT ---
import { createClient } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';

// Initialize Supabase Client for Public Read Access (Realtime feed & URL Sharing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- CUSTOM COMPONENTS ---

const ImagynexLogo = () => (
  <div className="flex items-center gap-2 group cursor-pointer">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 group-hover:opacity-50 transition-all duration-500"></div>
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-500 p-1.5 rounded-xl border border-white/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
        <Sparkles size={18} className="text-white" fill="currentColor" />
      </div>
    </div>
    <span className="font-black text-lg md:text-xl tracking-tighter uppercase italic group-hover:text-white transition-colors duration-300">
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

// Database open function for offline caching
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ImagynexOffline", 1);
    
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains("private_images")) {
        dbInstance.createObjectStore("private_images");
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveImageOffline = async (id: string, blob: Blob): Promise<void> => {
  const db = (await openDB()) as IDBDatabase;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction("private_images", "readwrite");
    const store = tx.objectStore("private_images");
    
    const request = store.put(blob, id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    request.onerror = () => reject(request.error);
  });
};

const getImageOffline = async (id: string): Promise<Blob | null> => {
  const localDB = (await openDB()) as IDBDatabase; 
  
  return new Promise((resolve, reject) => {
    try {
      const tx = localDB.transaction("private_images", "readonly");
      const store = tx.objectStore("private_images");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } catch (err) {
      console.error("Transaction failed", err);
      resolve(null);
    }
  });
};

interface CommunityImage {
  id: string;
  image_url: string;
  prompt: string;
  is_gallery: boolean;
  model: string;
  seed: string;
  [key: string]: any;
}

export type EngineKey = 
  | 'flux-2-dev-free'
  | 'sdxl-lightning-free'
  | 'sana-free'
  | 'flux-schnell' 
  | 'dreamshaper' 
  | 'zimage' 
  | 'flux-klein' 
  | 'recraft-flash' 
  | 'gpt-mini' 
  | 'flux-pro';

export const ENGINE_PREVIEWS: Record<EngineKey, { name: string; desc: string; apiModel: string; priceTag: string }> = {
  'flux-2-dev-free': {
    name: 'FLUX.2 Dev (Free)',
    desc: 'High-fidelity open weights rendering (Community Hosted)',
    apiModel: 'community/scriptsnsenses-sys/flux-2-dev-free',
    priceTag: 'FREE (0 Pollen) ⚡'
  },
  'sdxl-lightning-free': {
    name: 'SDXL Lightning (Free)',
    desc: 'Ultra-fast artistic sketches & realistic photos',
    apiModel: 'community/scriptsnsenses-sys/sdxl-lightning-free',
    priceTag: 'FREE (0 Pollen) ⚡'
  },
  // 1. 100% Free Community Model
  'sana-free': {
    name: 'Sana Sprint',
    desc: 'Ultra-fast open weights image generator (Community)',
    apiModel: 'community/tomdacatto/sana', // Exact Pollinations Path
    priceTag: 'FREE (0 Pollen) ⚡'
  },
  
  'flux-schnell': {
    name: 'FLUX.1 Schnell',
    desc: 'Hyper-realistic & cinematic photorealism',
    apiModel: 'black-forest-labs/flux.1-schnell',
    priceTag: '$0.002 (≈500/$) - Recommended'
  },
  'dreamshaper': {
    name: 'DreamShaper 8',
    desc: 'Instant anime, fantasy & digital art',
    apiModel: 'lykon/dreamshaper-8-lcm',
    priceTag: '$0.0001 (≈10k/$) - Ultra Cheap'
  },
  'zimage': {
    name: 'Z-Image Turbo',
    desc: 'Instant crisp upscaled portraits & renders',
    apiModel: 'tongyi-mai/z-image-turbo',
    priceTag: '$0.004 (≈250/$)'
  },
  'flux-klein': {
    name: 'FLUX.2 Klein 4B',
    desc: 'Next-gen fast engine up to 2.4 MP detail',
    apiModel: 'black-forest-labs/flux.2-klein-4b',
    priceTag: '$0.005 (≈200/$)'
  },
  'recraft-flash': {
    name: 'Recraft V4.1 Flash',
    desc: 'Modern graphics, branding & clean design',
    apiModel: 'recraft/recraft-v4.1-flash',
    priceTag: '$0.007 (≈150/$)'
  },
  'gpt-mini': {
    name: 'GPT Image 1 Mini',
    desc: 'OpenAI intelligence with deep prompt understanding',
    apiModel: 'openai/gpt-image-1-mini',
    priceTag: '≈100/$ - Smart Core'
  },
  'flux-pro': {
    name: 'FLUX 1.1 Pro',
    desc: 'Ultra high-fidelity flagship studio output',
    apiModel: 'black-forest-labs/flux.1.1-pro',
    priceTag: '$0.03 (≈35/$) - Pro Tier'
  }
};

// PKCE Helpers (Native Browser Web Crypto)
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(x => possible[x % possible.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default function AIStudio() {
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState<number | string>(""); 
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState<EngineKey>("flux-schnell");
  const [ratio, setRatio] = useState("1:1");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("Default");
  const [communityImages, setCommunityImages] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("blurry, bad anatomy, low quality, distorted, extra fingers, ugly, low-resolution, out of frame");
  const [isPublic, setIsPublic] = useState(true); 
  const [error, setError] = useState<{message: string, type: string} | null>(null);

  // Pollinations BYOP Variables
  const [pollenToken, setPollenToken] = useState<string | null>(null);
  const APP_KEY = process.env.NEXT_PUBLIC_POLLINATIONS_APP_KEY || "imagynex"; 

  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    const savedUsername = localStorage.getItem('imagynex_username');
    if (savedUsername) setCurrentUsername(savedUsername);
  }, []);

  // 1. Check if model is free
  const isFree = 
    model === 'sana-free' || 
    model === 'flux-2-dev-free' || 
    model === 'sdxl-lightning-free' || 
    model?.startsWith('community/');

  // Realistic Non-Linear Progress Simulation (Stalls at 99%)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loading) {
      setProgress(5);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + Math.floor(Math.random() * 8) + 4; // Fast start: 0 -> 30%
          if (prev < 70) return prev + Math.floor(Math.random() * 4) + 2; // Mid stage: 30 -> 70%
          if (prev < 90) return prev + Math.floor(Math.random() * 2) + 1; // Refining: 70 -> 90%
          if (prev < 99) return prev + 1; // Micro steps up to 99%
          return 99; // STALL: Never reaches 100% until response returns!
        });
      }, 350);
    } else {
      if (progress > 0) {
        setProgress(100);
        const resetTimeout = setTimeout(() => setProgress(0), 600);
        return () => clearTimeout(resetTimeout);
      }
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading]);

  // Double-call prevention for React StrictMode
  const authCodeProcessed = useRef(false);

  // --- OAUTH REDIRECT LOGIC WITH ROBUST PKCE & ACCOUNT SYNC ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (authCode) {
      // Prevent running multiple times on the same auth code
      if (authCodeProcessed.current) return;
      authCodeProcessed.current = true;

      // URL se code ko turant hata dein taaki refresh par purana code repeat na ho
      window.history.replaceState(null, '', window.location.pathname);

      const exchangeToken = async () => {
        try {
          // Exact same clean origin as used in handleLogin (No trailing slash)
          const currentOrigin = window.location.origin.replace(/\/+$/, '');

          // Retrieve verifier from sessionStorage or localStorage fallback
          const verifier = 
            sessionStorage.getItem('pkce_code_verifier') || 
            localStorage.getItem('pkce_code_verifier') || 
            '';

          if (!verifier) {
            throw new Error("PKCE Code Verifier not found. Session expired, please try logging in again.");
          }

          const res = await fetch('https://enter.pollinations.ai/api/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: authCode,
              client_id: APP_KEY,
              redirect_uri: currentOrigin,
              code_verifier: verifier,
            }),
          });

          const data = await res.json();
          const finalToken = data.access_token || data.key || data.token;

          if (finalToken) {
            setPollenToken(finalToken);
            localStorage.setItem('pollen_token', finalToken);

            sessionStorage.removeItem('pkce_code_verifier');
            localStorage.removeItem('pkce_code_verifier');
            sessionStorage.removeItem('oauth_state');

            // --- PERMANENT POLLINATIONS ACCOUNT FETCH ---
            try {
              let permanentUid: string | null = null;
              let username: string | null = null;

              // 1. Pollinations Profile API se permanent identity laayein
              try {
                const profileRes = await fetch('https://enter.pollinations.ai/api/user/profile', {
                  headers: {
                    'Authorization': `Bearer ${finalToken}`
                  }
                });
                
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  // Asli permanent identity: username, email ya sub
                  permanentUid = profileData.username || profileData.id || profileData.email || null;
                  username = profileData.username || profileData.name || null;
                }
              } catch (apiErr) {
                console.warn("Direct profile fetch warning:", apiErr);
              }

              // 2. Agar API se nahi mila toh JWT payload check karein
              if (!permanentUid && typeof finalToken === 'string' && finalToken.includes('.')) {
                const base64Url = finalToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const tokenPayload = JSON.parse(decodeURIComponent(escape(atob(base64))));
                permanentUid = tokenPayload.sub || tokenPayload.username || tokenPayload.email || null;
                username = tokenPayload.username || tokenPayload.name || null;
              }

              // 3. Fallback: Agar kuch na mile tabhi token slice karein
              if (!permanentUid) {
                permanentUid = String(finalToken).slice(0, 16);
              }

              // Format clean unique user ID
              const uniqueUserId = `pol_${permanentUid.toLowerCase().trim()}`;
              localStorage.setItem('imagynex_uid', uniqueUserId);
              setUserId(uniqueUserId);

              // 4. Supabase se purana user profile check karein
              const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', uniqueUserId)
                .maybeSingle();

              if (!existingUser) {
                // Agar sach me pehli baar aaya hai tabhi insert karein
                await supabase.from('users').insert({
                  id: uniqueUserId,
                  display_name: username || `Creator_${uniqueUserId.slice(4, 8)}`,
                  total_likes: 0,
                  monthly_likes: 0,
                  total_creations: 0,
                  liked_images: [],
                  last_active: new Date().toISOString()
                });
              } else {
                // Purana account mil gaya! Active time update karein
                await supabase.from('users').update({
                  last_active: new Date().toISOString()
                }).eq('id', uniqueUserId);
              }

            } catch (syncErr: unknown) {
              console.warn("Account sync warning:", syncErr);
            }

            setToast({ message: "Account Synced & Restored", type: 'success' });
          } else {
            throw new Error(data.error_description || data.error || "Token exchange failed");
          }
        } catch (err: any) {
          console.error("OAuth token exchange error:", err);
          setToast({ message: err.message || "Connection failed. Please try again.", type: 'error' });
        }
      };

      exchangeToken();
    } else {
      const savedToken = localStorage.getItem('pollen_token');
      if (savedToken) setPollenToken(savedToken);
    }
  }, []);

  // 1. Safe Random String Generator
  function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const values = new Uint8Array(length);
      window.crypto.getRandomValues(values);
      for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
    return result;
  }

  // 2. Safe Code Challenge Generator (With Fallback)
  async function generateCodeChallenge(verifier: string): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
    } catch (cryptoErr) {
      console.warn("WebCrypto subtle unavailable, using plain verifier fallback", cryptoErr);
    }
    // Fallback if crypto.subtle is blocked
    return verifier;
  }

  // 3. Bulletproof handleLogin Function
  const handleLogin = async () => {
    try {
      const clientId = process.env.NEXT_PUBLIC_POLLINATIONS_APP_KEY || APP_KEY;
      
      if (!clientId) {
        alert("Configuration Error: Pollinations Client ID / APP_KEY is missing.");
        console.error("APP_KEY is undefined");
        return;
      }

      const currentOrigin = window.location.origin.replace(/\/+$/, '');
      const redirectUri = encodeURIComponent(currentOrigin);

      const verifier = generateRandomString(64);
      const state = generateRandomString(32);

      sessionStorage.setItem('pkce_code_verifier', verifier);
      localStorage.setItem('pkce_code_verifier', verifier);
      sessionStorage.setItem('oauth_state', state);

      const challenge = await generateCodeChallenge(verifier);

      const authUrl = `https://enter.pollinations.ai/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&response_type=code&scope=profile+usage&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&state=${state}`;

      console.log("Redirecting to Pollinations OAuth:", authUrl);
      window.location.assign(authUrl);
    } catch (err) {
      console.error("Failed to initiate Pollinations Vault Login:", err);
      alert("Login Error: Check console for details");
    }
  };

  const handleLogout = () => {
    setPollenToken(null);
    localStorage.removeItem('pollen_token');
    setToast({ message: "Disconnected from Vault", type: 'info' });
  };

  const handleSiteLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      // 1. Account identifiers remove karein
      localStorage.removeItem('imagynex_username');
      localStorage.removeItem('imagynex_uid');
      localStorage.removeItem('pollen_token');

      // 2. State reset karein
      setCurrentUsername(null);
      setUserId('');
      setPollenToken(null);

      // 3. Naya guest ID assign karein
      const guestId = 'u_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('imagynex_uid', guestId);

      setToast({ message: "Logged out successfully", type: 'info' });
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000); 
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  interface HistoryItem {
    id: string;
    url: string;
    isPrivate: boolean;
    prompt?: string;
    publicId?: string | null;
    [key: string]: any; 
  }

  useEffect(() => {
    const loadHistory = async () => {
      const saved = localStorage.getItem('imagynex_history');
      if (!saved) return;

      try {
        const parsedHistory: HistoryItem[] = JSON.parse(saved);
        
        const restoredHistory = await Promise.all(
          parsedHistory.map(async (item: HistoryItem) => {
            if (item.url && item.url.startsWith('http')) {
              return item;
            }
            if (!item.url || item.url.startsWith('blob:')) {
              try {
                const blob = await getImageOffline(item.id);
                if (blob instanceof Blob) {
                  return { 
                    ...item, 
                    url: URL.createObjectURL(blob) 
                  };
                }
              } catch (err) {
                console.error("Offline image not found for:", item.id);
              }
            }
            return item;
          })
        );
        
        setHistory(restoredHistory);
      } catch (err) {
        console.error("Error parsing history:", err);
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  const ProBadge = () => (
    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
      <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400">Pro</span>
    </span>
  );

  const styles = [
    { name: "Default", suffix: "", img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80" },
    { name: "Cinematic", suffix: ", cinematic lighting, 8k, highly detailed, dramatic shadows, anamorphic lens flare", img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" },
    { name: "Anime", suffix: ", anime style, vibrant colors, studio ghibli aesthetic, cel shaded, high quality digital art", img: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=400&q=80" },
    { name: "Cyberpunk", suffix: ", neon lights, futuristic city, synthwave palette, high tech, rainy night street, glowing accents", img: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&q=80" },
    { name: "3D Render", suffix: ", octane render, unreal engine 5, volumetric lighting, ray tracing, ultra-realistic textures, 4k", img: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400&q=80" },
    { name: "Oil Painting", suffix: ", textured canvas, heavy brushstrokes, classical art style, masterpiece, rich pigments", img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" }
  ];

  // --- REPLACED FIREBASE WITH SUPABASE LIVE FEED ---
  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('is_gallery', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error && data) {
        setCommunityImages(data as CommunityImage[]);
      }
    };

    fetchGallery();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('public:generations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'generations', filter: 'is_gallery=eq.true' },
        (payload) => {
          setCommunityImages((prev) => [payload.new as CommunityImage, ...prev].slice(0, 12));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [generatingIdea, setGeneratingIdea] = useState(false);

  const generateRandomIdea = async () => {
    setGeneratingIdea(true);
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'surprise', userToken: pollenToken }),
      });
      const data = await res.json();
      if (data?.result) {
        setPrompt(data.result);
        setToast({ message: "Surprise Prompt Loaded!", type: "success" });
      }
    } catch (err) {
      console.warn("Surprise idea error:", err);
    } finally {
      setGeneratingIdea(false);
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), mode: 'enhance', userToken: pollenToken }),
      });
      const data = await res.json();
      if (data?.result) {
        setPrompt(data.result);
        setToast({ message: "Prompt Enhanced!", type: "success" });
      }
    } catch (err) {
      console.warn("Enhance error:", err);
    } finally {
      setEnhancing(false);
    }
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
      if (!prompt.includes(randomMod)) {
        setPrompt(`${prompt.trim()}, ${randomMod}`);
      }
    }
  };

  const downloadImage = async (imgUrl: string) => {
    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.crossOrigin = "anonymous";
      img.src = imgUrl; 

      img.onload = () => {
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const fontSize = Math.floor(canvas.width * 0.04); 
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom"; 
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; 
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 10;
        
        ctx.fillText("Imagynex.AI", canvas.width - 20, canvas.height - 20);

        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = `Imagynex-${Date.now()}.png`;
        link.click();
        
        setLoading(false);
      };

      img.onerror = () => {
        setLoading(false);
        console.error("Image load failed");
      };

    } catch (err) {
      console.error("Download failed", err);
      setLoading(false);
    }
  };

  // --- REPLACED FIREBASE LOOKUP WITH SUPABASE ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cloudId = params.get('id');
    const sharedPrompt = params.get('prompt');
    const sharedImg = params.get('img');

    if (cloudId) {
      const fetchCloudData = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('generations')
            .select('*')
            .eq('id', cloudId)
            .single();

          if (data && !error) {
            setPrompt(data.prompt);
            setImage(data.image_url);
            setSelectedStyle("Default"); 
            setSeed(data.seed || "");
            setModel((data.model as EngineKey) || "flux");
          }
        } catch (err) { console.error("Cloud fetch error:", err); }
        finally { setLoading(false); }
      };
      fetchCloudData();
    } 
    else if (sharedPrompt) {
      setPrompt(sharedPrompt);
      if (sharedImg) setImage(sharedImg);
      setSeed(params.get('seed') || "");
      setSelectedStyle(params.get('style') || "Default");
    }
  }, []);

  const handleImageSelection = (data: any) => {
    if (!data) return;

    setPrompt(data.prompt || "");

    if (data.negativePrompt !== undefined) {
      setNegativePrompt(data.negativePrompt);
    } else {
      setNegativePrompt("blurry, low quality, low-resolution");
    }

    if (data.seed !== undefined) setSeed(data.seed);
    if (data.ratio) setRatio(data.ratio);
    if (data.model) setModel(data.model);

    const targetUrl = data.image_url || data.imageUrl || data.url;
    setImage(targetUrl || "");
    
    // Canvas Array Sync: Remix image canvas par turant render hogi
    if (targetUrl) {
      setImages([targetUrl]);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  const removeFromHistory = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const itemToDelete = history[index];
    if (!itemToDelete) return;

    const confirmLocal = window.confirm("Remove this from your local history? (It will still remain in the Global Gallery)");
    
    if (confirmLocal) {
      try {
        const updatedHistory = history.filter((_, i) => i !== index);
        setHistory(updatedHistory);
        
        const historyToSave = updatedHistory.map(item => ({
          ...item,
          url: item.url?.startsWith('blob:') ? null : item.url 
        }));
        localStorage.setItem('imagynex_history', JSON.stringify(historyToSave));

        try {
          const localDB = (await openDB()) as IDBDatabase;
          const tx = localDB.transaction("private_images", "readwrite");
          const store = tx.objectStore("private_images");
          const deleteRequest = store.delete(itemToDelete.id);
          deleteRequest.onsuccess = () => console.log("Local binary cleared.");
        } catch (dbErr) {
          console.warn("IndexedDB already empty or access error:", dbErr);
        }

        setToast?.({ message: "Removed from local history", type: 'success' });
      } catch (error) {
        console.error("Removal Error:", error);
        alert("Failed to remove from local history.");
      }
    }
  };

  // --- UPDATED CORE GENERATION FUNCTION (SEQUENTIAL BATCHING) ---
  const generateImage = async (overrideSeed?: number) => {
    if (!prompt.trim()) return;

    setLoading(true);
    setSaveStatus(null);
    setError(null);
    setImages([]);

    // 1. Identity Priority: Look up saved username first
    const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('imagynex_username') : null;
    const activeUsername = (currentUsername || savedUsername || '').trim();

    // If logged in, activeIdentifier is the exact username; otherwise fallback to guest UID
    const activeIdentifier = activeUsername 
      ? activeUsername.toLowerCase() 
      : (userId || localStorage.getItem('imagynex_uid') || `guest_${Math.random().toString(36).substring(2, 9)}`);

    let baseW = 1024, baseH = 1024;
    if (ratio === "16:9") { baseW = 1280; baseH = 720; }
    if (ratio === "9:16") { baseW = 720; baseH = 1280; }

    const w = upscale ? Math.round(baseW * 1.5) : baseW;
    const h = upscale ? Math.round(baseH * 1.5) : baseH;
    const styleSuffix = styles.find(s => s.name === selectedStyle)?.suffix || "";
    const fullPrompt = `${prompt}${styleSuffix}`;

    const isCurrentModelFree = 
      model === 'sana-free' || 
      model === 'flux-2-dev-free' || 
      model === 'sdxl-lightning-free' || 
      model?.startsWith('community/');

    try {
      const results: { url: string; blob: Blob; seed: number; publicId?: string }[] = [];

      const baseSeedNum = (seed && !isNaN(Number(seed)))
        ? Number(seed)
        : Math.floor(Math.random() * 1000000);

      // Only registered users push creations to public gallery
      const isLoggedIn = Boolean(activeUsername);
      const effectiveIsPublic = isLoggedIn ? isPublic : false;

      for (let index = 0; index < batchCount; index++) {
        const individualSeed = (index === 0 && overrideSeed !== undefined)
          ? overrideSeed
          : (baseSeedNum + index);

        if (batchCount > 1) {
          setLoadingMessage(`Synthesizing Reality ${index + 1} of ${batchCount}...`);
        }

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fullPrompt,
            negative: negativePrompt,
            width: w,
            height: h,
            seed: individualSeed.toString(),
            model: model,
            upscale: upscale,
            userToken: isCurrentModelFree ? null : (pollenToken || null),
            userId: activeIdentifier,
            creatorName: activeUsername || 'Anonymous',
            isPublic: effectiveIsPublic,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Engine error on image ${index + 1}`);
        }

        const blobRes = await fetch(data.imageUrl);
        const blob = await blobRes.blob();

        results.push({
          url: data.imageUrl,
          blob: blob,
          seed: individualSeed,
          publicId: data.publicId,
        });

        setImages(results.map(r => r.url));
      }

      setSeed(results[0].seed);
      setLoading(false);

      const newHistoryEntries: any[] = [];

      await Promise.all(results.map(async (res, index) => {
        const entryId = res.publicId || `img_${Date.now()}_${index}`;

        const entry: any = {
          id: entryId,
          url: res.url,
          prompt: fullPrompt,
          seed: res.seed,
          ratio,
          model: model,
          timestamp: Date.now(),
          isPrivate: !effectiveIsPublic,
        };

        try {
          await saveImageOffline(entryId, res.blob);
        } catch (offlineErr) {
          console.error("Offline save failed", offlineErr);
        }

        newHistoryEntries.push(entry);
      }));

      setSaveStatus(effectiveIsPublic ? 'cloud' : 'private');

      const currentFullHistory = [...newHistoryEntries, ...history].slice(0, 14);
      setHistory(currentFullHistory);

      const historyToStore = currentFullHistory.map(item => ({
        ...item,
        url: (item.url && item.url.startsWith('blob:')) ? null : item.url,
      }));

      localStorage.setItem('imagynex_history', JSON.stringify(historyToStore));

      if (!isLoggedIn) {
        setToast({ 
          message: "Rendered in Guest Mode. Sign in to sync creations directly to your username!", 
          type: 'info' 
        });
      } else {
        setToast({ message: `Saved directly to @${activeUsername}'s studio!`, type: 'success' });
      }

    } catch (err: any) {
      setLoading(false);
      setError({
        message: err.message || "Neural engine timeout.",
        type: "server_busy",
      });
    }
  };

  const [loadingMessage, setLoadingMessage] = useState("Fire Neural Core");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (loading) {
      const messages = model === "flux-schnell" 
        ? ["Igniting Flux Core...", "Atmospheric Processing...", "Finalizing Render..."]
        : ["Encoding Architecture...", "Synthesizing Layers...", "Finalizing Detail..."];

      setLoadingMessage(messages[0]);
      let i = 0;
      interval = setInterval(() => {
        setLoadingMessage(messages[i]);
        i = (i + 1) % messages.length;
      }, 2500);
    } else {
      setLoadingMessage("Fire Neural Core");
    }
    return () => { if (interval) clearInterval(interval); };
  }, [loading, model]); 

  const [isSeedLocked, setIsSeedLocked] = useState(false);
  const [upscale, setUpscale] = useState(false);

  const getPromptStrength = () => {
    if (!prompt) return { label: "Empty", color: "text-zinc-600", width: "w-0" };
    const length = prompt.length;
    if (length < 20) return { label: "Weak", color: "text-red-400", width: "w-1/3" };
    if (length < 60) return { label: "Good", color: "text-amber-400", width: "w-2/3" };
    return { label: "Visionary", color: "text-indigo-400", width: "w-full" };
  };

  const strength = getPromptStrength();
  const [images, setImages] = useState<string[]>([]); 
  const [batchCount, setBatchCount] = useState<number>(1);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-indigo-600/50">
      {/* Error Toast Notification */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in fade-in slide-in-from-top-8 duration-500">
          <div className="b g-zinc-900/90 backdrop-blur-2xl border border-red-500/20 p-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-start gap-4">
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
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition cursor-pointer"
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
          <Link href="/" aria-label="Imagynex Home"><ImagynexLogo /></Link>
          
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Link href="/" className="hover:text-white transition">Create</Link>
            <Link href="/gallery" className="text-indigo-400 hover:text-white transition">Gallery</Link>
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>

            {/* Auth / Account Trigger */}
            {currentUsername ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>@{currentUsername}</span>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleSiteLogout}
                  title="Sign Out"
                  className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                Sign In / Register
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-black/95 backdrop-blur-3xl border-b border-white/10 p-8 flex flex-col gap-6 z-[100] animate-in fade-in slide-in-from-top-4">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white">Studio</Link>
            <Link href="/gallery" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-indigo-400">Global Gallery</Link>
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white">About</Link>
            <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white">Contact</Link>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-5 pt-8 md:pt-16 pb-32">
        <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4 md:mb-6 shadow-[0_0_15px_rgba(79,70,229,0.15)]">
            Imagynex Neural Engine v2
          </div>
          <h1 className="text-4xl md:text-8xl font-black leading-tight md:leading-[0.9] tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent italic">
            IMAGINE <br className="hidden md:block" /> ANYTHING.
          </h1>
        </div>

        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          <div className="bg-zinc-900/40 border border-white/10 p-5 md:p-8 rounded-[24px] md:rounded-[48px] backdrop-blur-3xl shadow-2xl space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                Art Style
              </label>
              
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x">
                {styles.map((s) => (
                  <button 
                    key={s.name} 
                    onClick={() => setSelectedStyle(s.name)} 
                    className={`relative flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden transition-all duration-500 snap-center group border-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                      selectedStyle === s.name 
                      ? 'border-indigo-500 scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                      : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img 
                      src={s.img} 
                      alt={s.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                        selectedStyle === s.name ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity ${
                      selectedStyle === s.name ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'
                    }`} />
                    <span className={`absolute bottom-3 left-0 right-0 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${
                      selectedStyle === s.name ? 'text-white' : 'text-zinc-300'
                    }`}>
                      {s.name}
                    </span>
                    {selectedStyle === s.name && (
                      <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 animate-in zoom-in duration-300">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Input Prompt
                </label>
                
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Surprise Me Button */}
                  <button
                    onClick={generateRandomIdea}
                    disabled={generatingIdea}
                    className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-amber-400 uppercase hover:text-amber-300 transition disabled:opacity-30 outline-none rounded cursor-pointer"
                    title="Generate Random Creative Idea"
                  >
                    {generatingIdea ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    <span>{generatingIdea ? "Thinking..." : "Surprise Me"}</span>
                  </button>

                  {/* Auto-Enhance Button */}
                  <button 
                    onClick={enhancePrompt} 
                    disabled={enhancing || !prompt}
                    className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-300 transition disabled:opacity-30 outline-none rounded cursor-pointer"
                  >
                    {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{enhancing ? "Refining..." : "Enhance"}</span>
                  </button>

                  {/* Copy Button */}
                  <button onClick={handleCopy} disabled={!prompt} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white disabled:opacity-20 transition outline-none rounded cursor-pointer">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="relative group/prompt">
                <textarea 
                  className="w-full bg-black/80 border border-white/10 rounded-2xl p-5 pr-16 text-sm md:text-lg outline-none transition-all duration-300 h-32 md:h-28 resize-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:shadow-[0_0_30px_rgba(79,70,229,0.15)] placeholder:text-zinc-700" 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="Describe your wildest imagination..." 
                />
                
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-16 h-[3px] bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full transition-all duration-700 ease-out ${strength.color.replace('text', 'bg')} ${strength.width}`}
                      style={{ boxShadow: `0 0 10px currentColor` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)} 
                  aria-label="Configure Neural Parameters"
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-400 hover:text-indigo-400 transition-colors uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded"
                >
                  <Sliders size={12} className={showAdvanced ? "text-indigo-500" : ""} /> 
                  {showAdvanced ? "Collapse" : "Configure"} Neural Parameters
                </button>

                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${pollenToken ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span 
                    onClick={pollenToken ? handleLogout : undefined}
                    className={`text-[9px] font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded ${pollenToken ? 'text-emerald-400/80 hover:text-emerald-400 cursor-pointer transition-colors' : 'text-zinc-500'}`}
                  >
                    {pollenToken ? 'Vault Active (Click to Disconnect)' : 'Vault Disconnected'}
                  </span>
                </div>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black/40 rounded-[32px] border border-white/5 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 ease-out">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center justify-between px-1">
                      <span className="flex items-center gap-1"><Ban size={10} /> Negative Elements</span>
                      {negativePrompt && (
                        <button 
                          onClick={() => setNegativePrompt("")}
                          className="text-[8px] text-red-400/50 hover:text-red-400 transition-colors uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 rounded"
                        >
                          Clear All
                        </button>
                      )}
                    </label>
                    
                    <input 
                      type="text" 
                      value={negativePrompt} 
                      onChange={(e) => setNegativePrompt(e.target.value)} 
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm outline-none focus:border-red-500/30 transition-all placeholder:text-zinc-800 text-zinc-300" 
                      placeholder="Avoid: blurry, distorted, text..." 
                    />

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["blurry", "low quality", "text", "distorted"].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (!negativePrompt.includes(tag)) {
                              setNegativePrompt(prev => prev ? `${prev}, ${tag}` : tag);
                            }
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[8px] font-bold text-zinc-500 hover:text-white hover:bg-white/10 transition-all uppercase outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center justify-between px-1 tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Hash size={12} className="text-indigo-500" /> 
                          <span>Seed Engine</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {seed && seed !== -1 && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(seed.toString());
                                setToast({ message: "Seed copied to clipboard", type: 'success' });
                              }}
                              className="text-[9px] text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1 group uppercase outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded"
                            >
                              <Copy size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                              Copy
                            </button>
                          )}

                          <button 
                            onClick={() => setIsSeedLocked(!isSeedLocked)}
                            className={`text-[9px] px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 font-black outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                              isSeedLocked 
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                              : 'text-zinc-600 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            {isSeedLocked ? <Lock size={10} /> : <Unlock size={10} />}
                            {isSeedLocked ? 'LOCKED' : 'FIX SEED'}
                          </button>
                        </div>
                      </label>
                      
                      <div className="relative group">
                        <input 
                          type="number" 
                          disabled={isSeedLocked}
                          value={seed} 
                          onChange={(e) => setSeed(e.target.value)} 
                          className={`w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm font-mono outline-none transition-all placeholder:text-zinc-800 ${
                            isSeedLocked 
                            ? 'opacity-40 cursor-not-allowed border-transparent' 
                            : 'focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20'
                          }`} 
                          placeholder="Random (-1)" 
                        />
                        
                        {!isSeedLocked && (
                          <button 
                            onClick={() => {
                              const newSeed = Math.floor(Math.random() * 999999999);
                              setSeed(newSeed);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-indigo-400 hover:bg-white/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                            title="Generate Random Seed"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}

                        {isSeedLocked && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/30">
                            <Lock size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                      isPublic 
                        ? 'bg-indigo-500/5 border-indigo-500/10' 
                        : 'bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_20px_-12px_rgba(16,185,129,0.3)]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-colors duration-300 ${isPublic ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isPublic ? <LayoutGrid size={20} /> : <ShieldCheck size={20} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white tracking-tight">
                            {isPublic ? "Public Synthesis" : "Ghost Mode (Private)"}
                          </span>
                          <p className="text-[10px] text-zinc-400 leading-tight max-w-[180px]">
                            {isPublic 
                              ? "Results published to community gallery" 
                              : "Locally encrypted. No data sent to gallery."}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setIsPublic(!isPublic);
                          setToast({ 
                            message: isPublic ? "Ghost Mode Activated" : "Public Gallery Enabled", 
                            type: 'info' 
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 outline-none ring-offset-black focus:ring-2 focus:ring-indigo-500/50 ${
                          isPublic ? 'bg-indigo-600' : 'bg-zinc-800'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                          isPublic ? 'translate-x-6' : 'translate-x-1'
                        }`}>
                          {!isPublic && <div className="absolute inset-0 flex items-center justify-center"><div className="w-1 h-1 bg-emerald-500 rounded-full" /></div>}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label htmlFor="engine-select" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                      Neural Engine <ProBadge />
                    </label>
                    
                    <button 
                      onClick={() => setUpscale(!upscale)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                        upscale 
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.2)]' 
                        : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-1 h-1 rounded-full ${upscale ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-600'}`} />
                      <span className="text-[8px] font-black tracking-tighter">HD UPSCALE</span>
                    </button>
                  </div>
                  <div className="relative group">
                    <select 
                      id="engine-select" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value as EngineKey)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-white appearance-none cursor-pointer transition-all hover:bg-black/60 font-medium"
                    >
                      {Object.entries(ENGINE_PREVIEWS).map(([key, data]) => (
                        <option key={key} value={key} className="bg-zinc-950 text-white py-2">
                          {data.name} — {data.priceTag}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 px-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          model === 'flux-pro' ? 'bg-purple-500' : 'bg-indigo-500'
                        }`} />
                        <span className="text-zinc-300 text-[11px] truncate">
                          {ENGINE_PREVIEWS[model as EngineKey]?.desc || "Neural Generative Engine Active"}
                        </span>
                      </div>
                    </div>

                    <div className="absolute right-4 top-4 pointer-events-none text-zinc-500 group-hover:text-white transition-colors">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "1:1", w: "w-4", h: "h-4", desc: "Square" },
                      { label: "16:9", w: "w-6", h: "h-3.5", desc: "Cinematic" },
                      { label: "9:16", w: "w-3.5", h: "h-6", desc: "Mobile" }
                    ].map((r) => (
                      <button 
                        key={r.label} 
                        onClick={() => setRatio(r.label)} 
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                          ratio === r.label 
                          ? 'bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.1)]' 
                          : 'bg-black/60 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <div className={`${r.w} ${r.h} border-2 ${ratio === r.label ? 'border-black' : 'border-zinc-600'} rounded-sm mb-1 transition-colors duration-300`} />
                        <span className="text-[10px] font-black">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {[1, 2, 4].map((num) => {
                    // Free models par 4X ko disable rakhein
                    const isRestricted = isFree && num === 4;

                    return (
                      <button
                        key={num}
                        disabled={isRestricted}
                        onClick={() => setBatchCount(num)}
                        className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all outline-none ${
                          isRestricted
                            ? 'opacity-30 cursor-not-allowed border-zinc-900 text-zinc-700'
                            : batchCount === num 
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                              : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700'
                        }`}
                        title={isRestricted ? "Community nodes allow max 2X batch" : ""}
                      >
                        {num}X
                      </button>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const isCurrentModelFree = 
                  model === 'sana-free' || 
                  model === 'flux-2-dev-free' || 
                  model === 'sdxl-lightning-free' || 
                  model?.startsWith('community/');

                const requiresVault = !isCurrentModelFree && !pollenToken;

                return (
                  <div className="space-y-3 w-full relative z-30">
                    {/* Warning prompt when a paid engine is selected without token */}
                    {requiresVault && (
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs animate-in fade-in slide-in-from-top-2 duration-300 relative z-30">
                        <div className="flex items-center gap-2">
                          <UserCheck size={14} className="text-amber-400 shrink-0" />
                          <span className="font-semibold text-[11px] leading-tight">
                            Selected engine requires Pollen credits.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Connect Vault clicked!");
                            handleLogin();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider hover:bg-amber-400 transition cursor-pointer shrink-0 relative z-40"
                        >
                          <span>Connect Vault</span>
                        </button>
                      </div>
                    )}

                    {/* Primary Action Button - Always Clickable for Login */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (requiresVault) {
                          console.log("Main Button: Connecting Vault...");
                          handleLogin();
                          return;
                        }
                        generateImage();
                      }} 
                      // FIX: Agar requiresVault hai toh disabled mat karo taaki user login kar sake
                      disabled={loading || (!requiresVault && !prompt?.trim())} 
                      aria-label={requiresVault ? "Connect Vault" : "Generate Image"}
                      className={`w-full relative group overflow-hidden text-white font-black py-6 rounded-2xl md:rounded-[32px] transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.4)] active:scale-[0.97] uppercase tracking-[0.25em] text-[11px] outline-none cursor-pointer z-20 ${
                        requiresVault
                          ? 'bg-zinc-800 hover:bg-zinc-700 border border-amber-500/30 focus-visible:ring-4 focus-visible:ring-zinc-600 cursor-pointer'
                          : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-500 disabled:cursor-not-allowed shadow-[0_20px_40px_rgba(79,70,229,0.25)] focus-visible:ring-4 focus-visible:ring-indigo-500/50'
                      }`}
                    >
                      {/* Dynamic Background Progress Bar Fill */}
                      {loading && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-indigo-500/80 transition-all duration-300 ease-out z-0"
                          style={{ width: `${progress}%` }}
                        />
                      )}

                      {/* Shimmer Ambient Glow */}
                      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

                      {/* Button Inner Content */}
                      <div className="flex items-center justify-center gap-3 relative z-20 pointer-events-none">
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin text-white shrink-0" size={18} />
                            <span className="font-mono text-indigo-200 text-xs font-black">
                              {progress}%
                            </span>
                            <span className="transition-all duration-300 text-white tracking-widest text-[10px]">
                              {progress < 40 
                                ? "Synthesizing Latent Space..." 
                                : progress < 80 
                                ? "Rendering High-Frequency Details..." 
                                : progress < 99 
                                ? "Refining Chromatic Layers..." 
                                : "Finalizing Render..."}
                            </span>
                          </>
                        ) : requiresVault ? (
                          <>
                            <UserCheck size={20} className="text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                            <span className="transition-all duration-300 text-amber-300 tracking-[0.28em]">
                              CONNECT VAULT TO FIRE
                            </span>
                          </>
                        ) : (
                          <>
                            <Zap size={20} className="group-hover:scale-125 transition-transform duration-300 text-amber-300" fill="currentColor" />
                            <span className="transition-all duration-300 tracking-[0.28em]">
                              {isCurrentModelFree ? "FIRE NEURAL CORE (FREE)" : "FIRE NEURAL CORE"}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })()}
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

            <div id="canvas" className="relative rounded-[24px] md:rounded-[48px] overflow-hidden border border-white/5 bg-zinc-900/30 min-h-[400px] flex items-center justify-center group shadow-2xl transition-all p-4 md:p-8">
              
              {images.length > 0 ? (
                <div className="w-full h-full flex flex-col gap-6">
                  <div className={`grid gap-4 w-full h-full ${
                    images.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 
                    images.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                    'grid-cols-2 lg:grid-cols-2'
                  }`}>
                    {images.map((imgUrl, index) => (
                      <div key={index} className="relative group/card rounded-2xl overflow-hidden bg-black/40 border border-white/5 aspect-square shadow-xl transition-all duration-500 hover:border-indigo-500/30 hover:shadow-[0_0_30px_rgba(79,70,229,0.15)]">
                        <img 
                          src={imgUrl} 
                          loading="eager"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/1024x1024/09090b/4f46e5?text=Signal+Lost";
                          }}
                          className={`w-full h-full object-cover transition-all duration-700 ${
                            loading ? 'blur-2xl scale-95 opacity-50' : 'blur-0 scale-100 opacity-100'
                          }`} 
                          alt={`Neural Result ${index + 1}`} 
                        />
                        
                        {!loading && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4 backdrop-blur-[2px]">
                            <button 
                              onClick={() => downloadImage(imgUrl)}
                              className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform duration-300 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                              title="Download this variant"
                            >
                              <Download size={20}/>
                            </button>
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">Variant {index + 1}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!loading && (
                    <div className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <button 
                        onClick={() => generateImage(Math.floor(Math.random()*999999))} 
                        className="bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 hover:scale-105 transition-all duration-300 shadow-2xl backdrop-blur-md uppercase outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                      >
                        <RefreshCw size={14}/> Re-Generate Batch
                      </button>

                      <button 
                        onClick={() => { setImages([]); setSeed(""); }} 
                        className="bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/10 px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all duration-300 uppercase outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                      >
                        <Trash2 size={14}/> Reset Studio
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-10 relative overflow-hidden w-full h-[500px] flex items-center justify-center">
                  <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:40px_40px]" />
                  
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/10 animate-pulse transition-all duration-700">
                      <ImageIcon size={32} className="text-indigo-500/40" />
                    </div>
                    <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px]">
                      Awaiting Neural Input
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl z-[35] animate-in fade-in duration-500">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-[shimmer_2s_infinite]" />
                  
                  <VisionaryLoader />
                  
                  <div className="mt-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse">
                      {loadingMessage}
                    </p>
                    <p className="text-[8px] text-zinc-600 uppercase mt-2 font-bold tracking-widest">
                      {batchCount > 1 ? `Synthesizing ${batchCount} Parallel Realities...` : 'Partitioning Latent Space...'}
                    </p>
                  </div>
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
              
              <button 
                onClick={async () => {
                  if(window.confirm("Delete all history and offline backups?")) {
                    setHistory([]); 
                    localStorage.removeItem('imagynex_history');
                    const localDB = await openDB();
                    localDB.transaction("private_images", "readwrite").objectStore("private_images").clear();
                  }
                }} 
                className="text-[10px] font-black text-zinc-400 hover:text-red-400 transition-colors uppercase outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 rounded px-2"
              >
                Clear Vault
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
              {history.map((item, idx) => (
                <div 
                  key={item.id || idx} 
                  onClick={() => handleImageSelection(item)} 
                  className="aspect-square rounded-xl md:rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-indigo-500 transition-all duration-300 group relative bg-zinc-900 focus-within:ring-2 focus-within:ring-indigo-500/50"
                  tabIndex={0}
                >
                  <img 
                    src={item.url} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    alt="AI Generated" 
                    loading="lazy"
                  />

                  {item.isPrivate && (
                    <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md p-1 rounded-md border border-white/10 shadow-lg text-indigo-400">
                      <ShieldCheck size={12} />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-2 text-center backdrop-blur-[2px]">
                    <p className="text-[7px] text-zinc-200 font-bold uppercase tracking-tighter line-clamp-3 px-1">
                      {item.prompt}
                    </p>
                    
                    <div className="flex gap-2 mt-1">
                      <div className="bg-indigo-600/80 p-1.5 rounded-lg text-white shadow-lg">
                        <Maximize size={10} />
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          removeFromHistory(e, idx);
                        }} 
                        className="bg-red-600/80 p-1.5 rounded-lg text-white hover:bg-red-500 transition-colors shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <Trash2 size={10} />
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
                <p className="text-zinc-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Real-time syntheses from the cloud</p>
              </div>
              
              <Link href="/gallery" className="hidden md:block text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded px-2">
                View Full Archive →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {communityImages.map((data, i) => (
                <div 
                  key={data.id || i} 
                  className="aspect-[4/5] rounded-[24px] md:rounded-[32px] overflow-hidden border border-white/5 relative group hover:border-indigo-500/50 transition-all duration-500 cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500/50" 
                  onClick={() => handleImageSelection(data)}
                  tabIndex={0}
                >
                  <img 
                    src={data.image_url || data.url} 
                    loading="lazy" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt="Feed" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
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

            <div className="mt-8 text-center md:hidden">
              <Link href="/gallery" className="inline-block bg-white/5 border border-white/10 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 transition-colors">
                Explore Global Gallery
              </Link>
            </div>
          </section>
        </div>

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
                <Link href="/gallery" className="ml-auto bg-red-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-red-400 transition-colors">
                  Gallery
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-black/60 border-t border-white/5 pt-16 md:pt-20 pb-44 px-5 text-center">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="bg-zinc-900/80 border border-dashed border-white/10 rounded-[32px] p-8 md:p-12 text-zinc-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] hover:border-white/20 transition-colors duration-500 cursor-default">
            Imagynex AI Neural Creative Suite
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
            <div className="md:col-span-2">
              <ImagynexLogo />
              <p className="text-zinc-400 text-xs leading-relaxed mt-4 max-w-xs">
                Pioneering the intersection of human creativity and machine intelligence.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Platform</h4>
              <ul className="text-zinc-400 text-[10px] space-y-3 font-bold uppercase tracking-wider">
                  <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors py-2 inline-block">Privacy</Link></li>
                  <li><Link href="/about" className="hover:text-indigo-400 transition-colors py-2 inline-block">About</Link></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Connect</h4>
              <ul className="text-zinc-400 text-[10px] space-y-3 font-bold uppercase tracking-wider">
                  <li><Link href="https://github.com/aggarwalh905-ops" className="hover:text-indigo-400 transition-colors py-2 inline-block">GitHub</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-10 shadow-2xl z-50 transition-all border-b-indigo-500/50">
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-zinc-400 hover:text-white transition-colors"><MousePointer2 size={20} /></button>
        <button onClick={() => generateImage()} className="text-indigo-500 scale-125 hover:scale-[1.4] transition-transform"><Zap size={24} fill="currentColor" /></button>
        <button onClick={() => { const el = document.getElementById('canvas'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }} className="text-zinc-400 hover:text-white transition-colors"><LayoutGrid size={20} /></button>
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
            <span className="text-[8px] font-bold uppercase tracking-tight text-zinc-400">Image Saved & Link Copied</span>
          </div>
        </div>
      </div>
    )}

    {/* Permanent Account Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUsername(user.username);
          setUserId(user.id);
          if (user.pollenToken) setPollenToken(user.pollenToken);
          setToast({ message: `Authenticated as @${user.username}`, type: 'success' });
        }}
      />
    </div>
  );
}
