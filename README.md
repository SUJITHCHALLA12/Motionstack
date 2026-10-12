# Motionstack

Animated UI components store — login screens, buttons, toggles, loaders, modals,
cards, navbars, heroes, footers, scroll packs, backgrounds, dashboards,
e-commerce kits, social proof, pricing tables, and full website templates.
New components land here every day.

**Live site:** coming soon — this repo is the release vehicle.

## Run it locally

It's a single static file. Either open `index.html` directly, or serve it:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The whole store — catalog, live animated previews, pricing, auth UI |
| `functions/index.js` | Firebase Function: Stripe webhook → records purchase in Firestore → issues 15-min signed download URLs |
| `functions/SETUP.md` | Step-by-step guide for the Stripe + Firebase wiring |

Components are priced by motion level (set once, applied to every drop):

- **L1 Essential** — subtle hovers/fades · **L2 Fluid** — keyframes, micro-interactions
- **L3 Rich** — choreographed/3D/scroll motion · **L4 Cinematic** — physics/cursor-reactive

₹ table — login screens 29/49/69/99 · small components 19/29/39/59 ·
section kits 49/69/89/119 · bundles 349/449/549 · templates 199/399/599/699.

## Release checklist (Sujith's tasks)

- [ ] Paste your Firebase web config into `FIREBASE_CONFIG` in `index.html`
  (project **AI-Horizons**; enable Google + GitHub providers in Firebase Auth)
- [ ] Create Stripe Products + Prices, then one **Payment Link** per product;
  wire the links into the store's Buy buttons (same `client_reference_id` pattern
  the function expects — never invent link URLs, use the real ones from Stripe)
- [ ] Deploy `functions/` (`functions/SETUP.md` — ~30 min), add the Stripe webhook
- [ ] Upload product zips to Firebase Storage as `products/<productId>.zip`
- [ ] Confirm the Firestore rules from the bottom of `functions/index.js` are live
- [ ] Do a test purchase (Stripe test card `4242 4242 4242 4242`), check downloads unlock
- [ ] Host it: Firebase Hosting, Vercel, Netlify, or GitHub Pages — then announce

## Daily drops

Every morning a new component ships in each section (plus a website template
once or twice a week). Drops are committed here daily by Muse, so the repo is
always the latest version of the store.

## License

All component source is commercial — buying a component gets you the full
organized source, variants, docs, lifetime updates, and a commercial license.
No redistribution of purchased source.
