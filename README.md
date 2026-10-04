# Poirot · Never miss a case

A case competition portal for IIM Lucknow, pitched for Team SynapsE Overtures 2026, Round 2.
Built by Raj Kabir (PGP42365).

Live link: [add your Vercel link here]

## The problem

- **Who faces it:** every student at IIM Lucknow who takes part in case competitions, and Crack Tank, who track them.
- **What happens today:** competitions are tracked on Excel sheets, so deadlines are easy to forget. Teammates are found through WhatsApp groups. Not registering invites a fine.
- **Why the current way fails:** a sheet does not remind anyone, a WhatsApp message scrolls away, and nobody can see at a glance who has not registered.
- **How the idea came about:** as a student and Disha volunteer I tracked shortlists and deadlines by hand, and saw the same pattern in case competitions.

## The solution

Poirot is one place for the whole case competition cycle.

| Screen | What it does |
|---|---|
| My cases | Every open competition, sorted by deadline, with a countdown and your status |
| Case file | A description of the competition, the Unstop link, and the form to file proof of registration |
| Team finder | Teams looking for members and people looking for a team, with filters for commitment, domain, experience and section |
| Hall of fame | Winner cards that flip to show the team, and past winning decks by competition |
| Playbook | A repository of guides, and knowledge-transfer notes by competition |
| Crack Tank desk | Admin only: approve proofs, add competitions, and get the defaulter list with names and PGP IDs |

### How proof of registration works

Registration happens on Unstop, which Poirot cannot see. So:

1. The team lead enters the team name, the Unstop team ID and the teammates' PGP IDs, and uploads a screenshot of the Unstop confirmation.
2. Each teammate signs in and confirms they are in that team. A student added by mistake can take themselves off.
3. Crack Tank approves the proof, or sends it back. Proofs with every teammate confirmed can be approved in one tap.

A student can be in only one team per competition. The database enforces this, so two teams cannot both claim the same person.

## Tech stack

| Part | Choice | Why |
|---|---|---|
| Front end | One HTML page, one JavaScript file, no framework and no build step | Small enough to read in one sitting, and it deploys anywhere |
| Database and login | Supabase (Postgres, Auth, Storage) | Gives a real database, Google sign-in and private file storage on a free tier |
| Hosting | Vercel | Redeploys automatically whenever the GitHub repository changes |
| Code | GitHub | Version history, and the source Vercel deploys from |

## Main database tables

| Table | One row is | Key fields |
|---|---|---|
| `profiles` | A student who has signed in | email, pgp_id, name, section, is_admin |
| `roster` | A student in the batch list | pgp_id, name, section |
| `competitions` | A competition | company, name, about, team_size, deadline, unstop_url |
| `registrations` | A team's claim that it registered | competition, team_name, unstop_team_id, proof_path, status |
| `registration_members` | One student in that team | registration, competition, pgp_id, confirmed |
| `team_posts` | A team-finder post | competition, kind, commitment, domains, work_ex, case_exp |
| `team_requests` | A request to join, or an invite | post, from_user |
| `winners`, `decks`, `guides`, `kt_notes` | Hall of fame and playbook content | written by Crack Tank |

In plain words: we store who is in the batch and who registered for what. The difference between the two is the defaulter list.

## How login works

1. The student clicks **Sign in with Google**. Poirot asks Google for an @iiml.ac.in account.
2. Google sends the student back to Poirot through Supabase, which issues a signed session.
3. On first sign-in, the database checks the email. If it does not end in @iiml.ac.in, the account is refused. Otherwise a profile is created, and the PGP ID is taken from the email address.
4. Every request to the database carries that session. Each table has rules about who may read or change a row, for example "only Crack Tank can approve a registration" and "you can confirm only your own team membership".

The rules live in the database, not in the web page, so editing the page in a browser cannot bypass them. The key in `config.js` is the public key, which is designed to be published.

Crack Tank members are profiles with `is_admin = true`. Only they see the desk, and only they can read the batch list.

## Where it is hosted

- Website: Vercel, as static files.
- Database, login and screenshots: Supabase, Mumbai region.
- Screenshots sit in a private bucket. Only the student who uploaded one and Crack Tank can open it, through a link that expires in five minutes.

## Scale and failure

- **Size of the problem:** about 580 students and a few dozen competitions a year. The busiest moment is the hour before a deadline, when a few hundred students file proof. That is a small load for Postgres.
- **Double submissions:** the database allows one row per student per competition, so tapping twice or two teams claiming one person cannot create duplicates.
- **Page load:** Poirot currently loads all open data when you sign in. That is fine at this size. With several years of data, the first change would be to load only the current term.
- **If Supabase is down:** the page still opens and the demo still works, but sign-in and saving do not. Nothing is lost, because nothing is stored in the browser.
- **If a proof is filed and saving the team fails halfway:** Poirot removes the half-saved registration and shows the reason.

## What was cut, and what comes next

Cut from this version to keep it small:

- **Email reminders.** "Remind them" copies the defaulters' email addresses so Crack Tank can send one email. Automatic reminders 48 hours and 6 hours before a deadline need a mail service.
- **Forms for hall of fame and playbook content.** Crack Tank adds these in the Supabase table editor for now.
- **Automatic approval** runs when a Crack Tank member opens Poirot, not in the background.
- **Compulsory versus optional competitions, and exemptions.** Today every competition counts every student.

With less time, the order to cut would be: hall of fame, playbook, team finder. The board, proof and defaulter list are the core.

## Integrity

- A student could claim to have registered without doing so. The screenshot, the Unstop team ID, teammate confirmation and Crack Tank's approval make that harder, and only Crack Tank can mark a proof approved.
- A student cannot make themselves an admin, change their PGP ID, or read the batch list. These were tested (see below).
- Winning decks may contain a company's confidential brief, so they should be uploaded only with the team's consent and the company's rules in mind.
- The hall of fame is written only by Crack Tank, so nobody can add their own win.

## How it was tested

- **Database rules:** 35 checks run against a local Postgres, covering sign-up, who can read and write each table, and the one-team-per-student rule. All pass.
- **Screens and actions:** 40 browser checks covering the demo, the sign-in screens, and every action, run against a stand-in for Supabase.
- **Not yet tested:** the live Google sign-in and real Supabase calls. These can only be tested after the setup in `SETUP.md`.

## AI disclosure

Poirot was built with **Claude** (Anthropic's AI assistant), used through the Claude app. Claude wrote the code, the database script and the first draft of these documents from my prompts and decisions. The prompts are in `PROMPTS.md`. The idea, the feature choices and the design direction are mine.

All competitions, names, counts and guides shown in demo mode and in `sample_content.sql` are example data.
