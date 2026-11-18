# CHAIM PHOS Youth Team — Next.js 14

A Next.js App Router + TypeScript + Tailwind PWA using Supabase Auth, Supabase Storage and IndexedDB (`idb`).

## Install and run
1. Install Node.js 20 LTS or newer.
2. Extract the ZIP, open the project folder in Terminal and run `npm install`.
3. Copy `.env.example` to `.env.local`; set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase Project Settings → API.
4. Open Supabase SQL Editor and run the complete `supabase.sql` file.
5. In Supabase Authentication settings, configure your site URL and allowed redirect URLs. Decide whether email confirmation is required.
6. Run `npm run dev`, then open `http://localhost:3000`.
7. Create your Director account through Register. In Supabase SQL Editor, run this statement once with your exact Director email, then sign out and back in:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"Director"}'::jsonb
   where email='YOUR_DIRECTOR_EMAIL';
   ```
8. For Vercel, import the repository, add both public environment variables to the project, and deploy.

## Important architecture
- Supabase Auth handles real account registration, sign-in, persistent auth sessions and password-reset email. Passwords are never written to IndexedDB or `*_text` tables.
- IndexedDB database `chaim-phos-db` is the offline-first local cache. Changes are saved locally first and retried against Supabase when online. Logout only clears the auth session; IndexedDB is retained.
- Shared Director media is uploaded to public Storage buckets `homepage`, `events`, `projects`, `shop`, `library`, and `officials`; the public URL is stored in the corresponding text payload.
- Member profile photos, post photos and story photos are compressed to <=100KB and stored locally only. Other devices show the CP logo where a local-only photo is unavailable.
- Director permissions are enforced by RLS and the `cp_is_director()` database function. Do not grant Director role through the client UI or expose a service-role key.

## Replaceable assets
- `public/assets/logo/logo.png`
- `public/assets/logo/uganda-flag.png`
- `public/assets/theme/login-bg.jpg`
- `public/wallpapers/wallpaper-1.jpg` to `wallpaper-4.jpg`
- `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`

## Deployment/security notes
- Keep the anon key public; never put a Supabase service-role key in `.env.local` or Vercel client environment variables.
- The SQL allows public reads for public content, authenticated member-owned writes, and Director-only content/media management. Profile rows are readable only to authenticated users.
- The app does not implement payment processing; contributions are records/pledges and a Director marks them paid after confirming receipt outside the app.
- Password reset uses Supabase Auth email. Configure SMTP and redirect URLs in Supabase for reliable delivery.
- Offline account creation/login requires an existing authenticated session; first-time sign-up and sign-in require internet access. Cached session/profile data remains available during temporary offline periods.

## Officials and appointments
- The home page lists the full executive team. Initial names and role descriptions are seeded locally for first launch.
- In Director Panel → Officials, edit official names, roles and biographies, and upload/replace portraits. Portrait files are uploaded to the Supabase Storage bucket `officials`; only the public media reference is synced in `officials_text`.
- Run the updated `supabase.sql` in the Supabase SQL Editor to create `officials_text`, enable public read/Director-only management, and create the `officials` Storage bucket.
- Members can select an official in Mentorship & Appointments when submitting an appointment request.
- Home slider images use the Director Panel → Home Slider form. The description field is displayed as the slide caption; slides advance automatically every five seconds.
- The app uses a fixed CHAIM PHOS designed visual theme. Members cannot choose colour themes or wallpaper modes.
