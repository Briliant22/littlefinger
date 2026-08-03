"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./db"));
const categories_1 = __importDefault(require("./routes/categories"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const user_1 = __importDefault(require("./routes/user"));
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use("/api/categories", categories_1.default);
app.use("/api/expenses", expenses_1.default);
app.use("/api/user", user_1.default);
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
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