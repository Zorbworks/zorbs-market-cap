import { Share_Tech_Mono, DotGothic16 } from 'next/font/google'

const mono = Share_Tech_Mono({ 
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
})

const dotGothic = DotGothic16({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
})

export const metadata = {
  title: 'Zorbs Market Cap',
  description: 'Live market capitalization tracker for Zorbs by ZORA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${dotGothic.variable}`} style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
