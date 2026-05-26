import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'ATHENA v3.0 — Algorithm Intelligence Platform',
  description:
    'Visualize, trace, and analyze 44 algorithms with step-by-step playback, complexity analysis, cache simulation, bug injection, and AI explanations.',
  keywords: [
    'algorithm', 'visualization', 'data structures',
    'complexity', 'computer science', 'sorting', 'graph',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      {/*
        bg-bg-base  → uses the CSS variable --bg-base defined in globals.css
        The Navbar renders at whatever height it needs — no hardcoded subtraction.
        min-h-screen ensures the body always fills the viewport.
      */}
      <body className="bg-bg-base text-tx-primary antialiased min-h-screen">
        <Navbar />
        <main className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
