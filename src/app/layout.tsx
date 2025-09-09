import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Who Knows Ball?",
  description: "Make your NFL picks and find out who knows ball.",
  manifest: "/manifest.json",
  icons: {
    // Main app icon - used in browser tabs and bookmarks
    icon: [
      { url: "/WhoKnowsBall.jpeg?v=4", sizes: "32x32", type: "image/jpeg" },
      { url: "/WhoKnowsBall.jpeg?v=4", sizes: "16x16", type: "image/jpeg" },
    ],
    // Apple devices (iPhone/iPad home screen icon) - needs specific sizes
    apple: [
      { url: "/WhoKnowsBall.jpeg?v=4", sizes: "180x180", type: "image/jpeg" },
      { url: "/WhoKnowsBall.jpeg?v=4", sizes: "152x152", type: "image/jpeg" },
      { url: "/WhoKnowsBall.jpeg?v=4", sizes: "120x120", type: "image/jpeg" },
    ],
    // Shortcut icon for older browsers
    shortcut: "/WhoKnowsBall.jpeg?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
