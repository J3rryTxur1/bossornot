# Wealth Showcase — FREE (Cloudflare Pages + Supabase + Resend)

This is a VPS-free starter. It uses:
- Cloudflare Pages/Functions for hosting and server-side routes.
- Supabase for Postgres + Storage.
- Resend for email after approval.

Cloudflare Pages Functions have a free Workers quota; Supabase Free currently includes 500 MB DB, 1 GB Storage and 2 free projects; Resend Free currently includes 3,000 emails/month and 100/day.

## 1. Supabase
Create a free project.
Run `supabase/schema.sql` in SQL Editor.
Create Storage bucket: `payment-slips`.
For the first test, configure upload access for anonymous users. Tighten the Storage policy before real use.
Copy:
- Project URL
- anon/public key

## 2. Put keys in app.js
Replace:
YOUR_SUPABASE_URL
YOUR_SUPABASE_ANON_KEY

Also replace the KPay account number/name in index.html.

## 3. GitHub
Create a new repository and upload:
- index.html
- app.js
- style.css
- functions/
- supabase/
- README.md

## 4. Cloudflare Pages
Connect the GitHub repository to Cloudflare Pages.
Build command: leave blank.
Output directory: `/`
Deploy.

Cloudflare Functions are detected from the `functions/` directory.

## 5. Admin approval
The public payment submission works first. For the real admin workflow, create a Supabase Auth admin user and configure Cloudflare secrets:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- ADMIN_EMAIL

Then implement/enable the approve endpoint so only authenticated admin users can approve.

## 6. Certificate
The certificate should show the submitted Name and a unique Certificate ID.
For the completely free version, the safest first step is a certificate web page with Print → Save as PDF. Automatic PDF attachment generation can be added later without changing the payment data model.

## Important
Do not put the Supabase service-role key or Resend API key in GitHub or browser JavaScript. Only the anon/public key belongs in the frontend.
