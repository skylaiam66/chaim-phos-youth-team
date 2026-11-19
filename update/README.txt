CHAIM PHOS header and mobile badge update

Replace these files in your existing Next.js project:
1. components/Header.tsx
2. app/globals.css

Changes:
- Renames the navigation item “Me” to “My Account”.
- Removes the duplicate account/login link from the top-right corner for signed-in users and guests.
- Keeps the profile photo and name in the header.
- Prevents the blue verified checkmark and membership/official dot from being clipped on narrow phone screens. Long names are shortened with an ellipsis while badges remain visible.

No database, Supabase, authentication, or membership logic was changed.
After replacing the files, run: npm run build
