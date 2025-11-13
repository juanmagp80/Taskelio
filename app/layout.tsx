import CookieBanner from '@/components/CookieBanner';
import { CookieCleanupProvider } from '@/components/CookieCleanupProvider';
import CookieSettings from '@/components/CookieSettings';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import '../styles/datepicker-fix.css';
import '../styles/datepicker.css';
import '../styles/toasts.css';
import './fallback.css';
import './globals.css';

// Configurar la fuente Inter como en Bonsai
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Taskelio — Tu CRM ligero para freelancers',
  description: 'Organiza clientes, tareas y proyectos. Todo en uno. El CRM que entiende tu forma de trabajar.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16.svg', type: 'image/svg+xml', sizes: '16x16' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning={true} className={`${inter.className} transition-colors duration-300 antialiased`}>
        <CookieCleanupProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange={false}
            themes={['light']}
            forcedTheme="light"
          >
            {children}
            <CookieBanner />
            <CookieSettings />
            <Toaster
              position="top-center"
              expand={true}
              richColors={false}
              closeButton={true}
            />
          </ThemeProvider>
        </CookieCleanupProvider>
      </body>
    </html>
  );
}
