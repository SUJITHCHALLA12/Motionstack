# Automatic download delivery — setup guide

How a purchase turns into a download, with no manual work from you:

1. Buyer signs in on the store (Google / GitHub / email via Firebase Auth).
2. Buyer clicks **Buy** → opens your Stripe Payment Link. The store appends
   `?client_reference_id=<their Firebase UID>&prefilled_email=<their email>` to the link.
3. Buyer pays. Stripe fires a `checkout.session.completed` webhook to your Firebase Function.
4. The function verifies the webhook signature, maps the Stripe price ID to your
   product ID, and records the purchase in Firestore under the buyer's UID.
5. The store's download page reads the buyer's purchases from Firestore and calls
   `getDownloadUrl`, which returns a **15-minute signed link** to the product zip
   in Firebase Storage. Link expires, can't be meaningfully shared.

## What you need to do (one-time, ~30 minutes)

> Your store's Firebase project is confirmed as **AI-Horizons** — use its project ID (Firebase console → Project settings) wherever this guide says `<project-id>`.

- [ ] `npm install -g firebase-tools`, then `firebase init functions` in your project folder
- [ ] Copy `index.js` (in this folder) into `functions/index.js`; run `npm install stripe firebase-admin firebase-functions` inside `functions/`
- [ ] Create your products as Stripe Products + Prices, then **Payment Links** (one per product)
- [ ] Fill in `PRODUCT_MAP` in `index.js`: each Stripe price ID → store product ID
- [ ] Zip each product as `products/<productId>.zip` and upload to Firebase Storage
- [ ] `firebase functions:config:set stripe.secret="sk_live_..." stripe.webhook="whsec_..."`
- [ ] `firebase deploy --only functions`
- [ ] Stripe Dashboard → Developers → Webhooks → Add endpoint:
  `https://<region>-<project-id>.cloudfunctions.net/stripeWebhook`
  → select event `checkout.session.completed` → copy the **Signing secret** into `stripe.webhook` config and redeploy
- [ ] Apply the Firestore security rules pasted at the bottom of `index.js`
- [ ] Do a test purchase with a Stripe test card `4242 4242 4242 4242`, then check your download page unlocks

## Notes

- Keep `sk_live_...` and `whsec_...` out of chat, screenshots, and git. They live only in Firebase function config.
- The 15-minute expiry on download links is deliberate: long enough to download, short enough that a shared link dies fast.
- Refunds: revoke access by deleting the buyer's `purchases/<uid>_<productId>` document in Firestore.
