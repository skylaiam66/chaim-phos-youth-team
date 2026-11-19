'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAll, putRaw } from '@/lib/db';
import { initialOfficials } from '@/lib/officials';
import ImpactStats from '@/components/ImpactStats';

type Item = {
  id: string;
  title?: string;
  body?: string;
  caption?: string;
  url?: string;
  photo?: { url?: string };
  position?: string | number;
  createdAt?: string;
  name?: string;
  positionName?: string;
  bio?: string;
};

const activities = [
  {
    number: '01',
    title: 'Friendship & connection',
    text: 'We create welcoming opportunities for young people to meet, build friendships, share experiences and develop a genuine sense of belonging.',
  },
  {
    number: '02',
    title: 'Leadership & growth',
    text: 'We encourage members to take initiative, discover their strengths, learn from one another and contribute ideas that move the team forward.',
  },
  {
    number: '03',
    title: 'Community service',
    text: 'We believe positive change begins with practical action. Members are encouraged to take part in activities that respond to needs around them.',
  },
  {
    number: '04',
    title: 'Shared experiences',
    text: 'From social gatherings and tours to sports and celebrations, shared experiences help us learn, make memories and grow together.',
  },
];

const values = [
  ['Unity', 'We value togetherness, mutual respect and the strength that comes from standing alongside one another.'],
  ['Integrity', 'We aim to act honestly, responsibly and respectfully in our decisions and relationships.'],
  ['Empowerment', 'We encourage every member to participate, learn, lead and make meaningful contributions.'],
  ['Service', 'We look beyond ourselves and seek practical ways to support people and improve our communities.'],
  ['Friendship', 'We build positive relationships where people feel welcomed, valued and included.'],
];

