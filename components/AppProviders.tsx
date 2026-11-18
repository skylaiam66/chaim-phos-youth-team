'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { startSync } from '@/lib/sync';

export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Start background data synchronization
    const stop = startSync();

    // Register the PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch((error) => {
          console.warn('PWA worker registration failed', error);
        });
    }

    // Display the branded loading screen briefly
    const splash = window.setTimeout(() => {
      setReady(true);
    }, 500);

    return () => {
      stop?.();
      window.clearTimeout(splash);
    };
  }, []);

  return (
    <div className="app-shell theme-chaim">
      {ready ? (
        children
      ) : (
        <div className="splash-screen">
          <img
            src="/assets/logo/logo.png"
            alt="CHAIM PHOS Youth Team Logo"
          />

          <h1>
            <span className="club-initial-black">C</span>HAIM{' '}
            <span className="club-initial-yellow">P</span>HOS
          </h1>

          <p className="club-slogan">
            <span className="slogan-black">E</span>nkindle.
            {' '}
            <span className="slogan-yellow">E</span>xpand.
            {' '}
            <span className="slogan-red">E</span>ternalise.
          </p>

          <p>Loading Youth Team…</p>

          <span className="splash-loader" />
        </div>
      )}
    </div>
  );
}