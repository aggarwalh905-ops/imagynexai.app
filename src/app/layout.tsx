import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

const baseUrl = "https://imagynexai.vercel.app";

export const viewport: Viewport = {
  themeColor: "#020202",
  width: "device-width",
  initialScale: 1,
  // maximumScale: 1 ko hata diya gaya hai taaki Accessibility (Zooming) improve ho sake
};

export const metadata: Metadata = {
  title: "AI Image Generator | Free Neural Art Studio - Imagynex AI",
  description: "Create stunning AI images for free with Imagynex AI. The best neural engine for flux AI art, image remixing, and instant digital masterpieces.",
  keywords: ["AI Image Generator", "Free AI Image Generator", "Neural Art Studio", "Flux AI Online", "Imagynex AI"],
  authors: [{ name: "Imagynex AI Team" }],
  metadataBase: new URL(baseUrl), 
  
  openGraph: {
    title: "Free AI Image Generator | Create Neural Art with Imagynex AI",
    description: "Generate high-quality AI art instantly. Imagine. Generate. Remix.",
    url: baseUrl,
    siteName: "Imagynex AI",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Imagynex AI Generator Preview" }],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Best AI Image Generator | Imagynex AI",
    description: "Create anything you can imagine with our Neural Engine. Fast, free, and high-quality AI art.",
    images: ["/og-image.jpg"],
    creator: "@ImagynexAI",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* DNS Prefetch & Preconnect: Network latency kam karne ke liye */}
        <link rel="preconnect" href="https://api.puter.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://js.puter.com" />
        
        {/* Performance Fix: Puter.com ko 'afterInteractive' kiya taaki page jaldi load ho */}
        <Script 
          src="https://js.puter.com/v2/" 
          strategy="afterInteractive" 
        />
      </head>
      <body className="bg-black antialiased selection:bg-indigo-500/30">
        {children}
        <Analytics />
        <GoogleAnalytics gaId="G-L8NKF8T60G" />
      </body>
    </html>
  );
}