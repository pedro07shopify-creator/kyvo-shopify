import { Router } from "express";
import { createDraftOrder } from "../services/shopify.js";
import { createCharge } from "../services/kyvo.js";

const router = Router();

// POST /checkout
// Aceita payload do snippet Shopify: { line_items, customer_email, source_url, utm }
// ou payload direto:              { lineItems, customer: { name, email }, sourceUrl }
router.post("/", async (req, res) => {
  const body = req.body;

  const lineItems = body.lineItems || body.line_items;
  const sourceUrl = body.sourceUrl || body.source_url;

  const customerEmail    = body.customer?.email    || body.customer_email    || "";
  const customerName     = body.customer?.name     || body.customer_name     || customerEmail.split("@")[0] || "Cliente";
  const customerDocument = body.customer?.document || body.customer_document || "";

  const customer = { name: customerName, email: customerEmail, document: customerDocument };

  if (!lineItems?.length) {
    return res.status(400).json({ error: "line_items é obrigatório" });
  }

  try {
    // Normaliza line_items: Shopify draft order aceita só variant_id + quantity
    const shopifyLineItems = lineItems.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));

    const draftPayload = {
      lineItems: shopifyLineItems,
      note: "Aguardando pagamento SPEI via Kyvo Pay",
    };
    if (customer.email) {
      draftPayload.customer = {
        first_name: customer.name.split(" ")[0],
        last_name: customer.name.split(" ").slice(1).join(" ") || "-",
        email: customer.email,
      };
    }

    // 1. Cria Draft Order no Shopify
    const draft = await createDraftOrder(draftPayload);

    // 2. Cria cobrança SPEI na Kyvo
    // subtotal_price em reais → precisa estar em centavos de MXN
    const amountCents = Math.round(parseFloat(draft.subtotal_price) * 100);

    const charge = await createCharge({
      amount: amountCents,
      customer: { name: customer.name, email: customer.email, document: customer.document },
      externalOrderId: String(draft.id),
      sourceUrl: sourceUrl || `https://${process.env.SHOPIFY_STORE}`,
      metadata: { shopify_draft_order_id: String(draft.id) },
    });

    // 3. Monta URL de instruções com todos os dados SPEI disponíveis
    const spei = charge.speiInstructions || charge.instructions?.spei || charge.spei || {};
    const params = new URLSearchParams({
      draft: draft.id,
      amount: amountCents,
      clabe:  spei.clabe        || charge.clabe        || "",
      bank:   spei.bank         || charge.bank          || "",
      ref:    spei.reference    || charge.reference     || charge.id,
      bene:   spei.beneficiary  || charge.beneficiary   || "",
      exp:    spei.expires_at   || charge.expiresAt     || "",
    });
    const instructionsUrl = `${process.env.APP_URL}/instructions/${charge.id}?${params}`;
    res.json({ redirect: instructionsUrl, chargeId: charge.id, draftOrderId: draft.id });
  } catch (err) {
    console.error("[checkout]", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
