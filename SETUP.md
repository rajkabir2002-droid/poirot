# Setting up Poirot

About 30 minutes, no coding. You need three free accounts: GitHub, Supabase and Vercel.
Menu names on these sites change now and then; if a label below has moved, look for the nearest match.

Do the steps in this order. Poirot works in demo mode after step 1, and sign-in works after step 5.

## 1. Put the files on GitHub and deploy on Vercel

1. Open your `poirot` repository on GitHub. Click **Add file → Upload files**.
2. Drag in everything from this folder: `index.html`, `app.js`, `config.js`, the `supabase` folder and the `.md` files. Click **Commit changes**.
3. Go to vercel.com. Click **Add New → Project**, pick the `poirot` repository and click **Import**.
4. Leave every setting as it is (Framework Preset: **Other**) and click **Deploy**.
5. Vercel gives you a link such as `https://poirot-xxxx.vercel.app`. Open it: you should see the sign-in screen, and **Look around the demo** should work.

Keep this link. It is called "your Vercel link" below.

## 2. Create the database on Supabase

1. Go to supabase.com and click **New project**. Name it `poirot`, choose the **Mumbai** region, and set a database password (save it somewhere).
2. When the project is ready, open **SQL Editor → New query**.
3. Open `supabase/schema.sql` from this folder, copy all of it, paste it in, and click **Run**. It should say "Success".
4. Do the same with `supabase/sample_content.sql`. This adds example competitions and content so the app is not empty.

## 3. Switch on Google sign-in

This is the fiddliest step. You are telling Google that Poirot may use Google sign-in.

**In Supabase**

1. Open **Authentication → Sign In / Providers → Google**.
2. Copy the **Callback URL** shown there. It looks like `https://abcdefgh.supabase.co/auth/v1/callback`.

**In Google Cloud** (use your IIML Google account)

3. Go to console.cloud.google.com and create a new project called `Poirot`.
4. Open **Google Auth Platform** (older screens call it "APIs & Services → OAuth consent screen").
   - App name: `Poirot`. Support email: your IIML email.
   - Audience: choose **Internal** if it is offered. Internal means only @iiml.ac.in accounts can sign in at all.
     If Internal is not offered or is blocked, choose **External** and publish the app. Poirot still refuses non-IIML accounts in the database.
5. Open **Clients → Create client** and choose **Web application**.
   - **Authorized JavaScript origins**: your Vercel link.
   - **Authorized redirect URIs**: the Callback URL you copied from Supabase.
6. Click **Create**. Copy the **Client ID** and the **Client secret**.

**Back in Supabase**

7. On the Google provider page, turn Google **on**, paste the Client ID and Client secret, and save.
8. Open **Authentication → URL Configuration**.
   - **Site URL**: your Vercel link.
   - **Redirect URLs**: add your Vercel link followed by `/**`, for example `https://poirot-xxxx.vercel.app/**`.

## 4. Connect the website to the database

1. In Supabase, open **Project Settings → API Keys** (and **Data API** for the URL).
   Copy the **Project URL** and the **publishable** key (older projects call it the **anon** key).
   Never use the secret or service_role key here.
2. On GitHub, open `config.js`, click the pencil icon, and paste the two values between the quotes:

   ```js
   window.POIROT_CONFIG = {
     supabaseUrl: "https://abcdefgh.supabase.co",
     supabaseKey: "sb_publishable_..."
   };
   ```
3. Click **Commit changes**. Vercel redeploys by itself in about a minute.

## 5. Sign in and make yourself Crack Tank

1. Open your Vercel link and click **Sign in with Google**. Use your IIML account.
2. You are now in as a student, so the Crack Tank desk is hidden. To make yourself an admin, go to Supabase **SQL Editor** and run this with your own email:

   ```sql
   update public.profiles set is_admin = true where email = 'pgp42365@iiml.ac.in';
   ```
3. Refresh Poirot. The **Crack Tank desk** tab appears.

To let an evaluator see the desk, run the same line with their email after they have signed in once. Anyone can also press **Look around the demo** to see every screen with sample data.

## 6. Load the batch list (for the defaulter list)

The defaulter list is "everyone in the batch, minus everyone who registered", so Poirot needs the batch list.

1. Make a spreadsheet with three columns named exactly `pgp_id`, `name`, `section`. PGP IDs in capitals, for example `PGP42365`.
2. Save it as CSV.
3. In Supabase open **Table Editor → roster → Insert → Import data from CSV**.

Delete the nine sample students first (`delete from public.roster;` in the SQL Editor).

## If something goes wrong

| What you see | Likely cause |
|---|---|
| The sign-in button is missing | `config.js` is still empty, or Vercel has not redeployed yet |
| Google says "redirect_uri_mismatch" | The redirect URI in Google Cloud is not exactly the Supabase Callback URL |
| You return to the sign-in screen with "Only @iiml.ac.in accounts can sign in" | You picked a non-IIML Google account |
| You sign in but land on `localhost` or a blank page | The Site URL or Redirect URLs in Supabase do not match your Vercel link |
| "Could not load Poirot" after signing in | `schema.sql` was not run, or was run only partly. Check the SQL Editor for errors |
| Uploading a screenshot fails | The `proofs` storage bucket is missing. Re-run the storage part at the end of `schema.sql` |
