'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import VerifiedBadge from './VerifiedBadge';
import { currentUser } from '@/lib/auth';
import { setting } from '@/lib/db';

export default function Header() {
  const [time, setTime] = useState('00:00:00');
  const [user, setUser] = useState<any>(null);
  const [menu, setMenu] = useState(false);
  const [director, setDirector] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    const refresh = () => currentUser().then(setUser).catch(() => setUser(null));
    const view = () => setting('director_view').then((value: any) => setDirector(!!value));
    const net = () => setOnline(navigator.onLine);
    tick();
    const timer = window.setInterval(tick, 1000);
    refresh(); view(); net();
    window.addEventListener('cp-user-change', refresh);
    window.addEventListener('cp-view-change', view);
    window.addEventListener('online', net);
    window.addEventListener('offline', net);
    return () => {
      clearInterval(timer);
      window.removeEventListener('cp-user-change', refresh);
      window.removeEventListener('cp-view-change', view);
      window.removeEventListener('online', net);
      window.removeEventListener('offline', net);
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const links = [
    ['Home', '/'],
    ['Community', '/community'],
    ['Events', '/events'],
    ['Projects', '/projects'],
    ['Shop', '/shop'],
    ['Library', '/library'],
    ['Contributions', '/contributions'],
    ['Bookings', '/bookings'],
    ['Me', '/me'],
    ...(user?.role === 'Director' && director ? [['Director Panel', '/director']] : []),
  ];

  return <>
    <header className="topbar">
      <button className="hamb" onClick={() => setMenu((value) => !value)}
        aria-label="Toggle navigation" aria-expanded={menu}>☰</button>
      <Link href="/" className="brand" onClick={() => setMenu(false)}>
        <img src="/assets/logo/logo.png" alt="CHAIM PHOS logo" />
        <span>CHAIM PHOS <small>YOUTH TEAM</small></span>
      </Link>
      <div className="header-spacer" />
      <img className="flag" src="/assets/logo/uganda-flag.png" alt="Uganda flag" />
      <span className="clock" aria-label="Local time">{time}</span>
      <span title={online ? 'Online' : 'Offline'} className={'dot ' + (online ? 'online' : 'offline')} />
      <div className="profile-mini">
        <img className="avatar" src={user?.photoData || '/assets/logo/logo.png'} alt="Profile" />
        <span className="name">{user?.fullName || 'Guest'} {user?.paid && <VerifiedBadge />}
          {user?.membershipType === 'Member' && <i className="badge-dot" style={{ background: '#168cff' }} />}
          {user?.membershipType === 'Official' && <i className="badge-dot" style={{ background: '#e32636' }} />}
        </span>
      </div>
      <Link className="header-login" href={user ? '/me' : '/login'}>{user ? 'My account' : 'Member login'}</Link>
    </header>
    {director && user?.role === 'Director' && <div className="director-strip">DIRECTOR MODE</div>}
    {menu && <>
      <button className="menu-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />
      <nav className="menu-panel" aria-label="Main navigation">
        <div className="menu-heading"><strong>CHAIM PHOS</strong><span>Explore the team</span></div>
        {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setMenu(false)}>{label}</Link>)}
        {!user && <Link className="menu-join" href="/login" onClick={() => setMenu(false)}>JOIN CHAIM PHOS</Link>}
      </nav>
    </>}
  </>;
}
