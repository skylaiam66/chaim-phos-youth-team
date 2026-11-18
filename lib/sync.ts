import {
  getAll,
  putRaw,
  StoreName,
  setting,
  deleteRaw
} from './db';

import { supabase } from './supabase';

const stores: StoreName[] = [
  'profiles',
  'posts',
  'comments',
  'likes',
  'events',
  'projects',
  'shop',
  'library',
  'contributions',
  'bookings',
  'announcements',
  'slider',
  'stories',
  'officials',
  'chapters',
  'settings'
];

const table = (s: StoreName) => `${s}_text`;

const publicStores: StoreName[] = [
  'posts',
  'comments',
  'likes',
  'events',
  'projects',
  'shop',
  'library',
  'announcements',
  'slider',
  'stories',
  'officials',
  'chapters'
];

const mediaBuckets = [
  'homepage',
  'events',
  'projects',
  'shop',
  'library',
  'officials'
];

function isBrowserOnline() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.onLine
  );
}

function cloudPayload(row: any) {
  const payload = { ...row };

  const hasLocalPhoto = !!payload.photoData;
  const hasLocalAuthorPhoto = !!payload.authorPhotoData;

  delete payload.photoData;
  delete payload.profilePhoto;
  delete payload.localImage;
  delete payload.authorPhotoData;
  delete payload.sync_pending;

  if (hasLocalPhoto) {
    payload.hasLocalPhoto = true;
  }

  if (hasLocalAuthorPhoto) {
    payload.hasLocalAuthorPhoto = true;
  }

  return payload;
}

async function pullStore(
  store: StoreName,
  deleted: Set<string> = new Set()
) {
  if (!supabase) return;

  const { data, error } = await supabase
    .from(table(store))
    .select('id,payload,updated_at');

  if (error) {
    console.warn(
      `Could not pull ${store}:`,
      error.message
    );
    return;
  }

  const localRows = await getAll<any>(store);

  const byId = new Map(
    localRows.map(row => [String(row.id), row])
  );

  for (const remote of data || []) {
    if (deleted.has(`${store}:${remote.id}`)) {
      continue;
    }

    const local: any = byId.get(String(remote.id));

    // Never overwrite a local record waiting to sync.
    if (local?.sync_pending) {
      continue;
    }

    const remoteTime =
      Date.parse(
        remote.updated_at ||
        remote.payload?.updatedAt ||
        ''
      ) || 0;

    const localTime =
      Date.parse(local?.updatedAt || '') || 0;

    if (!local || remoteTime > localTime) {
      await putRaw(store, {
        ...remote.payload,
        id: remote.id,
        updatedAt:
          remote.updated_at ||
          remote.payload?.updatedAt,

        ...(local?.photoData
          ? { photoData: local.photoData }
          : {}),

        ...(local?.authorPhotoData
          ? {
              authorPhotoData:
                local.authorPhotoData
            }
          : {}),

        sync_pending: false
      });
    }
  }
}

export async function pushRow(
  store: StoreName,
  row: any
) {
  if (!supabase || !isBrowserOnline()) {
    return false;
  }

  const updatedAt =
    row.updatedAt ||
    new Date().toISOString();

  const { error } = await supabase
    .from(table(store))
    .upsert({
      id: String(row.id),
      payload: cloudPayload(row),
      updated_at: updatedAt
    });

  if (error) {
    throw error;
  }

  return true;
}

async function pushPendingDeletions() {
  if (!supabase) return;

  const tombstones = await getAll<any>('tombstones');

  for (const tomb of tombstones.filter(
    item => item.sync_pending
  )) {
    try {
      const { error: tombError } = await supabase
        .from('tombstones_text')
        .upsert({
          id: String(tomb.id),
          payload: cloudPayload(tomb),
          updated_at:
            tomb.updatedAt ||
            new Date().toISOString()
        });

      if (tombError) {
        throw tombError;
      }

      const { error: deleteError } = await supabase
        .from(table(tomb.store as StoreName))
        .delete()
        .eq('id', String(tomb.recordId));

      if (deleteError) {
        throw deleteError;
      }

      // Remove associated uploaded media when available.
      if (
        tomb.media?.bucket &&
        tomb.media?.path &&
        mediaBuckets.includes(tomb.media.bucket)
      ) {
        const { error: mediaError } =
          await supabase.storage
            .from(tomb.media.bucket)
            .remove([tomb.media.path]);

        if (mediaError) {
          console.warn(
            'Media cleanup pending:',
            mediaError.message
          );
        }
      }

      await putRaw('tombstones', {
        ...tomb,
        sync_pending: false
      });

    } catch (error) {
      console.warn(
        `Delete sync pending for ${tomb.id}`,
        error
      );
    }
  }
}

