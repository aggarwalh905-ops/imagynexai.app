import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* static export enable karne ke liye */
  output: 'export', 
  
  /* Images ko GitHub Pages par chalane ke liye (Next.js Image Optimization server maangta hai) */
  images: {
    unoptimized: true,
  },

  /* Aapka existing compiler option */
  reactCompiler: true,
};

export default nextConfig;