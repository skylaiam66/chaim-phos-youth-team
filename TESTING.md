# Release verification checklist

## Build
- `npm ci` (or `npm install`), then `npm run build`.
- `npm run start` and check all routes on desktop and mobile.

## Supabase
- Run `supabase.sql` in a new project.
- Set URL and anon key in `.env.local` and Vercel.
- Register a normal account; confirm `profiles_text` contains a profile payload but no password.
- Promote the designated Director with the SQL command in `supabase.sql`, then sign in again.
- Verify a normal member cannot upload Storage files, change `paid`, change `membershipType`, or write Director content.
- Verify Director can create content and upload only to the five approved buckets.

## Functional checks
- Register, log out, log back in, refresh, and verify profile/session persistence.
- Create member posts/comments/stories. Verify local photos are <=100KB and are not uploaded to Storage.
- On a second device, verify member-only images show the CP logo fallback.
- Upload a Director image and verify another device renders its public Storage URL.
- Test all six home slider slots, events, projects, shop, library PDF links, contributions, bookings and Director approvals.
- Go offline after a successful sign-in, create local records, reconnect and verify pending sync.
- Log out and verify IndexedDB data remains.
- Test all five themes and four wallpapers; wallpapers must affect only Home and Login.
- Install the PWA over HTTPS on Android/iOS and test its app shell offline.

## Known operational limits
- Initial account registration and first sign-in need connectivity because Supabase Auth is authoritative.
- The local-only member images do not transfer to other devices by design.
- Supabase Storage media upload and table sync need a configured Supabase project to test end-to-end.
