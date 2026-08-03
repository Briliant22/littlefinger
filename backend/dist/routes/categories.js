"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        const categories = await db_1.default.category.findMany({
            orderBy: { name: "asc" },
        });
        res.json(categories);
    }
    catch (error) {
        console.error("Failed to fetch categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map