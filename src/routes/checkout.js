import { Router } from "express";
import { createDraftOrder } from "../services/shopify.js";
import { createCharge } from "../services/kyvo.js";

const router = Router();

// POST /checkout
// Body: { lineItems, customer: { name, email }, sourceUrl }
router.post("/", async (req, res) => {
  const { lineItems, customer, sourceUrl } = req.body;

  if (!lineItems?.length || !customer?.name || !customer?.email) {
    return res.status(400).json({ error: "lineItems, customer.name e customer.email são obrigatórios" });
  }

  try {
    // 1. Cria Draft Order no Shopify
    const draft = await createDraftOrder({
      lineItems,
      customer: { first_name: customer.name.split(" ")[0], last_name: customer.name.split(" ").slice(1).join(" "), email: customer.email },
      note: "Aguardando pagamento SPEI via Kyvo Pay",
    });

    // 2. Cria cobrança SPEI na Kyvo
    // subtotal_price em reais → precisa estar em centavos de MXN
    const amountCents = Math.round(parseFloat(draft.subtotal_price) * 100);

    const charge = await createCharge({
      amount: amountCents,
      customer: { name: customer.name, email: customer.email },
      externalOrderId: String(draft.id),
      sourceUrl: sourceUrl || `https://${process.env.SHOPIFY_STORE}`,
      metadata: { shopify_draft_order_id: String(draft.id) },
    });

    // 3. Redireciona para página de instruções
    const instructionsUrl = `${process.env.APP_URL}/instructions/${charge.id}?draft=${draft.id}`;
    res.json({ redirect: instructionsUrl, chargeId: charge.id, draftOrderId: draft.id });
  } catch (err) {
    console.error("[checkout]", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
