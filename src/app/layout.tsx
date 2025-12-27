import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Imagynex AI | Neural Image Studio",
  description: "Next-generation AI image generation powered by the Imagynex Neural Engine. Imagine anything, create masterpieces.",
  keywords: ["AI Image Generator", "Neural Art", "Imagynex", "FLUX AI", "Digital Art Studio"],
  openGraph: {
    title: "Imagynex AI",
    description: "The intersection of human creativity and machine intelligence.",
    url: "https://imagynex.ai", // Replace with your actual URL
    siteName: "Imagynex AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Imagynex AI",
    description: "Create anything you can imagine with our Neural Engine.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black">
        {children}
        <Analytics />
      </body>
    </html>
  );
}