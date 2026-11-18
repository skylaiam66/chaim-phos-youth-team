CHAIM PHOS YOUTH TEAM - WEBSITE UPGRADE PACKAGE

Included files:
- app/page.tsx                 Professional homepage using existing IndexedDB stores
- app/globals.css              Consolidated visual design system; preserves shared selectors
- components/Header.tsx        Improved responsive header; retains existing auth and Director mode checks
- components/Footer.tsx        Adds club information footer and preserves mobile bottom navigation

IMPORTANT
1. This package does not add or modify any Supabase table, column, policy, function, trigger, bucket or setting.
2. Existing IndexedDB stores and existing routes are used.
3. Make a backup or commit your current project before replacing files.
4. Extract this ZIP into the root of your existing Next.js project and allow the four included files to replace the old ones.
5. Confirm that your existing assets remain in place:
   - public/assets/logo/logo.png
   - public/assets/logo/uganda-flag.png
   - public/assets/theme/login-bg.jpg
6. The homepage Join buttons currently use the existing /login route. If your registration page uses a different existing route, change those links to that route.
7. The contact CTA currently points to /contact. If that route does not exist yet, change it to an existing contact route or remove that CTA.
8. Run:
   npm install
   npm run build

No package dependencies were added.
