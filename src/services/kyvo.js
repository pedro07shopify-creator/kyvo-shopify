import fetch from "node-fetch";

const BASE = "https://kyvopay.com/api/v1";

export async function createCharge({ amount, customer, externalOrderId, sourceUrl, metadata }) {
  const res = await fetch(`${BASE}/spei/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KYVO_API_KEY}`,
      "Idempotency-Key": externalOrderId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, customer, externalOrderId, sourceUrl, metadata }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Kyvo createCharge → ${res.status}: ${err?.error?.code}`);
  }
  return res.json();
}

export async function getTransaction(id) {
  const res = await fetch(`${BASE}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${process.env.KYVO_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Kyvo getTransaction → ${res.status}`);
  return res.json();
}
