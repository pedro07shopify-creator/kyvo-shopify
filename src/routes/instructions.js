import { Router } from "express";
import { getTransaction } from "../services/kyvo.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const router = Router();
const __dir = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(__dir, "../views/instructions.html"), "utf8");

// GET /instructions/:chargeId
router.get("/:chargeId", async (req, res) => {
  try {
    const q = req.query;
    const tx = await getTransaction(req.params.chargeId);

    const spei = tx.instructions?.spei || tx.speiInstructions || tx.spei || {};

    const clabe       = spei.clabe       || q.clabe || "";
    const bank        = spei.bank        || q.bank  || "";
    const beneficiary = spei.beneficiary || q.bene  || "";
    const reference   = spei.reference   || q.ref   || req.params.chargeId;
    const expiresRaw  = spei.expires_at  || q.exp   || "";
    const amountCents = tx.amount        || parseInt(q.amount) || 0;

    const amount  = (amountCents / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    const expires = expiresRaw ? new Date(expiresRaw).toLocaleString("es-MX", { timeZone: "America/Mexico_City" }) : "—";

    const html = template
      .replaceAll("{{CLABE}}",       clabe)
      .replaceAll("{{BANCO}}",       bank)
      .replaceAll("{{BENEFICIARIO}}", beneficiary)
      .replaceAll("{{REFERENCIA}}",  reference)
      .replaceAll("{{VALOR}}",       amount)
      .replaceAll("{{EXPIRA}}",      expires)
      .replaceAll("{{STATUS}}",      tx.status || "pending")
      .replaceAll("{{CHARGE_ID}}",   tx.id || req.params.chargeId);

    res.send(html);
  } catch (err) {
    console.error("[instructions]", err.message);
    res.status(500).send("Erro: " + err.message);
  }
});

export default router;
