import fetch from "node-fetch";

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/2024-04`;
const HEADERS = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
};

async function shopifyRequest(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shopify ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

export async function createDraftOrder({ lineItems, customer, note }) {
  const body = {
    line_items: lineItems,
    note,
    use_customer_default_address: false,
  };
  if (customer) body.customer = customer;

  const data = await shopifyRequest("POST", "/draft_orders.json", { draft_order: body });
  return data.draft_order;
}

export async function completeDraftOrder(draftOrderId) {
  const data = await shopifyRequest(
    "PUT",
    `/draft_orders/${draftOrderId}/complete.json?payment_pending=false`,
    {}
  );
  return data.draft_order;
}

export async function addOrderTransaction(orderId, amount, kyvTransactionId) {
  const data = await shopifyRequest(
    "POST",
    `/orders/${orderId}/transactions.json`,
    {
      transaction: {
        kind: "capture",
        status: "success",
        amount: (amount / 100).toFixed(2),
        currency: "MXN",
        gateway: "Kyvo Pay (SPEI)",
        authorization: kyvTransactionId,
      },
    }
  );
  return data.transaction;
}
