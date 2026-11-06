import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Manrope, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthModal } from '@/components/auth/auth-modal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prepnx — Learn, Practice, Achieve',
  description: 'Empowering students, parents, and teachers with world-class education tools and resources.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable} ${manrope.variable} ${jetbrains.variable}`}
    >
      <head>
        <Script
          id="edutech-theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.location.pathname.indexOf('/student')===0){document.documentElement.classList.remove('dark');return;}var s=localStorage.getItem('edutech-theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-primary-200 selection:text-primary-950">
        <ThemeProvider>
          {children}
          <AuthModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
