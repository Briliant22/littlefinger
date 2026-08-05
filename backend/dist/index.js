"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load root .env first, then backend .env (won't override root)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./db"));
const categories_1 = __importDefault(require("./routes/categories"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const user_1 = __importDefault(require("./routes/user"));
const people_1 = __importDefault(require("./routes/people"));
const bill_splits_1 = __importDefault(require("./routes/bill-splits"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const debts_1 = __importDefault(require("./routes/debts"));
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "50mb" }));
app.use("/uploads", express_1.default.static(path_1.default.resolve(__dirname, "../uploads")));
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use("/api/categories", categories_1.default);
app.use("/api/expenses", expenses_1.default);
app.use("/api/user", user_1.default);
app.use("/api/people", people_1.default);
app.use("/api/bill-splits", bill_splits_1.default);
app.use("/api/receipts", receipts_1.default);
app.use("/api/debts", debts_1.default);
app.listen(port, () => {
    const hasApiKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 0;
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Receipt scanning: ${hasApiKey ? "ready" : "disabled (set OPENROUTER_API_KEY)"}`);
});
process.on("SIGINT", async () => {
    await db_1.default.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await db_1.default.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map