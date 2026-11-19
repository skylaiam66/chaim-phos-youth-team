'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { currentUser } from '@/lib/auth';
import { setting } from '@/lib/db';

function Icon({ name }: { name: string }) {
  const common = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    community: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    events: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    shop: <><path d="M3 9h18l-1.5 12h-15z" /><path d="M8 9a4 4 0 0 1 8 0M9 13v2M15 13v2" /></>,
    money: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.6-.7-1.5-1-2.8-1-1.5 0-2.5.7-2.5 1.8 0 3 6 1.2 6 4.3 0 1.2-1.1 2-2.8 2-1.3 0-2.4-.4-3.1-1.2M12 5.5v13" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

export default function Footer() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [director, setDirector] = useState(false);

  useEffect(() => {
    const refresh = () => currentUser().then(setUser);
    const view = () => setting('director_view').then((value: any) => setDirector(value === true || value === 'true' || value === 1));
    refresh(); view();
    window.addEventListener('cp-user-change', refresh);
    window.addEventListener('cp-view-change', view);
    return () => {
      window.removeEventListener('cp-user-change', refresh);
      window.removeEventListener('cp-view-change', view);
    };
  }, []);

  async function switchMode() {
    const next = !director;
    await setting('director_view', next);
    setDirector(next);
    window.dispatchEvent(new Event('cp-view-change'));
    router.push(next ? '/director' : '/');
  }

  const items = [
    ['home', 'Home', '/'],
    ['community', 'Community', '/community'],
    ['events', 'Events', '/events'],
    ['shop', 'Shop', '/shop'],
    ['money', 'Contribute', '/contributions'],
    ['user', 'Me', '/me'],
  ];

  return <>
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src="/assets/logo/logo.png" alt="CHAIM PHOS logo" />
          <div><strong>CHAIM PHOS YOUTH TEAM</strong><span>Enkindle. Expand. Eternalise.</span></div>
        </div>
        <p>
          A youth club built around friendship, shared experiences,
          participation and positive contribution. We grow by encouraging
          one another and making room for everyone to play a part.
        </p>
        <div className="site-footer-links">
          <Link href="/">Home</Link><Link href="/community">Community</Link>
          <Link href="/events">Events</Link><Link href="/projects">Projects</Link>
          <Link href="/library">Library</Link><Link href="/login">Join / Login</Link>
        </div>
        <div className="footer-contact"><a href="mailto:director.chaimphos@gmail.com">director.chaimphos@gmail.com</a><a href="mailto:chaimphos.youth2023team@gmail.com">chaimphos.youth2023team@gmail.com</a></div>
        <small>© {new Date().getFullYear()} CHAIM PHOS Youth Team. Together, we move forward.</small>
      </div>
    </footer>
    <nav className="bottom-nav" aria-label="Quick navigation">
      {items.map(([icon, label, href]) => <Link className={path === href ? 'active' : ''} href={href} key={href}>
        <Icon name={icon} /><span>{label}</span>
      </Link>)}
      {user?.role === 'Director' && <button className="footer-switch" onClick={switchMode}>
        {director ? 'Member View' : 'Director View'}
      </button>}
    </nav>
  </>;
}
