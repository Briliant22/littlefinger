import dotenv from "dotenv";
import path from "path";

// Load root .env first, then backend .env (won't override root)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import prisma from "./db";
import categoriesRouter from "./routes/categories";
import expensesRouter from "./routes/expenses";
import userRouter from "./routes/user";
import peopleRouter from "./routes/people";
import billSplitsRouter from "./routes/bill-splits";
import receiptsRouter from "./routes/receipts";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/categories", categoriesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/user", userRouter);
app.use("/api/people", peopleRouter);
app.use("/api/bill-splits", billSplitsRouter);
app.use("/api/receipts", receiptsRouter);

app.listen(port, () => {
  const hasApiKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 0;
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Receipt scanning: ${hasApiKey ? "ready" : "disabled (set OPENROUTER_API_KEY)"}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
