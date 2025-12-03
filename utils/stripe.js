import Stripe from "stripe";

const key = process.env.STRIPE_SECRET;

if (!key) {
   throw new Error("STRIPE_SECRET no definida en .env");
}
if (key.startsWith("pk_")) {
   throw new Error("STRIPE_SECRET contiene una clave publicable (pk_). Usa la clave secreta (sk_...).");
}

export const stripe = new Stripe(key, { apiVersion: "2022-11-15" });
