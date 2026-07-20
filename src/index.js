import "dotenv/config";
import express from "express";
import checkoutRouter from "./routes/checkout.js";
import instructionsRouter from "./routes/instructions.js";
import webhookRouter from "./routes/webhook.js";
import { getTransaction } from "./services/kyvo.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// rawBody capturado via verify do express.json (não consome o stream antes do parser)
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); }
}));
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
