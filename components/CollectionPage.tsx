'use client';

import { useEffect, useState } from 'react';
import { getAll, save, remove, setting } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { uploadDirectorMedia } from '@/lib/media';
import { supabase } from '@/lib/supabase';

type Kind = 'events' | 'projects' | 'shop' | 'library';

function isEnabled(value: any): boolean {
  return value === true || value === 'true' || value === 1;
}

export default function CollectionPage({
  kind,
  title,
}: {
  kind: Kind;
  title: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [directorView, setDirectorView] = useState(false);

  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState('');

  const isDirector = user?.role === 'Director';
  const canManage = isDirector && directorView;

  async function load() {
    setRows(await getAll(kind));
    setUser(await currentUser());
    const view = await setting('director_view');
    setDirectorView(!!view);
  }

  useEffect(() => {
    load();

    const handleDataChange = () => load();

    const handleViewChange = async () => {
      const view = await setting('director_view');
setDirectorView(isEnabled(view));
    };

    const handleUserChange = () => load();

    window.addEventListener('cp-data-change', handleDataChange);
    window.addEventListener('cp-view-change', handleViewChange);
    window.addEventListener('cp-user-change', handleUserChange);

    return () => {
      window.removeEventListener('cp-data-change', handleDataChange);
      window.removeEventListener('cp-view-change', handleViewChange);
      window.removeEventListener('cp-user-change', handleUserChange);
    };
  }, [kind]);

  async function create() {
    if (!canManage) {
      setNotice('Only the Director in Director View can publish this content.');
      return;
    }

    if (!name.trim()) {
      setNotice('Enter a title.');
      return;
    }

    try {
      let media: any = null;

      if (file) {
        media = await uploadDirectorMedia(kind, file);
      }

      const row: any = {
        id: crypto.randomUUID(),
        title: name.trim(),
        body,
        price: Number(price) || 0,
        photo: kind === 'library' ? undefined : media,
        file: kind === 'library' ? media : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: user.id,
      };

      await save(kind, row);

      setName('');
      setBody('');
      setPrice('');
      setFile(null);

      setNotice('Saved. Cloud sync will complete when online.');

      await load();
    } catch (e: any) {
      setNotice(e.message || 'Could not publish.');
    }
  }

  async function del(row: any) {
    if (!canManage) {
      setNotice('You do not have permission to delete this item.');
      return;
    }

    if (!confirm('Delete this item?')) return;

    try {
      await remove(kind, row.id);

      if (supabase) {
        const { error } = await supabase
          .from(`${kind}_text`)
          .delete()
          .eq('id', row.id);

        if (error) {
          setNotice(error.message);
        }

        const media = kind === 'library' ? row.file : row.photo;

        if (media?.path && media?.bucket) {
          await supabase.storage
            .from(media.bucket)
            .remove([media.path]);
        }
      }

      await load();
    } catch (e: any) {
      setNotice(e.message || 'Could not delete this item.');
    }
  }

  async function register(row: any) {
    if (!user) {
      location.href = '/login';
      return;
    }

    if (kind !== 'events') return;

    try {
      await save('bookings', {
        id: crypto.randomUUID(),
        memberId: user.id,
        memberName: user.fullName,
        topic: `Event: ${row.title}`,
        eventId: row.id,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });

      setNotice('Your event interest has been recorded.');
    } catch (e: any) {
      setNotice(e.message || 'Could not register your interest.');
    }
  }

  return (
    <div className="main">
      <h1 className="section-title">{title}</h1>

      {canManage && (
        <section className="card">
          <h2>Publish {title.slice(0, -1)}</h2>

          <input
            className="field"
            placeholder="Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <textarea
            className="field"
            rows={3}
            placeholder="Description / details"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {kind === 'shop' && (
            <input
              className="field"
              type="number"
              min="0"
              placeholder="Price (UGX)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          )}

          <label className="muted">
            {kind === 'library' ? 'PDF / document' : 'Image'}

            <input
              className="field"
              type="file"
              accept={
                kind === 'library'
                  ? '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'
                  : 'image/*'
              }
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />
          </label>

          <button className="btn" onClick={create}>
            Publish
          </button>

          {notice && <p className="muted">{notice}</p>}
        </section>
      )}

      {rows.length === 0 && (
        <section className="card muted">
          No {title.toLowerCase()} have been published yet.
        </section>
      )}

      <div className="grid">
        {rows.map((r) => (
          <article className="card" key={r.id}>
            {r.photo?.url && (
              <img
                className="feed-image"
                src={r.photo.url}
                alt={r.title}
                onError={(e) => {
                  e.currentTarget.src = '/assets/logo/logo.png';
                }}
              />
            )}

            <h2>{r.title}</h2>

            <p>{r.body}</p>

            {kind === 'shop' && (
              <p>
                <b>
                  UGX {Number(r.price || 0).toLocaleString()}
                </b>
              </p>
            )}

            {kind === 'library' && r.file?.url && (
              <a
                className="btn"
                href={r.file.url}
                target="_blank"
                rel="noreferrer"
              >
                Open / Download resource
              </a>
            )}

            {kind === 'events' && !canManage && (
              <button
                className="btn"
                onClick={() => register(r)}
              >
                Register as Interested
              </button>
            )}

            {canManage && (
              <button
                className="btn secondary"
                onClick={() => del(r)}
              >
                Delete
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}