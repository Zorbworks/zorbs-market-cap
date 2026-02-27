import { JetBrains_Mono } from 'next/font/google'

const mono = JetBrains_Mono({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'Zorbs Market Cap',
  description: 'Live market capitalization tracker for Zorbs by ZORA',
  openGraph: {
    title: 'Zorbs Market Cap',
    description: 'Live market capitalization tracker for Zorbs by ZORA',
    url: 'https://zorbs-market-cap.vercel.app',
    siteName: 'Zorbs Market Cap',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Zorbs Market Cap',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zorbs Market Cap',
    description: 'Live market capitalization tracker for Zorbs by ZORA',
    images: ['/api/og'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={mono.variable} style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
