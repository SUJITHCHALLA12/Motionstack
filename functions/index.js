/**
 * Motionstack — automatic download delivery via Stripe webhooks.
 *
 * Deploy to Firebase Functions (Node 18+):
 *   1. firebase init functions   (or drop this file into functions/index.js)
 *   2. npm install stripe firebase-admin firebase-functions
 *   3. firebase functions:config:set stripe.secret="sk_live_..." stripe.webhook="whsec_..."
 *   4. Fill in PRODUCT_MAP below with your Stripe price IDs -> store product IDs
 *   5. Upload each product as products/<productId>.zip to Firebase Storage
 *   6. firebase deploy --only functions
 *   7. In Stripe Dashboard > Developers > Webhooks, add endpoint:
 *        https://<region>-<project-id>.cloudfunctions.net/stripeWebhook
 *      listening to: checkout.session.completed
 *      Copy the endpoint's Signing secret into stripe.webhook config (step 3).
 *
 * How it connects to the store:
 * - Buy buttons append ?client_reference_id=<firebaseUid>&prefilled_email=<email>
 *   to the Stripe Payment Link, so the webhook can match the payment to the user.
 * - The store's download page calls the getDownloadUrl function for each owned
 *   product and renders time-limited (15 min) download links.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

const stripe = Stripe(functions.config().stripe.secret);
const webhookSecret = functions.config().stripe.webhook;

/**
 * Map Stripe price IDs (price_...) — or Payment Link IDs (plink_...) as fallback —
 * to the store's product IDs (the same IDs used in products/<productId>.zip).
 */
const PRODUCT_MAP = {
  // "price_1ABC...": "portal-login-suite",
  // "price_1DEF...": "magnetic-actions",
  // "price_1GHI...": "glass-atlas",
  // "price_1JKL...": "studio-zero",
  // "price_1MNO...": "glow-switch-kit",
};

/**
 * Receives Stripe's checkout.session.completed webhook, verifies the signature,
 * and records each purchased product under the buyer's Firebase UID.
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    // NOTE: firebase-functions v1 exposes the raw body as req.rawBody.
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.client_reference_id; // Firebase UID passed on the Buy button
    const email = session.customer_details && session.customer_details.email;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const productIds = lineItems.data
        .map((li) => PRODUCT_MAP[li.price.id] || PRODUCT_MAP[session.payment_link])
        .filter(Boolean);

      if (uid && productIds.length > 0) {
        const batch = db.batch();
        productIds.forEach((pid) => {
          batch.set(
            db.collection("purchases").doc(`${uid}_${pid}`),
            {
              uid,
              productId: pid,
              email: email || null,
              purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
              stripeSessionId: session.id,
            },
            { merge: true }
          );
        });
        await batch.commit();
        console.log(`Unlocked [${productIds.join(", ")}] for uid ${uid}`);
      } else {
        console.warn(
          `No UID or no mapped products for session ${session.id}. ` +
            `Add the price IDs to PRODUCT_MAP and ensure Buy buttons pass client_reference_id.`
        );
      }
    } catch (err) {
      console.error("Failed to record purchase:", err);
      return res.status(500).send("Failed to record purchase");
    }
  }

  res.json({ received: true });
});

/**
 * Callable by the signed-in buyer from the store's download page.
 * Verifies ownership in Firestore, then returns a 15-minute signed Storage URL.
 */
exports.getDownloadUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in to download.");
  }
  const productId = String(data.productId || "").trim();
  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing productId.");
  }

  const snap = await db.collection("purchases").doc(`${context.auth.uid}_${productId}`).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "This product is not in your library yet."
    );
  }

  const file = admin.storage().bucket().file(`products/${productId}.zip`);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
  return { url };
});

/**
 * Firestore security rules (firestore.rules) — buyers can only read their own purchases:
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /purchases/{doc} {
 *         allow read: if request.auth != null && resource.data.uid == request.auth.uid;
 *         allow write: if false; // only this webhook writes
 *       }
 *     }
 *   }
 */