export default function Home() {
  const [slides, setSlides] = useState<Item[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [ann, setAnn] = useState<Item[]>([]);
  const [events, setEvents] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Item[]>([]);
  const [shop, setShop] = useState<Item[]>([]);
  const [officials, setOfficials] = useState<Item[]>([]);

  async function load() {
    try {
      const [sl, a, e, p, sh, off] = await Promise.all([
        getAll<Item>('slider'),
        getAll<Item>('announcements'),
        getAll<Item>('events'),
        getAll<Item>('projects'),
        getAll<Item>('shop'),
        getAll<Item>('officials'),
      ]);

      setSlides((sl || []).sort((x, y) => Number(x.position || 0) - Number(y.position || 0)));
      setAnn((a || []).slice(0, 4));
      setEvents((e || []).slice(0, 3));
      setProjects((p || []).slice(0, 3));
      setShop((sh || []).slice(0, 3));

      if (!off?.length) {
        for (const person of initialOfficials) {
          await putRaw('officials', {
            ...person,
            createdAt: '2000-01-01T00:00:00.000Z',
            updatedAt: '2000-01-01T00:00:00.000Z',
            sync_pending: false,
          });
        }
        setOfficials(initialOfficials as Item[]);
      } else {
        setOfficials(off.sort((x, y) =>
          String(x.createdAt || '').localeCompare(String(y.createdAt || ''))
        ));
      }
    } catch (error) {
      console.error('Unable to load homepage content:', error);
    }
  }

  useEffect(() => {
    void load();
    const handleDataChange = () => void load();
    window.addEventListener('cp-data-change', handleDataChange);
    return () => window.removeEventListener('cp-data-change', handleDataChange);
  }, []);

  useEffect(() => {
    if (slides.length < 2) {
      setActiveSlide(0);
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((value) => (value + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const slide = slides[activeSlide];
  const slideImage = slide?.url || slide?.photo?.url || '/assets/theme/login-bg.jpg';

  return (
    <div className="main home-wallpaper chaim-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker">Do you know how to?</span>
<h1>
  <span className="slogan-black">E</span>nkindle.<br />
  <span className="slogan-yellow">E</span>xpand.{" "}
  <span className="slogan-red">E</span>ternalise.
</h1>
      <p>
            CHAIM PHOS Youth Team is a youth club bringing young people together through friendship, leadership, shared experiences and community service. We create room for every member to connect, discover their potential and take part in positive change.
          </p>
          <div className="home-hero-actions">
            <Link className="btn" href="/login">Join CHAIM PHOS</Link>
            <a className="btn secondary" href="#about">Discover our purpose</a>
          </div>
        </div>

        <div className="home-hero-visual">
          {slides.length > 0 ? (
            <div className="hero-slider">
              <img
                key={slide?.id || activeSlide}
                className="hero-slide-image slide-enter"
                src={slideImage}
                alt={slide?.caption || slide?.title || 'CHAIM PHOS Youth Team activity'}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/assets/logo/logo.png';
                }}
              />
              <div className="hero-caption">
                <strong>{slide?.title || 'CHAIM PHOS YOUTH TEAM'}</strong>
                <span>{slide?.caption || slide?.body || 'Enkindle. Expand. Eternalise.'}</span>
              </div>
              {slides.length > 1 && <>
                <button className="hero-arrow prev" aria-label="Previous slide"
                  onClick={() => setActiveSlide((v) => (v + slides.length - 1) % slides.length)}>‹</button>
                <button className="hero-arrow next" aria-label="Next slide"
                  onClick={() => setActiveSlide((v) => (v + 1) % slides.length)}>›</button>
                <div className="hero-dots">
                  {slides.map((item, index) => (
                    <button key={item.id || index} aria-label={`Show slide ${index + 1}`}
                      className={activeSlide === index ? 'selected' : ''}
                      onClick={() => setActiveSlide(index)} />
                  ))}
                </div>
              </>}
            </div>
          ) : (
            <div className="hero-empty home-hero-empty">
              <img src="/assets/logo/logo.png" alt="CHAIM PHOS logo" />
              <strong>Enkindle. Expand. Eternalise.</strong>
              <span>Growing together through connection, opportunity and service.</span>
            </div>
          )}
        </div>
      </section>

      <section className="home-intro-band" id="about">
        <div>
          <span className="eyebrow">WELCOME TO CHAIM PHOS</span>
          <h2>A place to belong, participate and grow.</h2>
        </div>
        <p>
          CHAIM PHOS is an inclusive youth club established on 3 December 2023 in Kambuga Town Council. We bring young people together to build friendships, develop leadership, celebrate achievements, support one another through difficult moments and serve our communities—regardless of religion, tribe, background or social status.
        </p>
      </section>

      <ImpactStats />

      <section className="home-section" id="purpose">
        <div className="home-section-heading">
          <div><span className="eyebrow">WHY WE COME TOGETHER</span><h2>Our purpose</h2></div>
          <p>Making connection meaningful and turning shared energy into positive action.</p>
        </div>
        <div className="purpose-grid">
          {activities.map((item) => (
            <article className="purpose-card" key={item.number}>
              <span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-vision-grid">
        <article className="vision-card">
          <span className="eyebrow">OUR VISION</span>
          <h2>Building a community of empowered youth driving positive change.</h2>
          <p>
            We envision a connected community of empowered young people who use their abilities, talents and leadership to create positive change.
          </p>
        </article>
        <article className="vision-card mission-card">
          <span className="eyebrow">OUR MISSION</span>
          <h2>To inspire, empower and unite youth.</h2>
          <p>
            We inspire, empower and unite youth through community service, workshops and impactful projects, enhancing lives and creating positive change.
          </p>
        </article>
      </section>

      <section className="hesuper-section">
        <span className="eyebrow">OUR CLUB PHILOSOPHY</span><h2>HESUPER — the principles that guide us</h2>
        <div className="hesuper-grid">
          {[["H","Humanity","Love, care and support for others."],["E","Equality","Fair and equal treatment for everyone."],["S","Service","Volunteering and helping to lift others up."],["U","Unity","Standing together in success and hardship."],["P","Peace & Cooperation","Promoting harmony among members and communities."],["E","Empowerment","Encouraging youth growth and self-development."],["R","Responsibility","Practising accountability and discipline."]].map(([letter,title,desc]) => <article className="hesuper-card" key={letter+title}><b>{letter}</b><div><h3>{title}</h3><p>{desc}</p></div></article>)}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div><span className="eyebrow">WHAT GUIDES US</span><h2>Values we live by</h2></div>
          <p>The character of our community is shaped by the way we treat one another.</p>
        </div>
        <div className="values-grid">
          {values.map(([title, text], index) => (
            <article className="value-card" key={title}>
              <span className="value-index">0{index + 1}</span>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-activities-banner">
        <div>
          <span className="eyebrow">LIFE IN THE TEAM</span>
          <h2>Experiences that bring us closer.</h2>
          <p>
            Our activities are opportunities to connect beyond everyday routines.
            Through picnics, tours, sports, celebrations, member-support initiatives
            and community service, we make memories while strengthening our bonds.
          </p>
          <Link className="btn" href="/events">Explore activities and events</Link>
        </div>
        <div className="activity-points">
          <span>Picnics & social gatherings</span><span>Tours & discovery</span>
          <span>Sports & competitions</span><span>Community service</span>
          <span>Celebrating achievements</span><span>Supporting one another</span>
        </div>
      </section>

      <section className="executives-section" id="leadership">
        <div className="section-heading">
          <div><span className="eyebrow">LEADERSHIP & SERVICE</span><h2>Meet our executives</h2>
            <p className="muted">Meet the people entrusted with guiding, coordinating and serving the team.</p></div>
          <span className="executive-count">{officials.length} listed</span>
        </div>
        <div className="executives-grid">
          {officials.map((person, index) => (
            <article className="executive-card" key={person.id || `${person.name}-${index}`}>
              <div className="executive-photo-wrap">
                {person.photo?.url ? (
                  <img src={person.photo.url} alt={person.name || 'Club official'} className="executive-photo" />
                ) : (
                  <div className="executive-placeholder">
                    {(person.name || 'CP').split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}
                  </div>
                )}
                <span className="executive-number">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="executive-info">
                <span className="executive-position">{person.position || person.positionName || 'Executive'}</span>
                <h3>{person.name}</h3>
                <p>{person.bio || person.body || 'Serving the team through commitment, collaboration and a shared vision for positive growth.'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div><span className="eyebrow">STAY CONNECTED</span><h2>Latest announcements</h2></div>
          <span className="home-section-note">Updates from the team</span>
        </div>
        {ann.length ? <div className="home-content-grid">
          {ann.map((item) => <article className="home-content-card" key={item.id}>
            <span className="content-label">TEAM UPDATE</span><h3>{item.title}</h3><p>{item.body}</p>
          </article>)}
        </div> : <div className="home-empty-state">New announcements and updates will appear here when published.</div>}
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div><span className="eyebrow">WHAT WE ARE DOING</span><h2>Explore the team</h2></div>
          <p>Discover opportunities, activities and resources shared through our platform.</p>
        </div>
        <div className="home-content-grid three">
          {[
            { title: 'Events', items: events, href: '/events', description: 'Find gatherings, activities and upcoming moments to look forward to.' },
            { title: 'Projects', items: projects, href: '/projects', description: 'Explore ideas and initiatives that turn shared goals into action.' },
            { title: 'Shop', items: shop, href: '/shop', description: 'Browse items made available through the team shop.' },
          ].map((group) => <article className="home-content-card explore-card" key={group.title}>
            <span className="content-label">{group.title.toUpperCase()}</span>
            <h3>{group.title}</h3><p>{group.description}</p>
            {group.items.length > 0 ? <div className="home-mini-list">
              {group.items.map((item) => <div className="home-mini-item" key={item.id}>
                {item.photo?.url && <img src={item.photo.url} alt="" />}
                <span>{item.title || 'Untitled'}</span>
              </div>)}
            </div> : <p className="muted">New {group.title.toLowerCase()} will be displayed here when available.</p>}
            <Link className="btn secondary" href={group.href}>Explore {group.title}</Link>
          </article>)}
        </div>
      </section>

      <section className="home-membership-cta">
        <span className="eyebrow">YOUR PLACE IN THE COMMUNITY</span>
        <h2>Bring your ideas. Find your people. Make a difference.</h2>
        <p>
          Whether you want to build friendships, take part in activities, develop
          leadership skills or contribute to something positive, there is room
          for you to get involved.
        </p>
        <div className="home-hero-actions">
          <Link className="btn gold" href="/login">Become a member</Link>
          <Link className="btn secondary" href="/contact">Get in touch</Link>
        </div>
      </section>

      <section className="home-closing">
        <h2>CHAIM PHOS YOUTH TEAM</h2>
        <p className="club-slogan"><span className="slogan-black">E</span>nkindle. <span className="slogan-yellow">E</span>xpand. <span className="slogan-red">E</span>ternalise.</p>
        <p>One team. Shared experiences. A positive direction.</p>
      </section>
    </div>
  );
}
