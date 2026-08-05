"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
async function getDefaultUserId() {
    const user = await db_1.default.user.findFirst();
    if (!user)
        throw new Error("No user found. Run db seed first.");
    return user.id;
}
function isYou(p) {
    const name = (p.guestName || p.person?.name || "").trim().toLowerCase();
    return name === "you";
}
function toDebtDto(debt) {
    return {
        id: debt.id,
        source: debt.source,
        personId: debt.personId,
        guestName: debt.guestName,
        personName: debt.person?.name || debt.guestName || "Unknown",
        amount: debt.amount,
        currency: debt.currency,
        paid: debt.paid,
        createdAt: debt.createdAt.toISOString(),
        note: debt.note || null,
    };
}
router.get("/", async (_req, res) => {
    try {
        const userId = await getDefaultUserId();
        const [manual, participants] = await Promise.all([
            db_1.default.debt.findMany({
                where: { userId },
                include: { person: true },
                orderBy: { createdAt: "desc" },
            }),
            db_1.default.billParticipant.findMany({
                where: { paid: false },
                include: {
                    person: true,
                    billSplit: { include: { expense: true } },
                },
                orderBy: { billSplitId: "asc" },
            }),
        ]);
        const debts = participants
            .filter((p) => !isYou(p))
            .map((p) => ({
            id: p.id,
            source: "bill",
            personId: p.personId,
            guestName: p.guestName,
            personName: p.person?.name || p.guestName || "Unknown",
            amount: p.amountOwed,
            currency: p.billSplit.expense.currency,
            paid: p.paid,
            createdAt: p.billSplit.createdAt.toISOString(),
            billSplitId: p.billSplitId,
            expenseId: p.billSplit.expenseId,
            merchant: p.billSplit.expense.merchant,
        }));
        const manualDebts = manual.map((d) => toDebtDto({ ...d, source: "manual" }));
        res.json([...manualDebts, ...debts]);
    }
    catch (error) {
        console.error("Failed to fetch debts:", error);
        res.status(500).json({ error: "Failed to fetch debts" });
    }
});
router.post("/", async (req, res) => {
    try {
        const userId = await getDefaultUserId();
        const { personId, guestName, amount, currency, note } = req.body;
        if (!personId && !guestName) {
            res.status(400).json({ error: "A contact or guest name is required" });
            return;
        }
        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            res.status(400).json({ error: "amount must be a positive number" });
            return;
        }
        if (personId) {
            const person = await db_1.default.person.findUnique({ where: { id: personId } });
            if (!person) {
                res.status(404).json({ error: "Person not found" });
                return;
            }
        }
        const debt = await db_1.default.debt.create({
            data: {
                userId,
                personId: personId || null,
                guestName: guestName?.trim() || null,
                amount,
                currency: currency || "IDR",
                note: note?.trim() || null,
            },
            include: { person: true },
        });
        res.status(201).json(toDebtDto({ ...debt, source: "manual" }));
    }
    catch (error) {
        console.error("Failed to create debt:", error);
        res.status(500).json({ error: "Failed to create debt" });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, currency, note, personId, guestName } = req.body;
        const existing = await db_1.default.debt.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Debt not found" });
            return;
        }
        if (amount !== undefined && (typeof amount !== "number" || isNaN(amount) || amount <= 0)) {
            res.status(400).json({ error: "amount must be a positive number" });
            return;
        }
        const debt = await db_1.default.debt.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount }),
                ...(currency !== undefined && { currency }),
                ...(note !== undefined && { note: note.trim() || null }),
                ...(personId !== undefined && { personId: personId || null }),
                ...(guestName !== undefined && { guestName: guestName.trim() || null }),
            },
            include: { person: true },
        });
        res.json(toDebtDto({ ...debt, source: "manual" }));
    }
    catch (error) {
        console.error("Failed to update debt:", error);
        res.status(500).json({ error: "Failed to update debt" });
    }
});
router.patch("/:id/pay", async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db_1.default.debt.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Debt not found" });
            return;
        }
        const debt = await db_1.default.debt.update({
            where: { id },
            data: { paid: !existing.paid },
            include: { person: true },
        });
        res.json(toDebtDto({ ...debt, source: "manual" }));
    }
    catch (error) {
        console.error("Failed to toggle debt payment:", error);
        res.status(500).json({ error: "Failed to toggle debt payment" });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db_1.default.debt.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Debt not found" });
            return;
        }
        await db_1.default.debt.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Failed to delete debt:", error);
        res.status(500).json({ error: "Failed to delete debt" });
    }
});
exports.default = router;
//# sourceMappingURL=debts.js.map