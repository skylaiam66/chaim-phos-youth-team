import Link from "next/link";

const contacts = [
  {
    title: "Director's Office",
    email: "director.chaimphos@gmail.com",
    description: "Official enquiries, leadership and administration.",
  },
  {
    title: "Youth Team",
    email: "chaimphos.youth2023team@gmail.com",
    description: "Membership, activities, partnerships and general enquiries.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
        >
          ← Back to Home
        </Link>

        <section className="mb-12 text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
            CHAIM PHOS YOUTH TEAM
          </p>

          <h1 className="mb-5 text-4xl font-extrabold md:text-6xl">
            Get in <span className="text-amber-400">Touch.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            We would love to hear from you. Whether you have a question,
            want to become a member, partner with us, or learn more about
            our activities, our team is ready to connect with you.
          </p>
        </section>

        <section className="mb-12 grid gap-6 md:grid-cols-2">
          {contacts.map((contact) => (
            <div
              key={contact.email}
              className="rounded-2xl border border-amber-500/20 bg-slate-900 p-7 shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 text-2xl">
                ✉
              </div>

              <h2 className="mb-3 text-xl font-bold text-amber-400">
                {contact.title}
              </h2>

              <p className="mb-5 leading-7 text-slate-300">
                {contact.description}
              </p>

              <a
                href={`mailto:${contact.email}`}
                className="break-all text-sm font-semibold text-white hover:text-amber-400"
              >
                {contact.email}
              </a>

              <div className="mt-7">
                <a
                  href={`mailto:${contact.email}?subject=${encodeURIComponent(
                    "Enquiry - CHAIM PHOS Youth Team"
                  )}`}
                  className="inline-block rounded-lg bg-amber-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
                >
                  Send an Email →
                </a>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-slate-900 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">
            Be Part of <span className="text-amber-400">Something Meaningful.</span>
          </h2>

          <p className="mx-auto mb-7 max-w-2xl leading-7 text-slate-300">
            Join a community of young people committed to empowering
            each other, serving communities and making a positive difference.
          </p>

          <Link
            href="/login"
            className="inline-block rounded-lg bg-amber-400 px-8 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
          >
            Join Our Youth Team
          </Link>
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-7 text-center">
          <p className="mb-2 text-sm font-bold tracking-widest text-amber-400">
            ENKINDLE. EXPAND. ETERNALIZE.
          </p>

          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} CHAIM PHOS Youth Team. All rights reserved.
          </p>
        </footer>

      </div>
    </main>
  );
}