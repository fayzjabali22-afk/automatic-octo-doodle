'use client';

import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import InstallPrompt from '@/components/install-prompt';
import { useEffect } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('Service Worker registered:', registration.scope))
        .catch((error) => console.error('Service Worker registration failed:', error));
    }
  }, []);

  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <title>safaryat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="منصة safaryat لإدارة الرحلات والحجوزات بسهولة." />
        <meta name="theme-color" content="#170813" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <InstallPrompt />
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
