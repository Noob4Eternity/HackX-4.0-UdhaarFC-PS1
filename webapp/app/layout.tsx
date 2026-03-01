import type { Metadata, Viewport } from "next";

import { Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "vibe-check Security | AI-Powered Vulnerability Intelligence",
  description:
    "AI-powered vulnerability intelligence for your codebase. Scan, detect, and remediate security issues with advanced AI analysis.",
  generator: "v0.app",
  keywords: ["security", "vulnerability scanner", "DevSecOps", "AI", "code analysis"],
};

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark">
      <body className={` ${playfair.variable} font-sans font-light antialiased`}>
        <SessionProvider>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(20, 30, 50, 0.95)",
                border: "1px solid rgba(100, 200, 255, 0.2)",
                color: "#fff",
              },
            }}
          />
          <Analytics />
        </SessionProvider>
      </body>
    </html>
  );
}
