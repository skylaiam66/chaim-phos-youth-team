'use client';

import { useEffect, useState } from 'react';

import {
  getAll,
  save,
  setting,
  remove,
} from '@/lib/db';

import { currentUser } from '@/lib/auth';

import {
  compressLocalImage,
  blobToDataUrl,
} from '@/lib/media';

import { supabase } from '@/lib/supabase';

import VerifiedBadge from '@/components/VerifiedBadge';


function getName(person: any) {
  return (
    person?.fullName ||
    person?.full_name ||
    person?.name ||
    person?.authorName ||
    'CHAIM PHOS member'
  );
}


function getChapter(person: any) {
  return (
    person?.chapter ||
    person?.chapterName ||
    person?.authorChapter ||
    'Chapter not specified'
  );
}


function getMembership(person: any) {
  const value =
    person?.membershipType ||
    person?.membership_type ||
    person?.membership ||
    person?.classification ||
    person?.authorMembershipType ||
    '';

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'official') return 'Official';
  if (normalized === 'member') return 'Member';

  return '';
}


function isPaid(person: any) {
  if (!person) return false;

  const values = [
    person.paid,
    person.isPaid,
    person.authorPaid,
    person.membershipPaid,
    person.paymentStatus,
  ];

  return values.some((value) => {
    if (value === true || value === 1) return true;

    if (typeof value === 'string') {
      return ['true', 'paid', 'yes', '1'].includes(
        value.trim().toLowerCase()
      );
    }

    return false;
  });
}


function getPosition(person: any) {
  return (
    person?.position ||
    person?.officialPosition ||
    person?.title ||
    person?.designation ||
    person?.authorPosition ||
    person?.authorTitle ||
    ''
  );
}


/*
 * The public directory is authoritative for current
 * membership classification and payment status.
 *
 * Old posts and comments are only used as fallbacks
 * when no public directory record exists.
 */

function UserIdentity({
  person,
  profiles = [],
  publicProfiles = [],
}: {
  person: any;
  profiles?: any[];
  publicProfiles?: any[];
}) {

  const authorId = String(person?.authorId || '');

  const publicProfile = publicProfiles.find(
    (item) => String(item.id) === authorId
  );

  const localProfile = profiles.find(
    (item) => String(item.id) === authorId
  );

  const identity = {

    ...person,

    ...localProfile,

    ...person,

    fullName:
      publicProfile?.full_name ||
      person?.authorName ||
      person?.fullName ||
      person?.name ||
      localProfile?.fullName ||
      localProfile?.name,

    chapter:
      publicProfile?.chapter ||
      person?.authorChapter ||
      person?.chapter ||
      localProfile?.chapter,

    membershipType:
      publicProfile?.membership_type ||
      person?.authorMembershipType ||
      person?.membershipType ||
      person?.membership ||
      localProfile?.membershipType ||
      localProfile?.membership,

    position:
      publicProfile?.position ||
      person?.authorPosition ||
      person?.position ||
      person?.authorTitle ||
      person?.title ||
      localProfile?.position ||
      localProfile?.officialPosition ||
      localProfile?.title ||
      localProfile?.designation,

  };

  const name = getName(identity);

  const chapter = getChapter(identity);

  const membership = getMembership(identity);

  const position = getPosition(identity);


  /*
   * The public directory is authoritative.
   * Accept Boolean, numeric and string representations
   * of the paid status.
   */

  const paid = publicProfile
    ? isPaid(publicProfile)
    : localProfile
      ? isPaid(localProfile)
      : isPaid(person);


  return (

    <div className="community-user-identity">

      <div className="community-user-name">

        <strong>{name}</strong>

        {paid && <VerifiedBadge />}

        {membership === 'Member' && (
          <span
            className="badge-dot member-dot"
            title="Member"
          />
        )}

        {membership === 'Official' && (
          <span
            className="badge-dot official-dot"
            title="Official"
          />
        )}

      </div>


      <div className="community-user-details">

        <span className="community-user-chapter">
          Chapter: {chapter}
        </span>

        {position && (
          <span className="community-user-position">
            Role: {position}
          </span>
        )}

        {!membership && (
          <span className="community-user-classification">
            Classification not assigned
          </span>
        )}

      </div>

    </div>

  );

}


