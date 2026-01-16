"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, Sparkles, Loader2, Image as ImageIcon, 
  Zap, Maximize, Lock, Unlock, RefreshCw,
  MousePointer2, LayoutGrid, Menu, X, Wand2, Hash,
  History, Sliders, ShieldCheck, Info, AlertCircle, Ban, Copy, Check, Trash2, ChevronDown
} from 'lucide-react';

import { getAuth } from "firebase/auth";
import { signInAnonymously } from "firebase/auth";

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
  getDoc, 
  setDoc, 
  increment,
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

// Database open karne ka function
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

// Image save karne ka function (TypeScript Fixed)
const saveImageOffline = async (id: string, blob: Blob): Promise<void> => {
  const db = (await openDB()) as IDBDatabase;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction("private_images", "readwrite");
    const store = tx.objectStore("private_images");
    
    const request = store.put(blob, id);

    tx.oncomplete = () => {
      console.log("Image saved offline successfully");
      resolve();
    };

    tx.onerror = () => {
      console.error("Transaction error:", tx.error);
      reject(tx.error);
    };

    request.onerror = () => {
      console.error("Request error:", request.error);
      reject(request.error);
    };
  });
};

// Image retrieve karne ka function (Fixed)
const getImageOffline = async (id: string): Promise<Blob | null> => {
  const localDB = (await openDB()) as IDBDatabase; // variable name changed to localDB
  
  return new Promise((resolve, reject) => {
    try {
      const tx = localDB.transaction("private_images", "readonly");
      const store = tx.objectStore("private_images");
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error("Error fetching from IndexedDB", request.error);
        reject(request.error);
      };
    } catch (err) {
      console.error("Transaction failed", err);
      resolve(null);
    }
  });
};

interface CommunityImage {
  id: string;
  imageUrl: string;
  prompt: string;
  isPrivate?: boolean; 
  creatorName?: string;
  createdAt?: any;
  [key: string]: any;
}

// Define the type for the engine keys
type EngineKey = 'zimage' | 'flux' | 'turbo';

const ENGINE_PREVIEWS: Record<EngineKey, { name: string; desc: string; color: string }> = {
  zimage: { name: "Z-Image", desc: "Balanced & Versatile", color: "text-blue-400" },
  flux: { name: "Flux Schnell", desc: "Hyper-Realistic & Cinematic", color: "text-purple-400" },
  turbo: { name: "SDXL Turbo", desc: "Fast & Artistic Sketches", color: "text-amber-400" }
};

