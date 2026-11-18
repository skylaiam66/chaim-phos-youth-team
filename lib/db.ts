import {
  openDB,
  DBSchema,
  IDBPDatabase
} from 'idb';

export type StoreName =
  | 'profiles'
  | 'posts'
  | 'comments'
  | 'likes'
  | 'events'
  | 'projects'
  | 'shop'
  | 'library'
  | 'contributions'
  | 'bookings'
  | 'announcements'
  | 'slider'
  | 'stories'
  | 'officials'
  | 'chapters'
  | 'settings'
  | 'media'
  | 'tombstones';

interface CPDB extends DBSchema {
  profiles: { key: string; value: any };
  posts: { key: string; value: any };
  comments: { key: string; value: any };
  likes: { key: string; value: any };
  events: { key: string; value: any };
  projects: { key: string; value: any };
  shop: { key: string; value: any };
  library: { key: string; value: any };
  contributions: { key: string; value: any };
  bookings: { key: string; value: any };
  announcements: { key: string; value: any };
  slider: { key: string; value: any };
  stories: { key: string; value: any };
  officials: { key: string; value: any };
  chapters: { key: string; value: any };
  settings: { key: string; value: any };
  media: { key: string; value: any };
  tombstones: { key: string; value: any };
}

const DB_NAME = 'chaim-phos-db';
const DB_VERSION = 4;

const names: StoreName[] = [
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
  'settings',
  'media',
  'tombstones'
];

let dbPromise: Promise<IDBPDatabase<CPDB>> | null = null;

/**
 * Open the local IndexedDB database.
 * Existing records are preserved during database upgrades.
 */
export function db(): Promise<IDBPDatabase<CPDB>> {
  if (typeof window === 'undefined') {
    throw new Error(
      'Local database is available in the browser.'
    );
  }

  if (!dbPromise) {
    dbPromise = openDB<CPDB>(
      DB_NAME,
      DB_VERSION,
      {
        upgrade(database) {
          names.forEach(name => {
            if (
              !database.objectStoreNames.contains(name)
            ) {
              database.createObjectStore(name, {
                keyPath: 'id'
              });
            }
          });
        },

        blocked() {
          console.warn(
            'Database upgrade is blocked. Close other open CHAIM PHOS tabs.'
          );
        },

        blocking() {
          dbPromise = null;
        },

        terminated() {
          dbPromise = null;
          console.error(
            'CHAIM PHOS local database connection terminated.'
          );
        }
      }
    );
  }

  return dbPromise;
}

/**
 * Get all records from a store.
 */
export async function getAll<T = any>(
  store: StoreName
): Promise<T[]> {
  const database = await db();

  return database.getAll(store) as Promise<T[]>;
}

/**
 * Get one record by ID.
 */
export async function getOne<T = any>(
  store: StoreName,
  id: string
): Promise<T | undefined> {
  const database = await db();

  return database.get(store, id) as Promise<
    T | undefined
  >;
}

/**
 * Save a record locally and mark it for synchronization.
 */
export async function save<T extends { id: string }>(
  store: StoreName,
  row: T
): Promise<T> {
  const value = {
    ...row,
    updatedAt: new Date().toISOString(),
    sync_pending: true
  };

  const database = await db();

  await database.put(store, value as any);

  window.dispatchEvent(
    new Event('cp-data-change')
  );

  return value;
}

/**
 * Save a record without marking it as pending.
 * Used when receiving records from the cloud.
 */
export async function putRaw<T extends { id: string }>(
  store: StoreName,
  row: T
): Promise<T> {
  const database = await db();

  await database.put(store, row as any);

  window.dispatchEvent(
    new Event('cp-data-change')
  );

  return row;
}

/**
 * Permanently delete a local record without creating
 * a synchronization tombstone.
 */
export async function deleteRaw(
  store: StoreName,
  id: string
): Promise<void> {
  const database = await db();

  await database.delete(store, id);

  window.dispatchEvent(
    new Event('cp-data-change')
  );
}

/**
 * Delete a record and create a tombstone so the deletion
 * can synchronize with Supabase.
 */
export async function remove(
  store: StoreName,
  id: string
): Promise<void> {
  const database = await db();

  const actorId = await setting('session_user_id');

  const oldRow: any = await database.get(
    store,
    id
  );

  if (
    store !== 'settings' &&
    store !== 'media' &&
    store !== 'tombstones' &&
    actorId
  ) {
    const tombstone = {
      id: `${store}:${id}`,
      store,
      recordId: id,
      actorId,
      media:
        oldRow?.photo ||
        oldRow?.file ||
        null,
      updatedAt: new Date().toISOString(),
      sync_pending: true
    };

    await database.put(
      'tombstones',
      tombstone
    );
  }

  await database.delete(store, id);

  window.dispatchEvent(
    new Event('cp-data-change')
  );
}

/**
 * Read or update application settings.
 */
export async function setting(
  key: string,
  value?: any
): Promise<any> {
  const database = await db();

  // Read setting.
  if (value === undefined) {
    const row: any = await database.get(
      'settings',
      key
    );

    return row?.value;
  }

  // Save setting.
  await database.put('settings', {
    id: key,
    value,
    updatedAt: new Date().toISOString(),
    sync_pending: key === 'whatsapp_number'
  });

  return value;
}