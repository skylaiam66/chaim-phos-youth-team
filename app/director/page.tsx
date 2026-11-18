'use client';

import { useEffect, useState } from 'react';
import { currentUser } from '@/lib/auth';
import { getAll, save, remove, setting } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { uploadDirectorMedia } from '@/lib/media';
import { syncNow } from '@/lib/sync';
import VerifiedBadge from '@/components/VerifiedBadge';

const tabs = [
  'Dashboard',
  'Members',
  'Chapters',
  'Posts',
  'Announcements',
  'Events',
  'Projects',
  'Shop',
  'Library',
  'Contributions',
  'Bookings',
  'Home Slider',
  'Officials',
  'Settings'
];

const stores: any = {
  Members: 'profiles',
  Chapters: 'chapters',
  Posts: 'posts',
  Announcements: 'announcements',
  Events: 'events',
  Projects: 'projects',
  Shop: 'shop',
  Library: 'library',
  Contributions: 'contributions',
  Bookings: 'bookings',
  'Home Slider': 'slider',
  Officials: 'officials'
};

const dashboardStores = [
  'profiles',
  'posts',
  'events',
  'projects',
  'shop',
  'contributions',
  'bookings',
  'officials',
  'chapters'
];

function isPaid(member: any) {
  const value =
    member?.paid ??
    member?.isPaid ??
    member?.authorPaid ??
    member?.membershipPaid ??
    member?.paymentStatus;

  return (
    value === true ||
    value === 1 ||
    ['true', '1', 'paid', 'yes'].includes(
      String(value).toLowerCase()
    )
  );
}

function formatDate(value: any) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function chapterMatchesMember(
  member: any,
  chapter: any
) {
  const matchesChapterId =
    Boolean(member.chapterId) &&
    member.chapterId === chapter.id;

  const matchesChapterName =
    String(member.chapter || '').trim().toLowerCase() ===
    String(chapter.name || '').trim().toLowerCase();

  return matchesChapterId || matchesChapterName;
}

function StatCard({
  label,
  value,
  description,
  icon,
  color,
  onClick
}: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        background: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 0,
        boxShadow: '0 4px 14px rgba(0,0,0,.04)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <span
          style={{
            color: '#64748b',
            fontSize: 13,
            fontWeight: 700
          }}
        >
          {label}
        </span>

        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: color + '18',
            color,
            fontSize: 20,
            fontWeight: 900
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 900,
          color: '#172b3a',
          marginTop: 13
        }}
      >
        {Number(value || 0).toLocaleString()}
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#64748b',
          marginTop: 5
        }}
      >
        {description}
      </div>
    </button>
  );
}

function Bar({
  label,
  value,
  total,
  color
}: any) {
  const percentage = total
    ? Math.min(100, (value / total) * 100)
    : 0;

  return (
    <div style={{ marginBottom: 17 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 7,
          fontSize: 13
        }}
      >
        <b>{label}</b>
        <strong>{value}</strong>
      </div>

      <div
        style={{
          width: '100%',
          height: 11,
          borderRadius: 20,
          background: '#e8edf2',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            borderRadius: 20,
            transition: 'width .5s ease'
          }}
        />
      </div>
    </div>
  );
}