export default function AIStudio() {
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState<number | string>(""); 
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState<EngineKey>("flux");
  const [ratio, setRatio] = useState("1:1");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("Default");
  const [communityImages, setCommunityImages] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("blurry, bad anatomy, low quality, distorted, extra fingers, ugly, low-resolution, out of frame");
  const [isPublic, setIsPublic] = useState(true); // Default to public
  
  const [error, setError] = useState<{message: string, type: string} | null>(null);

  // Error auto-hide karne ke liye useEffect
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000); // 8 seconds baad gayab ho jayega
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  // 1. Interface define karein (ise component ke bahar ya upar rakh sakte hain)
  interface HistoryItem {
    id: string;
    url: string;
    isPrivate: boolean;
    prompt?: string;
    firestoreId?: string | null;
    [key: string]: any; 
  }

  // ... component ke andar ...

  useEffect(() => {
    const loadHistory = async () => {
      const saved = localStorage.getItem('imagynex_history');
      if (!saved) return;

      try {
        const parsedHistory: HistoryItem[] = JSON.parse(saved);
        
        const restoredHistory = await Promise.all(
          parsedHistory.map(async (item: HistoryItem) => {
            // Case 1: Agar URL pehle se ek permanent link (http) hai, toh kuch na karein
            if (item.url && item.url.startsWith('http')) {
              return item;
            }

            // Case 2: Agar URL missing hai ya blob error tha, toh IndexedDB se fetch karein
            if (!item.url || item.url.startsWith('blob:')) {
              try {
                const blob = await getImageOffline(item.id);
                if (blob instanceof Blob) {
                  return { 
                    ...item, 
                    url: URL.createObjectURL(blob) // Naya temporary link banayenge session ke liye
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
    { 
      name: "Default", 
      suffix: "", 
      img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80" 
    },
    { 
      name: "Cinematic", 
      suffix: ", cinematic lighting, 8k, highly detailed, dramatic shadows, anamorphic lens flare", 
      img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" 
    },
    { 
      name: "Anime", 
      suffix: ", anime style, vibrant colors, studio ghibli aesthetic, cel shaded, high quality digital art", 
      img: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=400&q=80" 
    },
    { 
      name: "Cyberpunk", 
      suffix: ", neon lights, futuristic city, synthwave palette, high tech, rainy night street, glowing accents", 
      img: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&q=80" 
    },
    { 
      name: "3D Render", 
      suffix: ", octane render, unreal engine 5, volumetric lighting, ray tracing, ultra-realistic textures, 4k", 
      img: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400&q=80" 
    },
    { 
      name: "Oil Painting", 
      suffix: ", textured canvas, heavy brushstrokes, classical art style, masterpiece, rich pigments", 
      img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" 
    }
  ];

  // --- IS CODE KO UPDATE KAREIN ---
  useEffect(() => {
    // Simple query: Sirf latest images fetch karein
    const q = query(
      collection(db, "gallery"), 
      orderBy("createdAt", "desc"), 
      limit(40) // Zyada fetch karein taaki filter ke baad bhi 12-15 images bachen
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as CommunityImage[];
      
      // Filter Logic:
      // 1. Agar isPrivate 'false' hai (Public Image)
      // 2. Agar isPrivate field hi nahi hai (Purani Images)
      const filteredDocs = docs.filter(img => 
        img.isPrivate === false || 
        img.isPrivate === undefined || 
        img.isPrivate === null
      );

      // Filtered data ko state mein set karein (Sirf top 12)
      setCommunityImages(filteredDocs.slice(0, 12));
    }, (err) => {
      console.error("Feed Snapshot Error:", err);
    });

    return () => unsubscribe();
  }, []);

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enhancePrompt = async () => {
    if (!prompt) return;
    setEnhancing(true);

    try {
      const systemInstruction = "Master AI Artist. Rewrite the user prompt into a high-detail cinematic masterpiece. Add specific lighting (e.g. volumetric, 8k), camera lens (e.g. 35mm), and textures. Keep it under 60 words. Return ONLY the prompt.";

      const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY}`
        },
        body: JSON.stringify({
          // Model set to Amazon Nova Micro
          model: "nova-fast", 
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          // Ensuring we don't get conversational filler
          temperature: 0.7 
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extracting the text from the OpenAI-compatible JSON structure
      let enhancedText = data.choices[0].message.content;

      // Cleaning: Remove quotes or "Prompt:" if the AI included them
      enhancedText = enhancedText.replace(/^(Prompt:|Improved Prompt:|")|"$|^\s+|\s+$/g, '');

      setPrompt(enhancedText.trim());

    } catch (error) {
      console.error("Enhancement failed:", error);
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
      // Check taaki baar-baar same cheez add na ho
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

        // --- Standardized Watermark Logic ---
        const fontSize = Math.floor(canvas.width * 0.04); // Changed to 0.04 for consistency
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom"; // Added for precise corner alignment
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Matches 0.5 opacity
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 10;
        
        // Matches "Imagynex.AI" casing and 20px padding
        ctx.fillText("Imagynex.AI", canvas.width - 20, canvas.height - 20);

        // --- Instant Trigger ---
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

    // Step 1: Target item ko pehchanen
    const itemToDelete = history[index];
    if (!itemToDelete) return;

    // Step 2: Confirm removal from local history only
    const confirmLocal = window.confirm("Remove this from your local history? (It will still remain in the Global Gallery)");
    
    if (confirmLocal) {
      try {
        // --- 1. LOCAL STATE & LOCALSTORAGE CLEANUP ---
        // Humne sirf local list se filter kiya hai
        const updatedHistory = history.filter((_, i) => i !== index);
        setHistory(updatedHistory);
        
        // LocalStorage ko update karein (Filtered version save karein)
        const historyToSave = updatedHistory.map(item => ({
          ...item,
          url: item.url?.startsWith('blob:') ? null : item.url 
        }));
        localStorage.setItem('imagynex_history', JSON.stringify(historyToSave));

        // --- 2. INDEXEDDB CLEANUP (OFFLINE BINARY) ---
        // Agar image private storage mein hai, toh binary file bhi delete karein
        try {
          const localDB = (await openDB()) as IDBDatabase;
          const tx = localDB.transaction("private_images", "readwrite");
          const store = tx.objectStore("private_images");
          
          // Original ID use karke IndexedDB se delete karein
          const deleteRequest = store.delete(itemToDelete.id);
          
          deleteRequest.onsuccess = () => console.log("Local binary cleared.");
        } catch (dbErr) {
          console.warn("IndexedDB already empty or access error:", dbErr);
        }

        // Success Toast (Database ka zikr nahi hoga)
        setToast?.({ message: "Removed from local history", type: 'success' });

      } catch (error) {
        console.error("Removal Error:", error);
        alert("Failed to remove from local history.");
      }
    }
  };

  // --- SEARCH FOR generateImage FUNCTION IN YOUR CODE AND UPDATE IT ---

  const generateImage = async (overrideSeed?: number) => {
    if (!prompt) return;

    setLoading(true);
    setSaveStatus(null);
    setError(null);
    setImages([]); 

    const auth = getAuth();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    // 1. UID & Profile Handling
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

    // 2. Dimensions & Style
    let baseW = 1024, baseH = 1024;
    if (ratio === "16:9") { baseW = 1280; baseH = 720; }
    if (ratio === "9:16") { baseW = 720; baseH = 1280; }

    const w = upscale ? Math.round(baseW * 1.5) : baseW;
    const h = upscale ? Math.round(baseH * 1.5) : baseH;
    const styleSuffix = styles.find(s => s.name === selectedStyle)?.suffix || "";
    const fullPrompt = `${prompt}${styleSuffix}`;

    try {
      // 3. BATCH EXECUTION (Generation)
      const batchArray = Array.from({ length: batchCount });
      const results = await Promise.all(batchArray.map(async (_, index) => {
        const individualSeed = (index === 0 && overrideSeed !== undefined) 
          ? overrideSeed 
          : Math.floor(Math.random() * 1000000);

        const proxyUrl = `/api/generate?prompt=${encodeURIComponent(fullPrompt)}&negative_prompt=${encodeURIComponent(negativePrompt || "")}&width=${w}&height=${h}&model=${model}&seed=${individualSeed}&nologo=true&enhance=true&feed=true&upscale=${upscale}&t=${Date.now()}_${index}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Engine Error");

        const blob = await response.blob();
        if (blob.size < 50000) throw new Error("Image generation failed.");

        return {
          url: URL.createObjectURL(blob),
          blob: blob,
          seed: individualSeed,
          proxyUrl: proxyUrl
        };
      }));

      setImages(results.map(r => r.url)); 
      setSeed(results[0].seed);
      setLoading(false);

      // 4. --- SAVE ALL TO FIREBASE & LOCAL HISTORY ---
      const newHistoryEntries: any[] = [];

      await Promise.all(results.map(async (res, index) => {
        const entryId = `img_${Date.now()}_${index}`;
        
        let entry: any = {
          id: entryId, 
          url: res.url,
          prompt: fullPrompt,
          seed: res.seed,
          ratio,
          model: model,
          timestamp: Date.now(),
          firestoreId: null,
          isPrivate: !isPublic 
        };

        try {
          // Save to Firestore
          const docRef = await addDoc(collection(db, "gallery"), {
            imageUrl: res.proxyUrl, 
            prompt: fullPrompt,
            style: selectedStyle,
            seed: res.seed,
            ratio: ratio,
            model: model,
            createdAt: serverTimestamp(),
            creatorId: storedUid,
            creatorName: currentDisplayName,
            likesCount: 0,
            likedBy: [],
            isPrivate: !isPublic 
          });

          if (docRef?.id) entry.firestoreId = docRef.id;

          // Save to IndexedDB (Offline)
          try {
            await saveImageOffline(entryId, res.blob);
          } catch (offlineErr) {
            console.error("Offline save failed for index", index, offlineErr);
          }

        } catch (dbErr) {
          console.error("Firestore save failed for index", index, dbErr);
          entry.firestoreId = "not_saved";
        }

        newHistoryEntries.push(entry);
      }));

      // 5. UPDATE USER STATS (Increment by batchCount)
      try {
        const userRef = doc(db, "users", storedUid);
        await setDoc(userRef, {
          totalCreations: increment(batchCount),
          displayName: currentDisplayName,
          lastActive: serverTimestamp(),
        }, { merge: true });
        setSaveStatus(isPublic ? 'cloud' : 'private');
      } catch (userErr) {
        console.error("User stats update failed", userErr);
      }

      // 6. FINAL HISTORY SYNC (Add all new items to the top)
      const currentFullHistory = [...newHistoryEntries, ...history].slice(0, 20);
      setHistory(currentFullHistory);

      const historyToStore = currentFullHistory.map(item => ({
        ...item,
        url: (item.url && item.url.startsWith('blob:')) ? null : item.url 
      }));

      localStorage.setItem('imagynex_history', JSON.stringify(historyToStore));

    } catch (err: any) {
      setLoading(false);
      setError({
        message: err.message || "Neural engine timeout.",
        type: "server_busy"
      });
    }
  };

  const [loadingMessage, setLoadingMessage] = useState("Fire Neural Core");

  useEffect(() => {
    let interval = null;
    if (loading) {
      const messages = model === "flux" 
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
  }, [loading, model]); // Model add karne se message badal jayenge

  const [isSeedLocked, setIsSeedLocked] = useState(false);

  const [upscale, setUpscale] = useState(false);

  // Logic to calculate prompt strength
  const getPromptStrength = () => {
    if (!prompt) return { label: "Empty", color: "text-zinc-600", width: "w-0" };
    const length = prompt.length;
    if (length < 20) return { label: "Weak", color: "text-red-400", width: "w-1/3" };
    if (length < 60) return { label: "Good", color: "text-amber-400", width: "w-2/3" };
    return { label: "Visionary", color: "text-indigo-400", width: "w-full" };
  };

  const strength = getPromptStrength();

  // This tells TypeScript: "This is an array of strings"
  const [images, setImages] = useState<string[]>([]); 
  const [batchCount, setBatchCount] = useState<number>(1);

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
          
          {/* Desktop Menu - text-zinc-400 used for better contrast than 500 */}
          <div className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Link href="/" className="hover:text-white transition">Create</Link>
            <Link href="/gallery" className="text-indigo-400 hover:text-white transition">Gallery</Link>
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>

          {/* Added aria-label for accessibility */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
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
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                Art Style
              </label>
              
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x">
                {styles.map((s) => (
                  <button 
                    key={s.name} 
                    onClick={() => setSelectedStyle(s.name)} 
                    className={`relative flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden transition-all duration-500 snap-center group border-2 ${
                      selectedStyle === s.name 
                      ? 'border-indigo-500 scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                      : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Background Preview Image */}
                    <img 
                      src={s.img} 
                      alt={s.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                        selectedStyle === s.name ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity ${
                      selectedStyle === s.name ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'
                    }`} />

                    {/* Style Name */}
                    <span className={`absolute bottom-3 left-0 right-0 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${
                      selectedStyle === s.name ? 'text-white' : 'text-zinc-300'
                    }`}>
                      {s.name}
                    </span>

                    {/* Selection Checkmark (Optional visual) */}
                    {selectedStyle === s.name && (
                      <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 animate-in zoom-in">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Input Prompt</label>
                
                <div className="flex gap-3 md:gap-4">
                  <button 
                    onClick={enhancePrompt} 
                    disabled={enhancing || !prompt}
                    className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-300 transition disabled:opacity-30"
                  >
                    {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span className="hidden xs:inline">{enhancing ? "Refining..." : "Enhance"}</span>
                  </button>

                  <button onClick={handleCopy} disabled={!prompt} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white disabled:opacity-20 transition">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    <span className="hidden xs:inline">{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* --- START OF UPDATE: Relative wrapper for Strength Meter --- */}
              <div className="relative group/prompt">
                <textarea 
                  className="w-full bg-black/80 border border-white/10 rounded-2xl p-5 pr-16 text-sm md:text-lg outline-none transition-all h-32 md:h-28 resize-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:shadow-[0_0_30px_rgba(79,70,229,0.15)] placeholder:text-zinc-700" 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="Describe your wildest imagination..." 
                />
                
                {/* Strength Meter UI */}
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
              {/* --- END OF UPDATE --- */}
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                aria-label="Configure Neural Parameters"
                className="flex items-center gap-2 text-[10px] font-black text-zinc-400 hover:text-indigo-400 transition-colors uppercase tracking-widest px-1"
              >
                <Sliders size={12} className={showAdvanced ? "text-indigo-500" : ""} /> 
                {showAdvanced ? "Collapse" : "Configure"} Neural Parameters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black/40 rounded-[32px] border border-white/5 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 ease-out">
                  
                  {/* 1. Negative Prompt */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center justify-between px-1">
                      <span className="flex items-center gap-1"><Ban size={10} /> Negative Elements</span>
                      {negativePrompt && (
                        <button 
                          onClick={() => setNegativePrompt("")}
                          className="text-[8px] text-red-400/50 hover:text-red-400 transition-colors uppercase tracking-widest"
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

                    {/* Quick Action Negative Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["blurry", "low quality", "text", "distorted"].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (!negativePrompt.includes(tag)) {
                              setNegativePrompt(prev => prev ? `${prev}, ${tag}` : tag);
                            }
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[8px] font-bold text-zinc-500 hover:text-white hover:bg-white/10 transition-all uppercase"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Advanced Controls: Seed & Privacy */}
                  <div className="space-y-4">
                    {/* Seed Control */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center justify-between px-1 tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Hash size={12} className="text-indigo-500" /> 
                          <span>Seed Engine</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* 1. Copy Seed Button (Only shows if seed exists) */}
                          {seed && seed !== -1 && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(seed.toString());
                                setToast({ message: "Seed copied to clipboard", type: 'success' });
                              }}
                              className="text-[9px] text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1 group uppercase"
                            >
                              <Copy size={10} className="opacity-50 group-hover:opacity-100" />
                              Copy
                            </button>
                          )}

                          {/* 2. Lock Toggle (New Feature) */}
                          <button 
                            onClick={() => setIsSeedLocked(!isSeedLocked)}
                            className={`text-[9px] px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 font-black ${
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
                        
                        {/* 3. Randomize Button (Hidden if locked) */}
                        {!isSeedLocked && (
                          <button 
                            onClick={() => {
                              const newSeed = Math.floor(Math.random() * 999999999);
                              setSeed(newSeed);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-indigo-400 hover:bg-white/10 transition-all"
                            title="Generate Random Seed"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}

                        {/* Locked Overlay Indicator */}
                        {isSeedLocked && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/30">
                            <Lock size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Privacy Engine Toggle */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                      isPublic 
                        ? 'bg-indigo-500/5 border-indigo-500/10' 
                        : 'bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_20px_-12px_rgba(16,185,129,0.3)]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isPublic ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
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

              {/* Flex Container for Engine and Ratio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* --- Neural Engine Section --- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label htmlFor="engine-select" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                      Neural Engine <ProBadge />
                    </label>
                    
                    {/* NEW HD TOGGLE */}
                    <button 
                      onClick={() => setUpscale(!upscale)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all duration-300 ${
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
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-indigo-500/50 text-white appearance-none cursor-pointer transition-all hover:bg-black/60"
                    >
                      <option value="zimage">Z-IMAGE (Standard)</option>
                      <option value="flux">FLUX SCHNELL (Pro)</option>
                      <option value="turbo">SDXL TURBO (Fast)</option>
                    </select>
                    
                    {/* Dynamic Status Label below dropdown */}
                    <div className="mt-2 px-1 flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${model === 'flux' ? 'bg-purple-500' : 'bg-indigo-500'}`} />
                      <span className="text-zinc-300">
                        {/* The "as EngineKey" tells TypeScript: "Don't worry, I know this string is a valid key" */}
                        {ENGINE_PREVIEWS[model as EngineKey]?.desc || "Initializing Engine..."}
                      </span>
                    </div>
                    
                    <div className="absolute right-4 top-4 pointer-events-none text-zinc-500">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* 4. Canvas Ratio with Visual Previews */}
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
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                          ratio === r.label 
                          ? 'bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.1)]' 
                          : 'bg-black/60 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {/* Visual Box Preview */}
                        <div className={`${r.w} ${r.h} border-2 ${ratio === r.label ? 'border-black' : 'border-zinc-600'} rounded-sm mb-1`} />
                        <span className="text-[10px] font-black">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Batch Size</label>
                  <div className="flex gap-2">
                    {[1, 2, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setBatchCount(num)}
                        className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                          batchCount === num 
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                          : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700'
                        }`}
                      >
                        {num}X
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => generateImage()} 
                disabled={loading || !prompt?.trim()} 
                aria-label="Generate Image"
                className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-black py-6 rounded-2xl md:rounded-[32px] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(79,70,229,0.2)] active:scale-[0.97] uppercase tracking-[0.25em] text-[11px]"
              >
                {/* Shimmer Effect Layer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Content */}
                <div className="flex items-center justify-center gap-3 relative z-10">
                  {loading ? (
                    <Loader2 className="animate-spin text-white" size={20} />
                  ) : (
                    <Zap size={20} className="group-hover:scale-125 transition-transform" fill="currentColor" />
                  )}
                  
                  {/* Dynamic Loading Message from your useEffect */}
                  <span className="transition-all duration-300">
                    {loadingMessage}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {/* Save Status Header */}
            <div className="flex justify-end h-6">
              {saveStatus && (
                <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-in fade-in zoom-in duration-300 ${saveStatus === 'cloud' ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                  {saveStatus === 'cloud' ? '● Cloud Synced' : '● Local Vault Only'}
                </div>
              )}
            </div>

            {/* Main Canvas / Image Display */}
            <div id="canvas" className="relative rounded-[24px] md:rounded-[48px] overflow-hidden border border-white/5 bg-zinc-900/30 min-h-[400px] flex items-center justify-center group shadow-2xl transition-all p-4 md:p-8">
              
              {/* Images Grid State */}
              {images.length > 0 ? (
                <div className="w-full h-full flex flex-col gap-6">
                  {/* Dynamic Grid: 1 image = full, 2 = side-by-side, 4 = 2x2 */}
                  <div className={`grid gap-4 w-full h-full ${
                    images.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 
                    images.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                    'grid-cols-2 lg:grid-cols-2'
                  }`}>
                    {images.map((imgUrl, index) => (
                      <div key={index} className="relative group/card rounded-2xl overflow-hidden bg-black/40 border border-white/5 aspect-square shadow-xl transition-all hover:border-indigo-500/30">
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
                        
                        {/* Hover Actions for Individual Image */}
                        {!loading && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all flex flex-col items-center justify-center gap-3 p-4">
                            <button 
                              onClick={() => downloadImage(imgUrl)}
                              className="p-3 bg-white text-black rounded-full hover:scale-110 transition shadow-xl"
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

                  {/* Global Action Bar (Bottom of grid) */}
                  {!loading && (
                    <div className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <button 
                        onClick={() => generateImage(Math.floor(Math.random()*999999))} 
                        className="bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 hover:scale-105 transition shadow-2xl backdrop-blur-md uppercase"
                      >
                        <RefreshCw size={14}/> Re-Generate Batch
                      </button>

                      <button 
                        onClick={() => { setImages([]); setSeed(""); }} 
                        className="bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/10 px-8 py-4 rounded-full font-black text-[10px] tracking-widest flex items-center justify-center gap-2 transition uppercase"
                      >
                        <Trash2 size={14}/> Reset Studio
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Awaiting Input State (Default) */
                <div className="text-center p-10 relative overflow-hidden w-full h-[500px] flex items-center justify-center">
                  <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:40px_40px]" />
                  
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/10 animate-pulse">
                      <ImageIcon size={32} className="text-indigo-500/40" />
                    </div>
                    <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px]">
                      Awaiting Neural Input
                    </p>
                  </div>
                </div>
              )}

              {/* High-Z-Index Visionary Loader Overlay */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl z-[35] animate-in fade-in duration-500">
                  {/* The Laser Scan Line */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-neural-scan" />
                  
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
              
              {/* Updated Clear Vault Button */}
              <button 
                onClick={async () => {
                  if(window.confirm("Delete all history and offline backups?")) {
                    setHistory([]); 
                    localStorage.removeItem('imagynex_history');
                    // IndexedDB ko pura clear karne ke liye
                    const localDB = await openDB();
                    localDB.transaction("private_images", "readwrite").objectStore("private_images").clear();
                  }
                }} 
                className="text-[10px] font-black text-zinc-400 hover:text-red-400 transition uppercase"
              >
                Clear Vault
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
              {history.map((item, idx) => (
                <div 
                  key={item.id || idx} // Use item.id if available
                  onClick={() => handleImageSelection(item)} 
                  className="aspect-square rounded-xl md:rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-indigo-500 transition group relative bg-zinc-900"
                >
                  {/* Main Image */}
                  <img 
                    src={item.url} 
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                    alt="AI Generated" 
                    loading="lazy"
                  />

                  {/* 1. NEW: Private Mode Indicator (Top Left) */}
                  {item.isPrivate && (
                    <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md p-1 rounded-md border border-white/10 shadow-lg text-indigo-400">
                      <ShieldCheck size={12} />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-2 text-center backdrop-blur-[2px]">
                    <p className="text-[7px] text-zinc-200 font-bold uppercase tracking-tighter line-clamp-3 px-1">
                      {item.prompt}
                    </p>
                    
                    <div className="flex gap-2 mt-1">
                      {/* Maximize Icon */}
                      <div className="bg-indigo-600/80 p-1.5 rounded-lg text-white shadow-lg">
                        <Maximize size={10} />
                      </div>
                      
                      {/* Delete Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          removeFromHistory(e, idx, item.firestoreId);
                        }} 
                        className="bg-red-600/80 p-1.5 rounded-lg text-white hover:bg-red-500 transition shadow-lg"
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
          {/* Background color slightly brightened for contrast */}
          <div className="bg-zinc-900/80 border border-dashed border-white/10 rounded-[32px] p-8 md:p-12 text-zinc-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em]">
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
              {/* Changed h4 to h3 or kept same but ensured order in page is correct */}
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Platform</h4>
              <ul className="text-zinc-400 text-[10px] space-y-3 font-bold uppercase tracking-wider">
                  <li><Link href="/privacy" className="hover:text-indigo-400 py-2 inline-block">Privacy</Link></li>
                  <li><Link href="/about" className="hover:text-indigo-400 py-2 inline-block">About</Link></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Connect</h4>
              <ul className="text-zinc-400 text-[10px] space-y-3 font-bold uppercase tracking-wider">
                  <li><Link href="https://github.com/aggarwalh905-ops" className="hover:text-indigo-400 py-2 inline-block">GitHub</Link></li>
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
            <span className="text-[8px] font-bold uppercase tracking-tight text-zinc-400">Image Saved & Link Copied</span>
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
            
            <p className="text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] leading-relaxed mb-8">
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