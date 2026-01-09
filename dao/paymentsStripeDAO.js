import { query } from "../db/index.js";

export const PaymentsStripeDAO = {
   insertPayment: async ({
      userId = null,
      email = null,
      amount_cents,
      currency,
      description,
      intent_id,
      status,
      metadata = {},
   }) => {
      const r = await query(
         `INSERT INTO pagos_stripe
            (user_id, email, amount, currency, description, intent_id, gateway, status, metadata, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
         [userId, email, amount_cents, currency, description, intent_id, "stripe", status, JSON.stringify(metadata)],
      );
      return r.rows[0];
   },

   updatePaymentStatusByIntent: async (intentId, status, observations) => {
      // console.log("\x1b[34m", "updatePaymentStatusByIntent   =>", { intentId, status, observations });
      await query(
         `UPDATE pagos_stripe
          SET status = $1, observations = $2, updated_at = NOW()
          WHERE intent_id = $3`,
         [status, observations, intentId],
      );
   },

   findPaymentByIntent: async (intentId) => {
      const r = await query(`SELECT * FROM pagos_stripe WHERE intent_id = $1 LIMIT 1`, [intentId]);
      return r.rows[0];
   },
};