async function pullRemoteDeletions() {
  if (!supabase) {
    return new Set<string>();
  }

  const deleted = new Set<string>();

  const {
    data: remoteTombs,
    error
  } = await supabase
    .from('tombstones_text')
    .select('id,payload,updated_at');

  if (error) {
    console.warn(
      'Could not retrieve deletion records:',
      error.message
    );

    return deleted;
  }

  for (const remote of remoteTombs || []) {
    const tomb = {
      ...remote.payload,
      id: remote.id,
      updatedAt: remote.updated_at,
      sync_pending: false
    };

    const store = tomb.store as StoreName;

    if (stores.includes(store)) {
      await deleteRaw(
        store,
        tomb.recordId
      );

      deleted.add(
        `${tomb.store}:${tomb.recordId}`
      );
    }

    await putRaw('tombstones', tomb);
  }

  return deleted;
}

async function pushPendingRecords(
  deleted: Set<string>
) {
  for (const store of stores) {
    const rows = await getAll<any>(store);

    for (const row of rows) {
      if (!row.sync_pending) {
        continue;
      }

      if (
        store === 'settings' &&
        row.id !== 'whatsapp_number'
      ) {
        continue;
      }

      if (deleted.has(`${store}:${row.id}`)) {
        continue;
      }

      try {
        await pushRow(store, row);

        await putRaw(store, {
          ...row,
          sync_pending: false
        });

      } catch (error) {
        console.warn(
          `Sync pending for ${store}/${row.id}`,
          error
        );
      }
    }
  }
}

async function pullCloudRecords(
  deleted: Set<string>
) {
  if (!supabase) return;

  for (const store of stores) {
    const { data, error } = await supabase
      .from(table(store))
      .select('id,payload,updated_at');

    if (error) {
      console.warn(
        `Could not pull ${store}:`,
        error.message
      );

      continue;
    }

    const localRows = await getAll<any>(store);

    const byId = new Map(
      localRows.map(row => [String(row.id), row])
    );

    for (const remote of data || []) {
      // Only synchronise the approved public setting.
      if (
        store === 'settings' &&
        remote.id !== 'whatsapp_number'
      ) {
        continue;
      }

      if (
        deleted.has(`${store}:${remote.id}`)
      ) {
        continue;
      }

      const local: any = byId.get(String(remote.id));

      // Preserve local changes that have not synced.
      if (local?.sync_pending) {
        continue;
      }

      const remoteTime =
        Date.parse(
          remote.updated_at ||
          remote.payload?.updatedAt ||
          ''
        ) || 0;

      const localTime =
        Date.parse(local?.updatedAt || '') || 0;

      if (!local || remoteTime > localTime) {
        await putRaw(store, {
          ...remote.payload,
          id: remote.id,
          updatedAt:
            remote.updated_at ||
            remote.payload?.updatedAt,

          ...(local?.photoData
            ? { photoData: local.photoData }
            : {}),

          ...(local?.authorPhotoData
            ? {
                authorPhotoData:
                  local.authorPhotoData
              }
            : {}),

          sync_pending: false
        });
      }
    }
  }
}

async function syncPublicRecords() {
  if (!supabase) {
    return {
      ok: false,
      configured: false
    };
  }

  const {
    data: remoteTombs,
    error
  } = await supabase
    .from('tombstones_text')
    .select('id,payload,updated_at');

  const deleted = new Set<string>();

  if (!error) {
    for (const remote of remoteTombs || []) {
      const tomb = {
        ...remote.payload,
        id: remote.id,
        updatedAt: remote.updated_at,
        sync_pending: false
      };

      if (
        publicStores.includes(
          tomb.store as StoreName
        )
      ) {
        deleted.add(
          `${tomb.store}:${tomb.recordId}`
        );

        await deleteRaw(
          tomb.store as StoreName,
          tomb.recordId
        );
      }

      await putRaw('tombstones', tomb);
    }
  }

  for (const store of publicStores) {
    await pullStore(store, deleted);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new Event('cp-data-change')
    );
  }

  return {
    ok: true,
    publicOnly: true
  };
}

export async function syncNow() {
  if (!isBrowserOnline()) {
    return {
      ok: false,
      offline: true
    };
  }

  if (!supabase) {
    return {
      ok: false,
      configured: false
    };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  // Public visitors can download public content,
  // including active chapters.
  if (!session) {
    return syncPublicRecords();
  }

  // 1. Push pending deletions.
  await pushPendingDeletions();

  // 2. Apply remote deletions locally.
  const deleted = await pullRemoteDeletions();

  // 3. Push local pending changes.
  await pushPendingRecords(deleted);

  // 4. Pull newer cloud records.
  await pullCloudRecords(deleted);

  // 5. Record successful sync time.
  await setting(
    'last_sync_at',
    new Date().toISOString()
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new Event('cp-data-change')
    );
  }

  return {
    ok: true
  };
}

export function startSync() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const run = () => {
    syncNow().catch(error => {
      console.warn('Sync error:', error);
    });
  };

  window.addEventListener('online', run);

  // Initial synchronisation.
  run();

  // Automatic synchronisation every 30 seconds.
  const timer = window.setInterval(
    run,
    30000
  );

  return () => {
    window.removeEventListener('online', run);
    window.clearInterval(timer);
  };
}