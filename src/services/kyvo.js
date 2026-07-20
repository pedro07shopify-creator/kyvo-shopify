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
    body: JSON.stringify({ amount, customer: { name: customer.name, email: customer.email, document: customer.document }, externalOrderId, sourceUrl, metadata }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("[kyvo] createCharge error:", errBody);
    throw new Error(`Kyvo createCharge → ${res.status}: ${errBody}`);
  }
  const data = await res.json();
  console.log("[kyvo] createCharge response:", JSON.stringify(data));
  return data;
}

export async function getTransaction(id) {
  const url = `${BASE}/transactions/${id}`;
  console.log("[kyvo] getTransaction URL:", url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KYVO_API_KEY}` },
  });
  const text = await res.text();
  console.log("[kyvo] getTransaction status:", res.status, "body:", text);
  if (!res.ok) throw new Error(`Kyvo getTransaction ${res.status}: ${text}`);
  return JSON.parse(text);
}
