# Soccer Practice at Ellis — Setup Guide

## Prerequisites
- Node.js 18+ (https://nodejs.org)
- A free Supabase account (https://supabase.com)
- A free Vercel account (https://vercel.com) — only needed for deployment
- A GitHub account — only needed to push and deploy

---

## Step 1 — Create Your Supabase Project

1. Go to https://supabase.com and sign up (free).
2. Click **New project**, choose a name (e.g. "soccer-tracker"), set a database password, and create it.
3. Wait ~1 minute for the project to initialize.
4. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon / public key** (long JWT string)

---

## Step 2 — Set Up the Database

1. In your Supabase project, go to **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project.
3. **Replace both occurrences of `YOUR_ADMIN_EMAIL@example.com`** with your actual admin email address.
4. Paste the full SQL and click **Run**.

---

## Step 3 — Create Auth Users

1. In Supabase, go to **Authentication → Users → Add user**.
2. Create the **admin user**:
   - Email: your admin email (same as in the SQL above)
   - Password: choose a strong private password
3. Create the **shared players user**:
   - Email: something like `players@soccergroup.com` (anything you like)
   - Password: the shared password you will give to all players

---

## Step 4 — Configure Environment Variables

1. In this project folder, copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_ADMIN_EMAIL=your-admin-email@example.com
   ```

---

## Step 5 — Run Locally

```bash
cd "soccer-tracker"
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

- Log in with your **admin email + password** → you will see the Dashboard AND the Admin tab.
- Log in with the **players email + shared password** → you will see only the Dashboard.

Test an import: go to Admin → Import → SignUpGenius, upload the SignUpGenius CSV. Verify payments appear on the Dashboard.

---

## Step 6 — Deploy to Vercel (free)

### 6a — Push to GitHub
```bash
cd "soccer-tracker"
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/soccer-tracker.git
git push -u origin main
```

### 6b — Deploy on Vercel
1. Go to https://vercel.com, sign in, click **Add New → Project**.
2. Import your GitHub repo.
3. In the **Environment Variables** section, add the same three variables from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_EMAIL`
4. Click **Deploy**. Vercel will give you a public URL (e.g. `https://soccer-tracker.vercel.app`).

Share that URL and the players email + shared password with your group.

---

## How to Use

### As Admin
- **Import → SignUpGenius**: upload the monthly CSV from SignUpGenius. Paid rows are imported automatically.
- **Import → Venmo**: upload Venmo statement. Review each transaction, adjust type/count, split if needed, then confirm.
- **Import → Zelle / Bank**: upload your bank statement. Same review flow as Venmo.
- **Import → Cash**: manually enter a cash payment.
- **Settings → Court Rent**: add a new rent rate whenever the rent changes (effective dates take effect immediately).
- **Settings → Initial Balance**: set the carry-forward balance from the previous year.

### As a Player
- Log in with the shared group email and password.
- The Dashboard shows the full cash flow charts and current balance.

---

## Re-uploading Files

All three importers are safe to re-run with the same file — duplicates are detected and skipped automatically. You can re-upload after each new payment appears in SignUpGenius or after a monthly Venmo/bank statement is available.

---

## Updating the Rent Amount

When the rent changes at the start of a new year:
1. Go to Admin → Settings → Court Rent.
2. Add a new entry with the effective date (e.g. `2027-01-21`) and the new monthly amount.
3. The app will automatically use the new rate for all months on or after that date.
