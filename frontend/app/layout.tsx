import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist-sans'
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
});

export const metadata: Metadata = {
  title: 'VibeCheck Security | AI-Powered Vulnerability Intelligence',
  description: 'AI-powered vulnerability intelligence for your codebase. Scan, detect, and remediate security issues with advanced AI analysis.',
  generator: 'v0.app',
  keywords: ['security', 'vulnerability scanner', 'DevSecOps', 'AI', 'code analysis'],
}

export const viewport: Viewport = {
  themeColor: '#0a0f1a',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          theme="dark" 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(20, 30, 50, 0.95)',
              border: '1px solid rgba(100, 200, 255, 0.2)',
              color: '#fff',
            }
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
