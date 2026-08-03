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
        const expenses = await db_1.default.expense.findMany({
            include: { category: true },
            orderBy: { date: "desc" },
        });
        res.json(expenses);
    }
    catch (error) {
        console.error("Failed to fetch expenses:", error);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});
router.post("/", async (req, res) => {
    try {
        const { amount, date, merchant, categoryId, notes, currency } = req.body;
        if (!amount || !date || !merchant || !categoryId) {
            res.status(400).json({
                error: "amount, date, merchant, and categoryId are required",
            });
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            res.status(400).json({ error: "amount must be a positive number" });
            return;
        }
        const category = await db_1.default.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            res.status(400).json({ error: "category not found" });
            return;
        }
        const defaultUser = await db_1.default.user.findFirst();
        if (!defaultUser) {
            res.status(400).json({
                error: "No user found. Please run the database seed to create a default user.",
            });
            return;
        }
        const expense = await db_1.default.expense.create({
            data: {
                userId: defaultUser.id,
                amount: parsedAmount,
                date: new Date(date),
                merchant,
                categoryId,
                notes: notes || null,
                source: "manual",
                currency: currency || defaultUser.defaultCurrency || "IDR",
            },
            include: { category: true },
        });
        res.status(201).json(expense);
    }
    catch (error) {
        console.error("Failed to create expense:", error);
        res.status(500).json({ error: "Failed to create expense" });
    }
});
exports.default = router;
//# sourceMappingURL=expenses.js.map