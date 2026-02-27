import { JetBrains_Mono } from 'next/font/google'

const mono = JetBrains_Mono({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'Zorbs Market Cap',
  description: 'Live market capitalization tracker for Zorbs by ZORA',
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