export default function Community() {

  const [posts, setPosts] = useState<any[]>([]);

  const [likes, setLikes] = useState<any[]>([]);

  const [comments, setComments] = useState<any[]>([]);

  const [stories, setStories] = useState<any[]>([]);

  const [profiles, setProfiles] = useState<any[]>([]);

  const [publicProfiles, setPublicProfiles] = useState<any[]>([]);

  const [user, setUser] = useState<any>(null);

  const [text, setText] = useState('');

  const [photo, setPhoto] = useState('');

  const [comment, setComment] = useState<Record<string, string>>({});

  const [savedIds, setSavedIds] = useState<string[]>([]);

  const [activeStory, setActiveStory] = useState<any>(null);

  const [busy, setBusy] = useState(false);


  async function load() {

    try {

      const [
        p,
        c,
        s,
        u,
        sv,
        l,
        allProfiles,
      ] = await Promise.all([

        getAll<any>('posts'),

        getAll<any>('comments'),

        getAll<any>('stories'),

        currentUser(),

        setting('saved_posts'),

        getAll<any>('likes'),

        getAll<any>('profiles'),

      ]);


      /*
       * Load the public identity directory.
       * This is readable by anonymous and authenticated
       * visitors according to the SQL policy.
       */

      let directory: any[] = [];

      if (supabase) {

        const { data, error } = await supabase
          .from('cp_public_profiles')
          .select(
            'id,full_name,chapter,membership_type,position,paid,updated_at'
          );

        if (error) {

          console.warn(
            'Public identity directory:',
            error.message
          );

        } else {

          directory = data || [];

        }

      }


      setLikes(l);

      setProfiles(allProfiles);

      setPublicProfiles(directory);

      setUser(u);


      setPosts(

        p.map((post) => ({

          ...post,

          likes: l.filter(
            (item) =>
              item.postId === post.id &&
              item.liked
          ).length,

          likedByMe: !!l.find(
            (item) =>
              item.postId === post.id &&
              item.userId === u?.id &&
              item.liked
          ),

        })).sort(

          (a, b) =>
            Number(!!b.pinned) -
            Number(!!a.pinned) ||
            String(b.createdAt).localeCompare(
              String(a.createdAt)
            )

        )

      );


      setComments(c);


      setStories(

        s.sort(
          (a, b) =>
            String(b.createdAt).localeCompare(
              String(a.createdAt)
            )
        )

      );


      setSavedIds(sv || []);

    } catch (error) {

      console.error('Community loading failed:', error);

    }

  }


  useEffect(() => {

    load();

    const handler = () => load();

    const refresh = () => load();

    window.addEventListener('cp-data-change', handler);

    window.addEventListener('focus', refresh);

    /*
     * Refresh the public directory periodically so visitors
     * see changes made by the Director without signing in.
     */

    const timer = window.setInterval(load, 30000);

    return () => {

      window.removeEventListener('cp-data-change', handler);

      window.removeEventListener('focus', refresh);

      window.clearInterval(timer);

    };

  }, []);


  function createIdentitySnapshot(person: any) {

    return {

      authorId: person.id,

      authorName: getName(person),

      authorPhotoData: person.photoData || null,

      authorChapter: getChapter(person),

      authorMembershipType: getMembership(person),

      authorPaid: isPaid(person),

      authorPosition: getPosition(person),

      authorRole: person.role || '',

    };

  }


  async function pickPhoto(file: File) {

    try {

      const blob = await compressLocalImage(file);

      setPhoto(await blobToDataUrl(blob));

    } catch (error: any) {

      alert(error.message);

    }

  }


  async function publish() {

    if (!user) {

      location.href = '/login';

      return;

    }

    if (!text.trim() && !photo) return;

    setBusy(true);

    try {

      const identity = createIdentitySnapshot(user);

      await save('posts', {

        id: crypto.randomUUID(),

        ...identity,

        text: text.trim(),

        photoData: photo || null,

        likes: [],

        pinned: false,

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString(),

      });


      setText('');

      setPhoto('');

      await load();

    } finally {

      setBusy(false);

    }

  }


  async function like(post: any) {

    if (!user) {

      location.href = '/login';

      return;

    }

    const id = `${post.id}:${user.id}`;

    const existing = likes.find(
      (item) => item.id === id
    );

    await save('likes', {

      id,

      postId: post.id,

      userId: user.id,

      liked: !existing?.liked,

      updatedAt: new Date().toISOString(),

    });

    await load();

  }


  async function addComment(post: any) {

    if (!user) {

      location.href = '/login';

      return;

    }

    const value = (comment[post.id] || '').trim();

    if (!value) return;

    const identity = createIdentitySnapshot(user);

    await save('comments', {

      id: crypto.randomUUID(),

      postId: post.id,

      ...identity,

      text: value,

      createdAt: new Date().toISOString(),

    });


    setComment((previous) => ({

      ...previous,

      [post.id]: '',

    }));


    await load();

  }


  async function addStory(file: File) {

    if (!user) return;

    try {

      const blob = await compressLocalImage(file);

      const data = await blobToDataUrl(blob);

      const identity = createIdentitySnapshot(user);

      await save('stories', {

        id: crypto.randomUUID(),

        ...identity,

        photoData: data,

        createdAt: new Date().toISOString(),

        expiresAt: Date.now() + 86400000,

      });

      await load();

    } catch (error: any) {

      alert(error.message);

    }

  }


  async function deletePost(post: any) {

    if (
      post.authorId !== user?.id &&
      user?.role !== 'Director'
    ) return;

    if (!confirm('Delete this post?')) return;

    await remove('posts', post.id);

    if (supabase) {

      const { error } = await supabase
        .from('posts_text')
        .delete()
        .eq('id', post.id);

      if (error) {
        console.warn('Post deletion:', error.message);
      }

    }

    await load();

  }


  async function deleteComment(item: any) {

    if (
      item.authorId !== user?.id &&
      user?.role !== 'Director'
    ) return;

    if (!confirm('Delete this comment?')) return;

    await remove('comments', item.id);

    if (supabase) {

      const { error } = await supabase
        .from('comments_text')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.warn('Comment deletion:', error.message);
      }

    }

    await load();

  }


  async function toggleSaved(id: string) {

    const next = savedIds.includes(id)

      ? savedIds.filter((item) => item !== id)

      : [...savedIds, id];


    setSavedIds(next);

    await setting('saved_posts', next);

  }


  return (

    <div className="main">

      <h1 className="section-title">
        Community
      </h1>


      {/* STORIES */}

      <div className="story-row">

        <label className="story">

          <img
            src={user?.photoData || '/assets/logo/logo.png'}
            alt="Add story"
          />

          <span>Your story +</span>

          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(event) =>
              event.target.files?.[0] &&
              addStory(event.target.files[0])
            }
          />

        </label>


        {stories

          .filter(
            (story) =>
              !story.expiresAt ||
              story.expiresAt > Date.now()
          )

          .map((story) => (

            <button
              className="story story-button"
              key={story.id}
              onClick={() => setActiveStory(story)}
            >

              <img
                src={
                  story.photoData ||
                  '/assets/logo/logo.png'
                }
                alt={story.authorName}
              />

              <span>{story.authorName}</span>

            </button>

          ))}

      </div>


      {/* CREATE POST */}

      <section className="card community-composer">

        <h3>Create a post</h3>

        <textarea
          className="field"
          rows={3}
          placeholder="Share something with the community…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(event) =>
            event.target.files?.[0] &&
            pickPhoto(event.target.files[0])
          }
        />

        {photo && (

          <img
            src={photo}
            className="feed-image"
            alt="Post preview"
          />

        )}

        <button
          className="btn"
          disabled={busy}
          onClick={publish}
        >

          {busy ? 'Posting…' : 'Post'}

        </button>

        <small className="muted">

          Member photos and stories are saved only on this device.
          Other devices show the CP logo when no local photo exists.

        </small>

      </section>


      {/* COMMUNITY POSTS */}

      {posts.map((post) => (

        <article
          className="card feed-card"
          key={post.id}
          onDoubleClick={() => like(post)}
        >

          <div className="feed-author">

            <img
              className="avatar"
              src={
                post.authorPhotoData ||
                '/assets/logo/logo.png'
              }
              alt=""
            />

            <div className="feed-author-information">

              <UserIdentity
                person={post}
                profiles={profiles}
                publicProfiles={publicProfiles}
              />

              <div className="muted">

                {new Date(post.createdAt).toLocaleString()}

              </div>

              {post.pinned && (

                <span className="muted">
                  · Pinned
                </span>

              )}

            </div>

          </div>


          {post.text && <p>{post.text}</p>}


          {post.photoData ? (

            <img
              className="feed-image"
              src={post.photoData}
              alt="Community post"
            />

          ) : post.hasLocalPhoto ? (

            <img
              className="feed-image"
              src="/assets/logo/logo.png"
              alt="Member photo is stored on its original device"
            />

          ) : null}


          {/* POST ACTIONS */}

          <div className="feed-actions">

            <button
              className="btn secondary"
              onClick={() => like(post)}
            >

              {post.likedByMe ? '♥' : '♡'}

              {' '}

              Like ({post.likes || 0})

            </button>


            <button
              className="btn secondary"
              onClick={() => toggleSaved(post.id)}
            >

              {savedIds.includes(post.id) ? 'Saved' : 'Save'}

            </button>


            {(post.authorId === user?.id ||
              user?.role === 'Director') && (

              <button
                className="btn secondary"
                onClick={() => deletePost(post)}
              >

                Delete

              </button>

            )}


            <button
              className="btn secondary"
              onClick={() =>

                navigator.share

                  ? navigator.share({

                      title: 'CHAIM PHOS',

                      text: post.text,

                      url: location.href,

                    })

                  : navigator.clipboard.writeText(location.href)

              }
            >

              Share

            </button>

          </div>


          {/* COMMENTS */}

          <div className="comments">

            {comments

              .filter((item) => item.postId === post.id)

              .map((item) => (

                <div
                  className="community-comment"
                  key={item.id}
                >

                  <div className="community-comment-identity">

                    <UserIdentity
                      person={item}
                      profiles={profiles}
                      publicProfiles={publicProfiles}
                    />

                  </div>

                  <p>{item.text}</p>


                  {(item.authorId === user?.id ||
                    user?.role === 'Director') && (

                    <button
                      className="text-action"
                      onClick={() => deleteComment(item)}
                    >

                      Delete

                    </button>

                  )}

                </div>

              ))}


            <div className="comment-form">

              <input
                className="field"
                placeholder="Write a comment…"
                value={comment[post.id] || ''}
                onChange={(event) =>

                  setComment((previous) => ({

                    ...previous,

                    [post.id]: event.target.value,

                  }))

                }
              />


              <button
                className="btn"
                onClick={() => addComment(post)}
              >

                Send

              </button>

            </div>

          </div>

        </article>

      ))}


      {/* STORY VIEWER */}

      {activeStory && (

        <div
          className="story-overlay"
          onClick={() => setActiveStory(null)}
        >

          <article
            className="story-viewer"
            onClick={(event) => event.stopPropagation()}
          >

            <button
              className="btn secondary"
              onClick={() => setActiveStory(null)}
            >

              Close

            </button>


            <UserIdentity
              person={activeStory}
              profiles={profiles}
              publicProfiles={publicProfiles}
            />


            <img
              src={
                activeStory.photoData ||
                '/assets/logo/logo.png'
              }
              alt={activeStory.authorName + ' story'}
            />

          </article>

        </div>

      )}

    </div>

  );

}