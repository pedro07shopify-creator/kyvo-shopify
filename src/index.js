import "dotenv/config";
import express from "express";
import checkoutRouter from "./routes/checkout.js";
import instructionsRouter from "./routes/instructions.js";
import webhookRouter from "./routes/webhook.js";
import { getTransaction } from "./services/kyvo.js";

const app = express();

// Salva rawBody para validação de assinatura do webhook
app.use((req, res, next) => {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    req.rawBody = data;
    next();
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/checkout", checkoutRouter);
app.use("/instructions", instructionsRouter);
app.use("/webhooks", webhookRouter);

// Status polling (usado pela página de instruções)
app.get("/status/:chargeId", async (req, res) => {
  try {
    const tx = await getTransaction(req.params.chargeId);
    res.json({ status: tx.status });
  } catch {
    res.status(500).json({ status: "error" });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kyvo-Shopify rodando na porta ${PORT}`));