export default function Director() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState('Dashboard');
  const [rows, setRows] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [notice, setNotice] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(true);

  // CHAPTER FORM STATES

  const [chapterName, setChapterName] = useState('');
  const [chapterLocation, setChapterLocation] = useState('');
  const [chapterDistrict, setChapterDistrict] = useState('');
  const [chapterLeader, setChapterLeader] = useState('');
  const [chapterDescription, setChapterDescription] = useState('');
  const [editingChapter, setEditingChapter] = useState<any>(null);

  // LOAD DASHBOARD DATA

  async function loadDashboard() {
    const results: any = {};

    await Promise.all(
      dashboardStores.map(async store => {
        results[store] = await getAll(store as any);
      })
    );

    setDashboard(results);
  }

  // LOAD CURRENT TAB

  async function load() {
    try {
      const u = await currentUser();
      setUser(u);

      if (tab === 'Dashboard') {
        await loadDashboard();
        setRows([]);
      } else if (stores[tab]) {
        const records = await getAll(stores[tab]);
        setRows(records);
      }

      // Load chapters and member profiles together.
      if (tab === 'Chapters') {
        const [profiles, chapterRecords] = await Promise.all([
          getAll('profiles'),
          getAll('chapters')
        ]);

        setDashboard((previous: any) => ({
          ...previous,
          profiles,
          chapters: chapterRecords
        }));
      }

      // Load settings.
      if (tab === 'Settings') {
        let local =
          (await setting('whatsapp_number')) || '';

        if (supabase) {
          const { data, error } = await supabase
            .from('settings_text')
            .select('payload')
            .eq('id', 'whatsapp_number')
            .maybeSingle();

          if (!error) {
            local = data?.payload?.value || local;
          }
        }

        setWhatsapp(local);
      }
    } catch (error) {
      console.error('Director loading error:', error);
      setNotice('Could not load Director information.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();

    const h = () => load();

    window.addEventListener('cp-data-change', h);

    return () => {
      window.removeEventListener('cp-data-change', h);
    };
  }, [tab]);

  // DASHBOARD DATA

  const members = dashboard.profiles || [];
  const posts = dashboard.posts || [];
  const events = dashboard.events || [];
  const projects = dashboard.projects || [];
  const shop = dashboard.shop || [];
  const contributions = dashboard.contributions || [];
  const bookings = dashboard.bookings || [];
  const officials = dashboard.officials || [];
  const chapters = dashboard.chapters || [];

  const paidMembers = members.filter(isPaid);

  const unpaidMembers = members.filter(
    (member: any) => !isPaid(member)
  );

  const officialMembers = members.filter(
    (member: any) =>
      member.membershipType === 'Official'
  );

  const normalMembers = members.filter(
    (member: any) =>
      member.membershipType !== 'Official'
  );

  const activeChapters = chapters.filter(
    (chapter: any) => chapter.active !== false
  );

  const pendingBookings = bookings.filter(
    (booking: any) =>
      !['Approved', 'Rejected', 'Completed'].includes(
        booking.status
      )
  );

  const confirmedContributions = contributions.filter(
    (item: any) =>
      item.confirmed === true ||
      item.status === 'Paid'
  );

  const totalContributions = confirmedContributions.reduce(
    (sum: number, item: any) =>
      sum + Number(item.amount || 0),
    0
  );

  // Avoid double-counting officials.

  const listedOfficialIds = new Set(
    officialMembers.map((member: any) => member.id)
  );

  const additionalOfficials = officials.filter(
    (official: any) =>
      !listedOfficialIds.has(official.id)
  );

  const totalOfficials =
    officialMembers.length + additionalOfficials.length;

  const recentMembers = [...members]
    .sort(
      (a: any, b: any) =>
        new Date(
          b.createdAt || b.updatedAt || 0
        ).getTime() -
        new Date(
          a.createdAt || a.updatedAt || 0
        ).getTime()
    )
    .slice(0, 5);

  const recentPosts = [...posts]
    .sort(
      (a: any, b: any) =>
        new Date(
          b.createdAt || b.updatedAt || 0
        ).getTime() -
        new Date(
          a.createdAt || a.updatedAt || 0
        ).getTime()
    )
    .slice(0, 5);

  const upcomingEvents = [...events]
    .filter((event: any) => {
      if (!event.date && !event.eventDate) return true;

      const date = new Date(
        event.date || event.eventDate
      );

      return (
        !Number.isNaN(date.getTime()) &&
        date >= new Date()
      );
    })
    .sort(
      (a: any, b: any) =>
        new Date(
          a.date || a.eventDate || 0
        ).getTime() -
        new Date(
          b.date || b.eventDate || 0
        ).getTime()
    )
    .slice(0, 5);

  // GENERAL CREATE FUNCTION

  async function create() {
    try {
      const store = stores[tab];

      if (!store) return;

      if (!title.trim()) {
        setNotice('Enter a title or name.');
        return;
      }

      if (
        tab === 'Home Slider' &&
        (await getAll('slider')).length >= 6
      ) {
        setNotice(
          'The home slider is limited to six slides. Delete an old slide first.'
        );
        return;
      }

      if (
        (tab === 'Home Slider' || tab === 'Library') &&
        !file
      ) {
        setNotice(
          tab === 'Home Slider'
            ? 'Choose a slide image.'
            : 'Choose a library document.'
        );
        return;
      }

      const id = crypto.randomUUID();

      let media: any = null;

      if (file) {
        const bucket = (
          tab === 'Home Slider'
            ? 'homepage'
            : tab.toLowerCase()
        ) as
          | 'homepage'
          | 'events'
          | 'projects'
          | 'shop'
          | 'library'
          | 'officials';

        media = await uploadDirectorMedia(bucket, file);
      }

      const row: any = {
        id,
        title: title.trim(),
        body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: user.id
      };

      if (tab === 'Officials') {
        row.name = title.trim();
        row.position = position.trim() || 'OFFICIAL';
        row.bio = body;
        row.photo = media;
        row.title = row.name;
      }

      if (tab === 'Shop') {
        row.price = Number(price) || 0;
      }

      if (tab === 'Home Slider') {
        row.url = media?.url;
        row.photo = media;
        row.caption = body;
        row.position = (await getAll('slider')).length + 1;
      } else if (tab === 'Library') {
        row.file = media;
      } else {
        row.photo = media;
      }

      await save(store, row);
      await syncNow();

      setTitle('');
      setBody('');
      setPrice('');
      setPosition('');
      setFile(null);

      setNotice('Published.');

      await load();
    } catch (e: any) {
      setNotice(e.message || 'Could not save.');
    }
  }

  // GENERAL UPDATE FUNCTION

  async function update(row: any, patch: any) {
    const next = {
      ...row,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    await save(stores[tab], next);
    await syncNow();
    await load();
  }

  // CHAPTER MANAGEMENT

  function resetChapterForm() {
    setChapterName('');
    setChapterLocation('');
    setChapterDistrict('');
    setChapterLeader('');
    setChapterDescription('');
    setEditingChapter(null);
  }

  async function saveChapter() {
    try {
      if (!chapterName.trim()) {
        setNotice('Enter a chapter name.');
        return;
      }

      const existing = await getAll('chapters');

      const duplicate = existing.find(
        (chapter: any) =>
          chapter.name?.trim().toLowerCase() ===
            chapterName.trim().toLowerCase() &&
          chapter.id !== editingChapter?.id
      );

      if (duplicate) {
        setNotice(
          'A chapter with this name already exists.'
        );
        return;
      }

      const wasEditing = Boolean(editingChapter);

      const chapter: any = {
        ...(editingChapter || {}),
        id: editingChapter?.id || crypto.randomUUID(),
        name: chapterName.trim(),
        location: chapterLocation.trim(),
        district: chapterDistrict.trim(),
        leaderName: chapterLeader.trim(),
        description: chapterDescription.trim(),
        active: editingChapter?.active ?? true,
        createdAt:
          editingChapter?.createdAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: user.id
      };

      await save('chapters', chapter);
      await syncNow();

      resetChapterForm();

      setNotice(
        wasEditing
          ? 'Chapter updated successfully.'
          : 'Chapter created successfully.'
      );

      await load();
    } catch (error: any) {
      setNotice(
        error.message || 'Could not save chapter.'
      );
    }
  }

  function editChapter(chapter: any) {
    setEditingChapter(chapter);
    setChapterName(chapter.name || '');
    setChapterLocation(chapter.location || '');
    setChapterDistrict(chapter.district || '');
    setChapterLeader(chapter.leaderName || '');
    setChapterDescription(chapter.description || '');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function toggleChapter(chapter: any) {
    try {
      const next = {
        ...chapter,
        active: chapter.active === false,
        updatedAt: new Date().toISOString()
      };

      await save('chapters', next);
      await syncNow();
      await load();

      setNotice(
        next.active
          ? 'Chapter activated.'
          : 'Chapter deactivated.'
      );
    } catch (error: any) {
      setNotice(
        error.message || 'Could not update chapter.'
      );
    }
  }

  async function deleteChapter(chapter: any) {
    try {
      const profiles = await getAll('profiles');

      const membersInChapter = profiles.filter(
        (member: any) =>
          chapterMatchesMember(member, chapter)
      );

      if (membersInChapter.length > 0) {
        setNotice(
          `This chapter has ${membersInChapter.length} registered member(s). Reassign them before deleting it.`
        );
        return;
      }

      if (
        !confirm(
          `Delete ${chapter.name}? This cannot be undone.`
        )
      ) {
        return;
      }

      await remove('chapters', chapter.id);
      await syncNow();
      await load();

      setNotice('Chapter deleted.');
    } catch (error: any) {
      setNotice(
        error.message || 'Could not delete chapter.'
      );
    }
  }

  // DELETE RECORD

  async function deleteRow(row: any) {
    if (!confirm('Delete this record?')) return;

    const store = stores[tab];

    if (tab === 'Members' && supabase) {
      const { error } = await supabase.rpc(
        'cp_delete_member',
        { target_user_id: row.id }
      );

      if (error) {
        setNotice(error.message);
        return;
      }

      await remove('profiles', row.id);
    } else {
      await remove(store, row.id);

      if (supabase) {
        const { error } = await supabase
          .from(`${store}_text`)
          .delete()
          .eq('id', row.id);

        if (error) {
          setNotice(
            `Deleted locally; cloud delete failed: ${error.message}`
          );
        }

        const media = row.file || row.photo;

        if (media?.path && media?.bucket) {
          const { error: mediaError } = await supabase
            .storage
            .from(media.bucket)
            .remove([media.path]);

          if (mediaError) {
            setNotice(mediaError.message);
          }
        }
      }
    }

    await load();
  }

  // MEDIA REPLACEMENT

  async function replaceMedia(row: any, file: File) {
    try {
      const bucket = (
        tab === 'Home Slider'
          ? 'homepage'
          : tab.toLowerCase()
      ) as
        | 'homepage'
        | 'events'
        | 'projects'
        | 'shop'
        | 'library'
        | 'officials';

      const old =
        tab === 'Library' ? row.file : row.photo;

      const media = await uploadDirectorMedia(
        bucket,
        file,
        old
      );

      const patch: any =
        tab === 'Library'
          ? { file: media }
          : { photo: media };

      if (tab === 'Home Slider') {
        patch.url = media.url;
      }

      await update(row, patch);

      setNotice('Media replaced.');
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  // GENERAL EDIT

  async function editRow(row: any) {
    const nextTitle = prompt(
      'Update title / name',
      row.title || row.fullName || ''
    );

    if (nextTitle === null) return;

    const nextBody = prompt(
      'Update description / details',
      row.body || ''
    );

    if (nextBody === null) return;

    const patch: any = {
      title: nextTitle,
      body: nextBody
    };

    if (tab === 'Shop') {
      const p = prompt(
        'Price in UGX',
        String(row.price || 0)
      );

      if (p !== null) {
        patch.price = Number(p) || 0;
      }
    }

    await update(row, patch);
  }

  // PASSWORD RESET

  async function resetPassword(row: any) {
    if (!supabase) return;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        row.email,
        {
          redirectTo: location.origin + '/login'
        }
      );

    setNotice(
      error
        ? error.message
        : `Password reset email sent to ${row.email}.`
    );
  }

  // SETTINGS

  async function saveSettings() {
    await setting('whatsapp_number', whatsapp);

    if (supabase) {
      const { error } = await supabase
        .from('settings_text')
        .upsert({
          id: 'whatsapp_number',
          payload: {
            id: 'whatsapp_number',
            value: whatsapp
          },
          updated_at: new Date().toISOString()
        });

      if (error) {
        setNotice(error.message);
        return;
      }
    }

    setNotice('WhatsApp number saved.');
  }

  // ACCESS CONTROL

  if (loading && !user) {
    return (
      <div className="main">
        <section className="card">
          Loading Director access…
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="main">
        <section className="card">
          Director access could not be loaded. Please sign in again.
        </section>
      </div>
    );
  }

  if (user.role !== 'Director') {
    return (
      <div className="main">
        <section className="card">
          Director access is required. Your account must be promoted by the project owner in Supabase.
        </section>
      </div>
    );
  }

  return (
    <div className="main">

      {/* HEADER */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 15
        }}
      >
        <div>
          <h1 className="section-title">
            Director Dashboard
          </h1>

          <p className="muted">
            CHAIM PHOS YOUTH TEAM · DIRECTOR CONTROL CENTRE
          </p>
        </div>

        <button
          className="btn secondary"
          onClick={load}
        >
          ↻ Refresh dashboard
        </button>
      </div>

      {/* NAVIGATION */}

      <div className="director-tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={
              'btn ' +
              (tab === t ? 'gold' : 'secondary')
            }
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* DIRECTOR DASHBOARD */}

      {tab === 'Dashboard' && (
        <div>

          <section
            style={{
              background: 'linear-gradient(120deg,#063d75,#0878c9)',
              color: '#fff',
              padding: 25,
              borderRadius: 18,
              marginBottom: 22
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>
              Welcome, Director
            </h2>

            <p style={{ marginBottom: 0, opacity: .9 }}>
              Here is the current overview of CHAIM PHOS Youth Team.
              Monitor membership, community activity and team operations
              from one place.
            </p>
          </section>

          <h2>Membership overview</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
              gap: 14,
              marginBottom: 25
            }}
          >
            <StatCard
              label="Total members"
              value={members.length}
              description="Registered profiles"
              icon="♟"
              color="#0878c9"
              onClick={() => setTab('Members')}
            />

            <StatCard
              label="Paid members"
              value={paidMembers.length}
              description="Verified accounts"
              icon="✓"
              color="#1685d8"
              onClick={() => setTab('Members')}
            />

            <StatCard
              label="Unpaid members"
              value={unpaidMembers.length}
              description="Awaiting payment confirmation"
              icon="!"
              color="#d97706"
              onClick={() => setTab('Members')}
            />

            <StatCard
              label="Officials"
              value={totalOfficials}
              description="Classified and listed officials"
              icon="★"
              color="#dc3545"
              onClick={() => setTab('Officials')}
            />

            <StatCard
              label="Chapters"
              value={chapters.length}
              description={`${activeChapters.length} active chapters`}
              icon="⌂"
              color="#16a34a"
              onClick={() => setTab('Chapters')}
            />
          </div>

          <h2>Platform activity</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
              gap: 14,
              marginBottom: 25
            }}
          >
            <StatCard
              label="Community posts"
              value={posts.length}
              description="Published posts"
              icon="▤"
              color="#7c3aed"
              onClick={() => setTab('Posts')}
            />

            <StatCard
              label="Events"
              value={events.length}
              description="Created events"
              icon="▦"
              color="#0891b2"
              onClick={() => setTab('Events')}
            />

            <StatCard
              label="Projects"
              value={projects.length}
              description="Youth team projects"
              icon="◆"
              color="#16a34a"
              onClick={() => setTab('Projects')}
            />

            <StatCard
              label="Shop items"
              value={shop.length}
              description="Available products"
              icon="🛍"
              color="#9333ea"
              onClick={() => setTab('Shop')}
            />

            <StatCard
              label="Contributions"
              value={contributions.length}
              description="Contribution records"
              icon="UGX"
              color="#0f766e"
              onClick={() => setTab('Contributions')}
            />

            <StatCard
              label="Pending bookings"
              value={pendingBookings.length}
              description="Awaiting Director action"
              icon="◷"
              color="#ea580c"
              onClick={() => setTab('Bookings')}
            />
          </div>

          {/* CHARTS */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
              gap: 18,
              marginBottom: 25
            }}
          >

            <section className="card">
              <h2>Membership distribution</h2>

              <Bar
                label="Members"
                value={normalMembers.length}
                total={members.length}
                color="#1685d8"
              />

              <Bar
                label="Officials"
                value={officialMembers.length}
                total={members.length}
                color="#e33445"
              />

              <p className="muted">
                Based on registered profile classifications.
              </p>
            </section>

            <section className="card">
              <h2>Payment overview</h2>

              <Bar
                label="Paid / verified"
                value={paidMembers.length}
                total={members.length}
                color="#1685d8"
              />

              <Bar
                label="Unpaid"
                value={unpaidMembers.length}
                total={members.length}
                color="#e49a24"
              />

              <p className="muted">
                Payment status is managed by the Director.
              </p>
            </section>

            <section className="card">
              <h2>Contribution overview</h2>

              <div
                style={{
                  fontSize: 27,
                  fontWeight: 900,
                  color: '#0878c9',
                  margin: '18px 0 8px'
                }}
              >
                UGX {totalContributions.toLocaleString()}
              </div>

              <p className="muted">
                Total confirmed contributions
              </p>

              <p>
                Confirmed records: <b>{confirmedContributions.length}</b>
              </p>

              <p>
                All contribution records: <b>{contributions.length}</b>
              </p>
            </section>

          </div>

          {/* QUICK ACTIONS */}

          <section className="card">
            <h2>Quick actions</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
                gap: 10
              }}
            >
              {[
                ['Manage members', 'Members'],
                ['Manage chapters', 'Chapters'],
                ['Moderate posts', 'Posts'],
                ['Publish announcement', 'Announcements'],
                ['Create event', 'Events'],
                ['Add project', 'Projects'],
                ['Manage officials', 'Officials'],
                ['View contributions', 'Contributions'],
                ['Review bookings', 'Bookings']
              ].map(([label, destination]) => (
                <button
                  key={destination}
                  className="btn secondary"
                  onClick={() => setTab(destination)}
                  style={{ minHeight: 48 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* RECENT MEMBERS AND POSTS */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
              gap: 18,
              marginTop: 20
            }}
          >

            <section className="card">
              <h2>Recently registered members</h2>

              {recentMembers.length === 0 ? (
                <p className="muted">
                  No member profiles found.
                </p>
              ) : (
                recentMembers.map((member: any) => (
                  <div
                    key={member.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        flexWrap: 'wrap'
                      }}
                    >
                      <b>
                        {member.fullName || member.name || 'Unnamed member'}
                      </b>

                      {member.membershipType === 'Official' ? (
                        <span
                          className="badge-dot official-dot"
                          title="Official"
                        />
                      ) : (
                        <span
                          className="badge-dot member-dot"
                          title="Member"
                        />
                      )}

                      {isPaid(member) && <VerifiedBadge />}
                    </div>

                    <small className="muted">
                      {member.chapter || 'Chapter not specified'}
                      {' · '}
                      {formatDate(member.createdAt || member.updatedAt)}
                    </small>
                  </div>
                ))
              )}

              <button
                className="btn secondary"
                style={{ marginTop: 12 }}
                onClick={() => setTab('Members')}
              >
                View all members
              </button>
            </section>

            <section className="card">
              <h2>Recent community posts</h2>

              {recentPosts.length === 0 ? (
                <p className="muted">
                  No community posts yet.
                </p>
              ) : (
                recentPosts.map((post: any) => (
                  <div
                    key={post.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <b>
                      {post.authorName || 'Community member'}
                    </b>

                    <p style={{ margin: '5px 0' }}>
                      {String(post.text || '').slice(0, 120)}
                      {String(post.text || '').length > 120 ? '…' : ''}
                    </p>

                    <small className="muted">
                      {formatDate(post.createdAt)}
                    </small>
                  </div>
                ))
              )}

              <button
                className="btn secondary"
                style={{ marginTop: 12 }}
                onClick={() => setTab('Posts')}
              >
                Moderate posts
              </button>
            </section>

          </div>

          {/* UPCOMING EVENTS AND BOOKINGS */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
              gap: 18,
              marginTop: 20
            }}
          >

            <section className="card">
              <h2>Upcoming events</h2>

              {upcomingEvents.length === 0 ? (
                <p className="muted">
                  No upcoming events found.
                </p>
              ) : (
                upcomingEvents.map((event: any) => (
                  <div
                    key={event.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <b>{event.title || event.name}</b>

                    <p className="muted">
                      {formatDate(event.date || event.eventDate)}
                    </p>
                  </div>
                ))
              )}

              <button
                className="btn secondary"
                style={{ marginTop: 12 }}
                onClick={() => setTab('Events')}
              >
                Manage events
              </button>
            </section>

            <section className="card">
              <h2>Pending mentorship bookings</h2>

              {pendingBookings.length === 0 ? (
                <p className="muted">
                  There are no pending bookings.
                </p>
              ) : (
                pendingBookings.slice(0, 5).map((booking: any) => (
                  <div
                    key={booking.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <b>
                      {booking.memberName || 'Member'}
                    </b>

                    <p style={{ margin: '4px 0' }}>
                      {booking.topic || 'Mentorship request'}
                    </p>

                    <small className="muted">
                      {booking.day || ''}
                      {' '}
                      {booking.time || ''}
                    </small>
                  </div>
                ))
              )}

              <button
                className="btn secondary"
                style={{ marginTop: 12 }}
                onClick={() => setTab('Bookings')}
              >
                Manage bookings
              </button>
            </section>

          </div>

        </div>
      )}

      {/* CHAPTER MANAGEMENT */}

      {tab === 'Chapters' && (
        <div>

          <section className="card">
            <h2>
              {editingChapter ? 'Update Chapter' : 'Create New Chapter'}
            </h2>

            <p className="muted">
              Create and manage the official chapters of CHAIM PHOS Youth Team.
            </p>

            <input
              className="field"
              placeholder="Chapter name"
              value={chapterName}
              onChange={e => setChapterName(e.target.value)}
            />

            <input
              className="field"
              placeholder="Location / Town Council"
              value={chapterLocation}
              onChange={e => setChapterLocation(e.target.value)}
            />

            <input
              className="field"
              placeholder="District"
              value={chapterDistrict}
              onChange={e => setChapterDistrict(e.target.value)}
            />

            <input
              className="field"
              placeholder="Chapter leader's name"
              value={chapterLeader}
              onChange={e => setChapterLeader(e.target.value)}
            />

            <textarea
              className="field"
              rows={4}
              placeholder="Chapter description"
              value={chapterDescription}
              onChange={e => setChapterDescription(e.target.value)}
            />

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <button
                className="btn"
                onClick={saveChapter}
              >
                {editingChapter ? 'Update Chapter' : 'Create Chapter'}
              </button>

              {editingChapter && (
                <button
                  className="btn secondary"
                  onClick={resetChapterForm}
                >
                  Cancel Editing
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <h2>Registered Chapters</h2>

              <span className="muted">
                {chapters.length} total · {activeChapters.length} active
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="muted">
                No chapters have been created yet. Use the form above to create your first chapter.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
                  gap: 15
                }}
              >
                {rows.map((chapter: any) => {
                  const chapterMembers = members.filter(
                    (member: any) =>
                      chapterMatchesMember(member, chapter)
                  );

                  return (
                    <article
                      className="card"
                      key={chapter.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 15
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10
                        }}
                      >
                        <h3 style={{ margin: 0 }}>
                          {chapter.name}
                        </h3>

                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 800,
                            background:
                              chapter.active === false
                                ? '#fee2e2'
                                : '#dcfce7',
                            color:
                              chapter.active === false
                                ? '#b91c1c'
                                : '#166534'
                          }}
                        >
                          {chapter.active === false ? 'INACTIVE' : 'ACTIVE'}
                        </span>
                      </div>

                      <p>
                        <b>Location:</b>{' '}
                        {chapter.location || 'Not specified'}
                      </p>

                      <p>
                        <b>District:</b>{' '}
                        {chapter.district || 'Not specified'}
                      </p>

                      <p>
                        <b>Chapter leader:</b>{' '}
                        {chapter.leaderName || 'Not assigned'}
                      </p>

                      <p>
                        <b>Registered members:</b>{' '}
                        {chapterMembers.length}
                      </p>

                      <p>
                        {chapter.description || 'No description provided.'}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginTop: 12
                        }}
                      >
                        <button
                          className="btn secondary"
                          onClick={() => editChapter(chapter)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn secondary"
                          onClick={() => toggleChapter(chapter)}
                        >
                          {chapter.active === false
                            ? 'Activate'
                            : 'Deactivate'}
                        </button>

                        <button
                          className="btn secondary"
                          onClick={() => deleteChapter(chapter)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      )}

      {/* CREATE CONTENT */}

      {[
        'Announcements',
        'Events',
        'Projects',
        'Shop',
        'Library',
        'Home Slider',
        'Officials'
      ].includes(tab) && (
        <section className="card">

          <h2>
            Create {tab === 'Home Slider' ? 'slide' : tab.slice(0, -1)}
          </h2>

          <input
            className="field"
            placeholder="Title / Name"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            className="field"
            rows={3}
            placeholder={
              tab === 'Officials'
                ? 'Official biography / responsibilities'
                : 'Description / caption'
            }
            value={body}
            onChange={e => setBody(e.target.value)}
          />

          {tab === 'Officials' && (
            <input
              className="field"
              placeholder="Official position / title"
              value={position}
              onChange={e => setPosition(e.target.value)}
            />
          )}

          {tab === 'Shop' && (
            <input
              className="field"
              type="number"
              placeholder="Price in UGX"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          )}

          {[
            'Events',
            'Projects',
            'Shop',
            'Library',
            'Home Slider',
            'Officials'
          ].includes(tab) && (
            <label className="muted">
              {tab === 'Library'
                ? 'PDF / document'
                : tab === 'Officials'
                  ? 'Official portrait (officials bucket)'
                  : 'Image'}

              <input
                className="field"
                type="file"
                accept={
                  tab === 'Library'
                    ? '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'
                    : 'image/*'
                }
                onChange={e =>
                  setFile(e.target.files?.[0] || null)
                }
              />
            </label>
          )}

          <button className="btn" onClick={create}>
            Publish
          </button>

        </section>
      )}

      {/* SETTINGS */}

      {tab === 'Settings' && (
        <section className="card">

          <h2>Organisation settings</h2>

          <label>
            WhatsApp number

            <input
              className="field"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="e.g. +2567…"
            />
          </label>

          <button className="btn" onClick={saveSettings}>
            Save settings
          </button>

        </section>
      )}

      {/* MEMBER MANAGEMENT */}

      {tab === 'Members' && (
        <section className="card">

          <h2>Member management</h2>

          <input
            className="field"
            placeholder="Search members by name, email or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {rows
            .filter(r =>
              `${r.fullName || ''} ${r.name || ''} ${r.email || ''} ${r.phone || ''}`
                .toLowerCase()
                .includes(search.toLowerCase())
            )
            .map(r => (
              <article className="card" key={r.id}>

                <div className="member-name">

                  <b>{r.fullName || r.name || 'Unnamed member'}</b>

                  {r.membershipType === 'Official' ? (
                    <span
                      className="badge-dot official-dot"
                      title="Official"
                    />
                  ) : (
                    <span
                      className="badge-dot member-dot"
                      title="Member"
                    />
                  )}

                  {isPaid(r) && <VerifiedBadge />}

                </div>

                <p className="muted">
                  {r.email} · {r.phone} · {r.chapter}
                </p>

                <div className="grid">

                  <label>
                    <input
                      type="checkbox"
                      checked={isPaid(r)}
                      onChange={e =>
                        update(r, {
                          paid: e.target.checked
                        })
                      }
                    />
                    Paid / Verified
                  </label>

                  <label>
                    Account classification

                    <select
                      className="field"
                      value={r.membershipType || 'Member'}
                      onChange={e =>
                        update(r, {
                          membershipType: e.target.value
                        })
                      }
                    >
                      <option value="Member">Member</option>
                      <option value="Official">Official</option>
                    </select>
                  </label>

                </div>

                <button
                  className="btn secondary"
                  onClick={() => resetPassword(r)}
                >
                  Send password reset
                </button>

                <button
                  className="btn secondary"
                  onClick={() => deleteRow(r)}
                >
                  Delete profile
                </button>

              </article>
            ))}

        </section>
      )}

      {/* COMMUNITY MODERATION */}

      {tab === 'Posts' && (
        <section className="card">

          <h2>Community moderation</h2>

          {rows.map(r => (
            <article className="card" key={r.id}>

              <b>{r.authorName}</b>

              <p>{r.text}</p>

              {r.photoData && (
                <p className="muted">
                  Local-only member photo.
                </p>
              )}

              <button
                className="btn secondary"
                onClick={() =>
                  update(r, { pinned: !r.pinned })
                }
              >
                {r.pinned ? 'Unpin' : 'Pin'}
              </button>

              <button
                className="btn secondary"
                onClick={() => deleteRow(r)}
              >
                Delete
              </button>

            </article>
          ))}

        </section>
      )}

      {/* OTHER RECORDS */}

      {[
        'Announcements',
        'Events',
        'Projects',
        'Shop',
        'Library',
        'Home Slider',
        'Officials',
        'Contributions',
        'Bookings'
      ].includes(tab) && (
        <section className="card">

          <h2>{tab} records</h2>

          {rows.map(r => (
            <article className="card" key={r.id}>

              <b>
                {r.name || r.title || r.memberName || r.purpose || r.topic || r.id}
              </b>

              <p>
                {r.position || r.body || r.status || r.text}
              </p>

              {tab === 'Officials' && (
                <>
                  {r.photo?.url && (
                    <img
                      src={r.photo.url}
                      alt={r.name}
                      style={{
                        width: 110,
                        height: 110,
                        objectFit: 'cover',
                        borderRadius: 14
                      }}
                    />
                  )}

                  <p>{r.bio || r.body}</p>

                  <button
                    className="btn secondary"
                    onClick={() => {
                      const n = prompt(
                        'Official name',
                        r.name || r.title
                      );

                      if (n === null) return;

                      const pos = prompt(
                        'Official position',
                        r.position || ''
                      );

                      if (pos === null) return;

                      const bio = prompt(
                        'Biography',
                        r.bio || r.body || ''
                      );

                      if (bio === null) return;

                      update(r, {
                        name: n,
                        title: n,
                        position: pos,
                        bio,
                        body: bio
                      });
                    }}
                  >
                    Edit official
                  </button>

                  <label className="btn secondary">
                    Upload / replace portrait

                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={e =>
                        e.target.files?.[0] &&
                        replaceMedia(r, e.target.files[0])
                      }
                    />
                  </label>
                </>
              )}

              {tab === 'Contributions' && (
                <>
                  <p>
                    UGX {Number(r.amount || 0).toLocaleString()} · {r.chapter}
                  </p>

                  <button
                    className="btn"
                    onClick={() =>
                      update(r, {
                        confirmed: true,
                        status: 'Paid'
                      })
                    }
                  >
                    Mark Paid
                  </button>
                </>
              )}

              {tab === 'Bookings' && (
                <>
                  <button
                    className="btn"
                    onClick={() =>
                      update(r, { status: 'Approved' })
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="btn secondary"
                    onClick={() =>
                      update(r, { status: 'Rejected' })
                    }
                  >
                    Reject
                  </button>
                </>
              )}

              {!['Contributions', 'Bookings'].includes(tab) && (
                <>
                  {tab !== 'Officials' && (
                    <button
                      className="btn secondary"
                      onClick={() => editRow(r)}
                    >
                      Edit details
                    </button>
                  )}

                  {[
                    'Events',
                    'Projects',
                    'Shop',
                    'Library',
                    'Home Slider',
                    'Officials'
                  ].includes(tab) && (
                    <label className="btn secondary">
                      Replace media

                      <input
                        hidden
                        type="file"
                        accept={
                          tab === 'Library'
                            ? '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'
                            : 'image/*'
                        }
                        onChange={e =>
                          e.target.files?.[0] &&
                          replaceMedia(r, e.target.files[0])
                        }
                      />
                    </label>
                  )}

                  <button
                    className="btn secondary"
                    onClick={() => deleteRow(r)}
                  >
                    Delete
                  </button>
                </>
              )}

            </article>
          ))}

        </section>
      )}

      {/* NOTIFICATIONS */}

      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}

    </div>
  );
}