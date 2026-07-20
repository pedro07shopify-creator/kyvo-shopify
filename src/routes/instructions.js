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
    const tx = await getTransaction(req.params.chargeId);

    // DEBUG: mostra estrutura completa enquanto mapeamos os campos corretos
    return res.send("<pre>" + JSON.stringify(tx, null, 2) + "</pre>");

    const spei = tx.instructions?.spei;

    if (!spei) return res.status(404).send("Cobrança não encontrada.");

    const amount = (tx.amount / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    const expires = new Date(spei.expires_at).toLocaleString("pt-BR", { timeZone: "America/Mexico_City" });
    const status = tx.status;

    const html = template
      .replace("{{CLABE}}", spei.clabe)
      .replace("{{BANCO}}", spei.bank)
      .replace("{{BENEFICIARIO}}", spei.beneficiary)
      .replace("{{REFERENCIA}}", spei.reference)
      .replace("{{VALOR}}", amount)
      .replace("{{EXPIRA}}", expires)
      .replace("{{STATUS}}", status)
      .replace("{{CHARGE_ID}}", tx.id);

    res.send(html);
  } catch (err) {
    console.error("[instructions]", err.message);
    res.status(500).send("Erro: " + err.message);
  }
});

export default router;
