'use client';

import { useEffect, useState } from 'react';
import { getAll } from '@/lib/db';
import { supabase } from '@/lib/supabase';

/** Registered-member total uses the existing public profile directory when online,
 * with a local IndexedDB fallback for offline use. No backend schema is changed.
 */
export default function ImpactStats({ compact = false }: { compact?: boolean }) {
  const [registered, setRegistered] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (supabase && navigator.onLine) {
          const { data, error } = await supabase.from('cp_public_profiles').select('id,position');
          if (!error && data) {
            if (active) setRegistered(data.filter((p: any) => String(p.position || '').toLowerCase() !== 'director').length);
            return;
          }
        }
        const profiles = await getAll<any>('profiles');
        if (active) setRegistered((profiles || []).filter((p) => p && p.id && String(p.role || '').toLowerCase() !== 'director').length);
      } catch (error) { console.warn('Unable to load registered member count', error); }
    };
    void load();
    window.addEventListener('cp-data-change', load);
    window.addEventListener('cp-user-change', load);
    window.addEventListener('online', load);
    return () => { active = false; window.removeEventListener('cp-data-change', load); window.removeEventListener('cp-user-change', load); window.removeEventListener('online', load); };
  }, []);
  return <section className={`impact-stats${compact ? ' impact-stats-compact' : ''}`} aria-label="Club reach and membership">
    <article className="impact-stat"><span className="impact-stat-icon">♧</span><div><strong>{registered === null ? '—' : registered.toLocaleString()}</strong><b>Registered Members</b><small>People registered with CHAIM PHOS</small></div></article>
    <article className="impact-stat impact-stat-highlight"><span className="impact-stat-icon">✦</span><div><strong>110+</strong><b>Lives Touched</b><small>People reached through club activities and community impact</small></div></article>
  </section>;
}
