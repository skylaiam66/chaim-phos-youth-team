import { supabase } from './supabase';
import { getOne, save, setting, putRaw } from './db';

function isDirectorUser(user: any): boolean {
  return user?.app_metadata?.role === 'Director';
}

export async function currentUser() {
  const cachedId = await setting('session_user_id');

  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine &&
    cachedId
  ) {
    return (await getOne<any>('profiles', cachedId)) || null;
  }

  if (!supabase) {
    return cachedId
      ? (await getOne<any>('profiles', cachedId)) || null
      : null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUser = session?.user;
  const id = authUser?.id || cachedId;

  if (!id) return null;

  const cached = await getOne<any>('profiles', id);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return cached || null;
  }

  const isDirector = isDirectorUser(authUser);

  const { data, error } = await supabase
    .from('profiles_text')
    .select('payload,updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn('Profile loading:', error.message);
  }

  if (data?.payload) {
    const profile = {
      ...cached,
      ...data.payload,
      id,
      role: isDirector
        ? 'Director'
        : (data.payload.role || cached?.role || 'Member'),
      isDirector,
      updatedAt: data.updated_at || data.payload.updatedAt,
      sync_pending: false,
    };

    await putRaw('profiles', profile);
    await setting('session_user_id', id);

    return profile;
  }

  if (cached) {
    const profile = {
      ...cached,
      id,
      role: isDirector
        ? 'Director'
        : (cached.role || 'Member'),
      isDirector,
    };

    await putRaw('profiles', profile);
    return profile;
  }

  return null;
}

export async function registerMember(input: any) {
  if (!supabase) {
    throw new Error('Connect Supabase before registering.');
  }

  const email = String(input.email || '')
    .trim()
    .toLowerCase();

  const password = String(input.password || '');

  if (password.length < 8) {
    throw new Error('Use a password with at least 8 characters.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone || '',
        chapter: input.chapter || 'Kigezi',
        birthday: input.birthday || '',
      },
    },
  });

  if (error) throw error;

  if (!data.user) {
    throw new Error('Registration could not be completed.');
  }

  const row = {
    id: data.user.id,
    fullName: String(input.fullName).trim(),
    phone: String(input.phone || ''),
    email,
    chapter: input.chapter || 'Kigezi',
    birthday: input.birthday || '',
    role: 'Member',
    isDirector: false,
    membershipType: 'Member',
    paid: false,
    photoData: input.photoData || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sync_pending: true,
  };

  await save('profiles', row);

  if (data.session) {
    await setting('session_user_id', row.id);
  }

  if (!data.session) {
    throw new Error(
      'Account created. Check your email to confirm it, then log in.'
    );
  }

  const cloudProfile: any = {
    ...row,
    sync_pending: false,
  };

  delete cloudProfile.photoData;

  const { error: profileError } = await supabase
    .from('profiles_text')
    .upsert({
      id: row.id,
      payload: cloudProfile,
      updated_at: row.updatedAt,
    });

  if (profileError) {
    console.warn(
      'Profile sync pending:',
      profileError.message
    );
  }

  return row;
}

export async function loginMember(
  email: string,
  password: string
) {
  const normalized = email.trim().toLowerCase();

  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add the project URL and anon key.'
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) throw error;

  const id = data.user.id;

  // Director permission comes from Supabase Auth app_metadata.
  const isDirector = isDirectorUser(data.user);

  await setting('session_user_id', id);

  const {
    data: remote,
    error: profileError,
  } = await supabase
    .from('profiles_text')
    .select('payload,updated_at')
    .eq('id', id)
    .maybeSingle();

  if (profileError) throw profileError;

  const cached = await getOne<any>('profiles', id);

  const profilePayload =
    remote?.payload || {
      id,
      fullName:
        data.user.user_metadata?.full_name ||
        cached?.fullName ||
        'CHAIM PHOS Member',

      phone:
        data.user.user_metadata?.phone ||
        cached?.phone ||
        '',

      email: normalized,

      chapter:
        data.user.user_metadata?.chapter ||
        cached?.chapter ||
        'Kigezi',

      birthday:
        data.user.user_metadata?.birthday ||
        cached?.birthday ||
        '',

      role: 'Member',
      membershipType: 'Member',
      paid: false,
      createdAt: new Date().toISOString(),
    };

  const row = {
    ...cached,
    ...profilePayload,

    id,

    // Never allow a normal profile record to override
    // the Director permission granted by Supabase Auth.
    role: isDirector
      ? 'Director'
      : (profilePayload.role || cached?.role || 'Member'),

    isDirector,

    ...(cached?.photoData
      ? { photoData: cached.photoData }
      : {}),

    updatedAt:
      remote?.updated_at ||
      profilePayload.updatedAt ||
      new Date().toISOString(),

    sync_pending: !remote?.payload,
  };

  await putRaw('profiles', row);

  if (!remote?.payload) {
    const cloudProfile: any = {
      ...row,
      sync_pending: false,
    };

    delete cloudProfile.photoData;

    const {
      error: insertError,
    } = await supabase
      .from('profiles_text')
      .upsert({
        id,
        payload: cloudProfile,
        updated_at: row.updatedAt,
      });

    if (insertError) throw insertError;
  }

  return row;
}

export async function logout() {
  try {
    if (supabase) {
      const { error } = await supabase.auth.signOut({
        scope: 'local',
      });

      if (error) {
        console.warn('Sign-out:', error.message);
      }
    }
  } finally {
    // Only clear the active session.
    // Do not delete the user's local IndexedDB data.
    await setting('session_user_id', null);
  }
}