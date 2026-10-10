# SHKAA · Tote & Toast Bingo

A cute, mobile-first 25-prompt event bingo website inspired by the attached SHKAA poster.

**Visual palette:** warm ivory, burgundy, dusty rose, pale blue-grey and soft sage green.  
**Stack:** Next.js 15, React, TypeScript, Tailwind-ready CSS, Supabase PostgreSQL + private Storage, Vercel.  
**Cost target:** free tiers only. Free-tier quotas and hosting terms can change; check the linked pricing pages before the event.

## Features included

- All 25 prompts are visible on the participant page.
- Prompts open a modal with a required image upload or required text response.
- Each successful prompt submission is saved and colours one random, unfilled tile green.
- Every participant has their own independent board.
- Bingo is detected when any row, column or diagonal has five green tiles.
- The participant can submit a bingo line for your in-person review.
- Submitting a bingo does **not** stop the game. Other participants can keep playing.
- Progress is stored in Supabase, so it survives a page refresh.
- Photos are stored in a private bucket, not a public image folder.
- No organiser dashboard is included. You check the participant's phone and evidence in person.

## Requirements

- Node.js 20.9+ recommended
- npm
- A free Supabase account/project
- A Vercel account for deployment

## 1. Initialise the project locally

Unzip the project and open a terminal in the `shka-bingo` folder.

```bash
npm install
```

Create your local environment file:

**macOS/Linux**
```bash
cp .env.example .env.local
```

**Windows PowerShell**
```powershell
Copy-Item .env.example .env.local
```

## 2. Create and configure Supabase

1. Visit https://supabase.com/ and create a project.
2. In the project dashboard, open **SQL Editor**.
3. Open `supabase/schema.sql` from this project, copy all its contents, paste them into the SQL Editor and run it.
4. Go to **Project Settings → API** (or the project's API keys/settings screen).
5. Copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`.
6. Copy the **service_role / secret server key** into `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Your `.env.local` should look like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
```

**Security:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must only be used in server-side API routes. Never rename it to a `NEXT_PUBLIC_...` variable, paste it into frontend code, commit it to GitHub, or share it in screenshots. `.env.local` is ignored by Git.

## 3. Run the website

```bash
npm run dev
```

Open http://localhost:3000.

Try the flow:
1. Enter a participant name and a unique code of 4–32 characters.
2. Click a prompt.
3. Upload a JPG/PNG/WebP up to 4 MB for a photo prompt, or enter text for a text prompt.
4. Submit and confirm one random tile turns green.
5. Complete enough tasks to make a row, column or diagonal.
6. Submit BINGO. The game stays open.

To stop the local server, press `Ctrl+C`.

## 4. Deploy to Vercel

1. Push the project to a private GitHub repository.
2. Sign in at https://vercel.com/ and import the repository.
3. In Vercel project settings, open **Environment Variables**.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` using the same values as `.env.local`.
5. Deploy. After adding or changing environment variables, redeploy.
6. Open the deployment URL on a phone and test an image submission using mobile data.

Do not commit `.env.local`. Do not paste the Supabase service key into a public issue or chat.

## 5. Participant codes

Each participant needs a unique code. The first use of a code links it to the name entered. Returning participants must use the same name and code to resume their board.

For a small event, you can distribute codes manually. Use random codes that are hard to guess, for example 8–10 letters/numbers. Avoid sequential codes like `SHKAA001`.

**Important limitation:** this starter uses participant codes rather than full user authentication. A code is a bearer credential: anyone who knows another participant's code may be able to access that participant's board. Keep codes private and use unguessable codes. For higher-stakes use, replace this with proper authentication.

## 6. Important behaviour and winner rules

- A participant can submit each of the 25 prompts once.
- One successful prompt submission maps to one random unfilled board tile.
- The server saves the tile assignment; it is not chosen solely in the browser.
- A valid BINGO is any complete row, column or diagonal.
- A participant can submit their qualifying line. The database prevents duplicate BINGO submissions from the same participant.
- A BINGO submission is not an automatic win. You physically inspect the participant's phone/evidence and decide the winner.
- The site does not close when someone submits BINGO.
- Task 10 was added as: “Find someone who shares your favourite snack and write their name.” Edit it in `lib/tasks.ts` if you'd prefer another prompt.

## 7. Free-tier and storage notes

- Supabase Storage is private and capped at 4 MB per upload by this app.
- Image uploads use JPG, PNG or WebP.
- Keep images small to stay within free storage and bandwidth quotas.
- Supabase free projects may pause after inactivity and have usage limits. Confirm the current plan and quotas before the event.
- Vercel Hobby is for personal, non-commercial use; check its terms for your event.
- Email notifications are intentionally omitted from this version because the latest workflow is in-person phone verification and no organiser dashboard.

Pricing references:
- https://supabase.com/pricing
- https://vercel.com/docs/plans/hobby

## Project structure

```text
shka-bingo/
├── app/
│   ├── api/
│   │   ├── participant/route.ts
│   │   ├── progress/route.ts
│   │   ├── submit-bingo/route.ts
│   │   └── submit-task/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── supabase-admin.ts
│   └── tasks.ts
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting

**“Supabase environment variables are missing”**
- Check `.env.local` exists at the project root and both values are correct.
- Restart `npm run dev` after editing environment variables.

**Database relation/table error**
- Run `supabase/schema.sql` in the Supabase SQL Editor.
- Confirm the tables `participants`, `task_submissions`, and `bingo_submissions` exist.

**Upload fails**
- Confirm the `bingo-evidence` bucket exists and is private.
- Confirm the Supabase service role key is correct.
- Use JPG, PNG or WebP and stay under 4 MB.

**A participant loses their board**
- They must use the same participant name and code.
- If browser storage was cleared, use the same credentials to load their saved server progress.

**Before the real event**
- Test two different participants on two different phones.
- Test a photo prompt, a text prompt, duplicate submission, refresh/reload and a BINGO submission.
- Verify the app does not stop when the first BINGO is submitted.
- Keep a backup of the participant codes.
