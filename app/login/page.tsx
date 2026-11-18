'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import {
  loginMember,
  registerMember
} from '@/lib/auth';

import {
  compressLocalImage,
  blobToDataUrl
} from '@/lib/media';

import { getAll } from '@/lib/db';
import { supabase } from '@/lib/supabase';

type Chapter = {
  id: string;
  name: string;
  location?: string;
  district?: string;
  active?: boolean;
};

export default function Login() {
  const [register, setRegister] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [online, setOnline] = useState(true);

  const [photo, setPhoto] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [email, setEmail] = useState('');

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState('');

  // Load active chapters from the local database.
  // The local database is kept in sync with Supabase.
  async function loadChapters() {
    setChaptersLoading(true);
    setChaptersError('');

    try {
      const records = await getAll<Chapter>('chapters');

      const activeChapters = records
        .filter(chapter => chapter.active !== false)
        .filter(chapter => chapter.name?.trim())
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      setChapters(activeChapters);
    } catch (error: any) {
      console.error('Unable to load chapters:', error);

      setChaptersError(
        'Unable to load chapters. Please refresh the page and try again.'
      );
    } finally {
      setChaptersLoading(false);
    }
  }

  useEffect(() => {
    loadChapters();

    const { data: listener } =
      supabase?.auth.onAuthStateChange(event => {
        if (event === 'PASSWORD_RECOVERY') {
          setRecovery(true);
        }
      }) || { data: { subscription: null } };

    const updateOnlineStatus = () => {
      setOnline(navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Refresh chapters when the Director's changes sync locally.
    const refreshChapters = () => {
      loadChapters();
    };

    window.addEventListener('cp-data-change', refreshChapters);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);

      window.removeEventListener(
        'cp-data-change',
        refreshChapters
      );

      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function submit(e: any) {
    e.preventDefault();

    setBusy(true);
    setMsg('');

    const f = new FormData(e.currentTarget);

    const submittedEmail = String(
      f.get('email') || ''
    ).trim();

    try {
      if (register) {
        if (chaptersLoading) {
          throw new Error(
            'Please wait while chapters are loading.'
          );
        }

        if (chapters.length === 0) {
          throw new Error(
            'Registration is currently unavailable because no active chapters have been created. Please contact the Director.'
          );
        }

        const selectedChapter = String(
          f.get('chapter') || ''
        );

        const chapterExists = chapters.some(
          chapter => chapter.name === selectedChapter
        );

        if (!chapterExists) {
          throw new Error(
            'Please select a valid active chapter.'
          );
        }

        await registerMember({
          fullName: f.get('fullName'),
          phone: f.get('phone'),
          email: submittedEmail,
          password: f.get('password'),
          chapter: selectedChapter,
          birthday: f.get('birthday'),
          photoData: photo || null
        });
      } else {
        await loginMember(
          submittedEmail,
          String(f.get('password'))
        );
      }

      window.dispatchEvent(
        new Event('cp-user-change')
      );

      location.href = '/';
    } catch (err: any) {
      setMsg(
        err.message || 'Unable to continue.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!supabase) {
      setMsg('Supabase is not connected.');
      return;
    }

    if (!email.trim()) {
      setMsg(
        'Enter your registered email address first.'
      );
      return;
    }

    setResending(true);
    setMsg('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim()
      });

      if (error) throw error;

      setMsg(
        'A new confirmation email has been requested. Check your inbox and Spam folder.'
      );
    } catch (err: any) {
      setMsg(
        err.message ||
        'Unable to resend confirmation email.'
      );
    } finally {
      setResending(false);
    }
  }

  async function choose(file: File) {
    try {
      const compressed = await compressLocalImage(file);

      setPhoto(
        await blobToDataUrl(compressed)
      );
    } catch (e: any) {
      setMsg(
        e.message || 'Unable to process profile photo.'
      );
    }
  }

  async function updatePassword() {
    if (!supabase) {
      setMsg('Supabase is not connected.');
      return;
    }

    if (newPassword.length < 8) {
      setMsg(
        'Use a password with at least 8 characters.'
      );
      return;
    }

    setBusy(true);
    setMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setRecovery(false);
      setNewPassword('');

      setMsg(
        'Password updated. You can now continue.'
      );
    } catch (err: any) {
      setMsg(
        err.message || 'Unable to update password.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">

        {/* Online / Offline indicator */}
        <div
          className={
            'dot ' + (online ? 'online' : 'offline')
          }
          title={online ? 'Online' : 'Offline'}
        />

        {/* Club logo */}
        <img
          src="/assets/logo/logo.png"
          alt="CHAIM PHOS"
          style={{
            width: 82,
            height: 82,
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto'
          }}
        />

        <h1 style={{ textAlign: 'center' }}>
          CHAIM PHOS
        </h1>

        <p
          className="muted"
          style={{ textAlign: 'center' }}
        >
          Youth Team community
        </p>

        {/* Password recovery */}
        {recovery ? (
          <>
            <h2>Set a new password</h2>

            <label>New Password</label>

            <input
              className="field"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={e =>
                setNewPassword(e.target.value)
              }
              placeholder="New password"
              autoComplete="new-password"
            />

            <button
              className="btn"
              onClick={updatePassword}
              disabled={busy}
              style={{ width: '100%' }}
            >
              {busy
                ? 'Updating…'
                : 'Update password'}
            </button>

            {msg && (
              <p
                role="alert"
                style={{
                  color: '#ff9a9a',
                  marginTop: 12
                }}
              >
                {msg}
              </p>
            )}
          </>
        ) : (
          <>
            <form onSubmit={submit}>

              {/* Registration fields */}
              {register && (
                <>
                  <label>Full Name</label>

                  <input
                    className="field"
                    name="fullName"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />

                  <label>Phone</label>

                  <input
                    className="field"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    required
                  />

                  {/* Director-managed chapters */}
                  <label>Chapter</label>

                  <select
                    className="field"
                    name="chapter"
                    required
                    defaultValue=""
                    disabled={
                      chaptersLoading ||
                      chapters.length === 0
                    }
                  >
                    <option value="" disabled>
                      {chaptersLoading
                        ? 'Loading chapters…'
                        : chapters.length === 0
                          ? 'No active chapters available'
                          : 'Select your chapter'}
                    </option>

                    {chapters.map(chapter => (
                      <option
                        key={chapter.id}
                        value={chapter.name}
                      >
                        {chapter.name}
                        {chapter.location
                          ? ` — ${chapter.location}`
                          : chapter.district
                            ? ` — ${chapter.district}`
                            : ''}
                      </option>
                    ))}
                  </select>

                  {chaptersLoading && (
                    <p className="muted">
                      Loading available chapters…
                    </p>
                  )}

                  {!chaptersLoading &&
                    chapters.length === 0 && (
                      <div
                        style={{
                          padding: 12,
                          marginTop: 8,
                          marginBottom: 12,
                          borderRadius: 8,
                          background: 'rgba(255,165,0,0.12)',
                          border: '1px solid rgba(255,165,0,0.4)'
                        }}
                      >
                        <strong>
                          No active chapters yet.
                        </strong>

                        <p className="muted">
                          The Director must create and
                          activate at least one chapter
                          before new members can register.
                        </p>
                      </div>
                    )}

                  {chaptersError && (
                    <p
                      role="alert"
                      style={{
                        color: '#ff9a9a',
                        marginTop: 8
                      }}
                    >
                      {chaptersError}
                    </p>
                  )}

                  <label>Birthday</label>

                  <input
                    className="field"
                    type="date"
                    name="birthday"
                  />

                  <label>
                    Profile photo (stored on this device only)
                  </label>

                  <input
                    className="field"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];

                      if (file) {
                        choose(file);
                      }
                    }}
                  />

                  {photo && (
                    <img
                      className="avatar"
                      src={photo}
                      alt="Profile preview"
                    />
                  )}
                </>
              )}

              {/* Email */}
              <label>Email</label>

              <input
                className="field"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={e =>
                  setEmail(e.target.value)
                }
              />

              {/* Password */}
              <label>Password</label>

              <input
                className="field"
                type="password"
                name="password"
                minLength={8}
                autoComplete={
                  register
                    ? 'new-password'
                    : 'current-password'
                }
                required
              />

              {/* Submit */}
              <button
                className="btn"
                style={{ width: '100%' }}
                disabled={
                  busy ||
                  (
                    register &&
                    (
                      chaptersLoading ||
                      chapters.length === 0 ||
                      !!chaptersError
                    )
                  )
                }
              >
                {busy
                  ? 'Please wait…'
                  : register
                    ? 'Create account'
                    : 'Login'}
              </button>
            </form>

            {/* Messages */}
            {msg && (
              <p
                role="alert"
                style={{
                  color: '#ff9a9a',
                  marginTop: 12
                }}
              >
                {msg}
              </p>
            )}

            {/* Resend confirmation */}
            {!register && (
              <div
                style={{
                  marginTop: 14,
                  textAlign: 'center'
                }}
              >
                <p className="muted">
                  Have not received your confirmation email?
                </p>

                <button
                  type="button"
                  className="btn secondary"
                  onClick={resendConfirmation}
                  disabled={resending}
                >
                  {resending
                    ? 'Sending…'
                    : 'Resend Confirmation Email'}
                </button>
              </div>
            )}

            {/* Switch login / registration */}
            <p
              style={{
                textAlign: 'center',
                marginTop: 16
              }}
            >
              {register
                ? 'Already registered?'
                : 'New here?'}{' '}

              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setRegister(!register);
                  setMsg('');
                  setPhoto('');
                }}
              >
                {register ? 'Login' : 'Register'}
              </button>
            </p>

            <Link
              href="/"
              className="muted"
            >
              Continue to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}