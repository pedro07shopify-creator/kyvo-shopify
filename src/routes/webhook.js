import { Router } from "express";
import crypto from "crypto";
import { completeDraftOrder, addOrderTransaction } from "../services/shopify.js";

const router = Router();

// Guarda transaction_ids já processados (em produção use Redis/DB)
const processed = new Set();

// POST /webhooks/kyvo
// Recebe payment.paid da Kyvo Pay
router.post("/kyvo", (req, res) => {
  const ts = req.headers["x-kyvo-timestamp"];
  const sigHeader = String(req.headers["x-kyvo-signature"] || "").replace("sha256=", "");
  const rawBody = req.rawBody;

  // 1. Valida assinatura HMAC-SHA256
  const expected = crypto
    .createHmac("sha256", process.env.KYVO_WHSEC)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader.padEnd(expected.length, " ")))) {
    console.warn("[webhook] assinatura inválida");
    return res.sendStatus(401);
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "payment.paid") return res.sendStatus(200);

  const { transaction_id, amount, external_order_id } = event.data;

  // 2. Idempotência
  if (processed.has(transaction_id)) {
    console.log(`[webhook] ${transaction_id} já processado`);
    return res.sendStatus(200);
  }
  processed.add(transaction_id);

  // 3. Processa em background (responde 200 rápido)
  res.sendStatus(200);

  setImmediate(async () => {
    try {
      const draftOrderId = external_order_id;
      console.log(`[webhook] completando draft_order ${draftOrderId}`);

      // Completa o Draft Order → vira pedido confirmado
      const completed = await completeDraftOrder(draftOrderId);
      const orderId = completed.order_id;

      // Registra a transação de pagamento no pedido
      await addOrderTransaction(orderId, amount, transaction_id);

      console.log(`[webhook] pedido ${orderId} marcado como pago ✓`);
    } catch (err) {
      console.error("[webhook] erro ao processar pagamento:", err.message);
    }
  });
});

export default router;
