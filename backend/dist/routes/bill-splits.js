"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
function isWithinEditWindow(createdAt) {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    return createdAt.getTime() > cutoff;
}
function parseReceiptItems(receiptItems) {
    if (!receiptItems)
        return [];
    try {
        const parsed = JSON.parse(receiptItems);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function hasUnassignedItems(receiptItems, itemAssignments) {
    const count = parseReceiptItems(receiptItems).length;
    if (count === 0)
        return false;
    const assignedIndexes = new Set((itemAssignments || []).map((a) => a.itemIndex));
    for (let i = 0; i < count; i++) {
        if (!assignedIndexes.has(i))
            return true;
    }
    return false;
}
router.post("/", async (req, res) => {
    try {
        const { expenseId, method, participants, itemAssignments, taxesAndCharges } = req.body;
        if (!expenseId || !method || !Array.isArray(participants) || participants.length < 2) {
            res.status(400).json({ error: "expenseId, method, and at least 2 participants are required" });
            return;
        }
        const validMethods = ["equal", "percentage", "custom", "by-item"];
        if (!validMethods.includes(method)) {
            res.status(400).json({ error: `method must be one of: ${validMethods.join(", ")}` });
            return;
        }
        const expense = await db_1.default.expense.findUnique({
            where: { id: expenseId },
            include: { billSplit: true },
        });
        if (!expense) {
            res.status(404).json({ error: "Expense not found" });
            return;
        }
        if (expense.billSplit) {
            res.status(400).json({ error: "Expense already has a bill split" });
            return;
        }
        if (participants.some((p) => !p.personId && !p.guestName)) {
            res.status(400).json({ error: "Each participant must have a personId or guestName" });
            return;
        }
        if (method === "percentage") {
            const totalPct = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
            if (Math.abs(totalPct - 100) > 0.01) {
                res.status(400).json({ error: "Percentages must add up to 100" });
                return;
            }
        }
        if (method === "equal") {
            const share = expense.amount / participants.length;
            participants.forEach((p) => { p.amountOwed = Math.round(share * 100) / 100; });
            const totalAssigned = participants.reduce((sum, p) => sum + p.amountOwed, 0);
            const diff = Math.round((expense.amount - totalAssigned) * 100) / 100;
            if (Math.abs(diff) > 0.001) {
                participants[participants.length - 1].amountOwed = Math.round((participants[participants.length - 1].amountOwed + diff) * 100) / 100;
            }
        }
        if (method === "percentage") {
            participants.forEach((p) => {
                p.amountOwed = Math.round((expense.amount * p.amountOwed / 100) * 100) / 100;
            });
        }
        if (method === "custom") {
            const totalCustom = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
            if (Math.abs(totalCustom - expense.amount) > 0.01) {
                res.status(400).json({ error: `Custom amounts (${totalCustom}) must equal expense amount (${expense.amount})` });
                return;
            }
        }
        if (method === "by-item") {
            if (hasUnassignedItems(expense.receiptItems, itemAssignments)) {
                res.status(400).json({ error: "Every receipt item must be assigned to at least one person" });
                return;
            }
            const taxPerPerson = taxesAndCharges && taxesAndCharges > 0
                ? Math.round((taxesAndCharges / participants.length) * 100) / 100
                : 0;
            participants.forEach((p, i) => {
                const itemTotal = (itemAssignments || [])
                    .filter((a) => a.participantIndex === i)
                    .reduce((sum, a) => sum + a.amount, 0);
                p.amountOwed = Math.round((itemTotal + taxPerPerson) * 100) / 100;
            });
        }
        const billSplit = await db_1.default.billSplit.create({
            data: {
                expenseId,
                method,
                totalAmount: expense.amount,
                participants: {
                    create: participants.map((p) => ({
                        personId: p.personId || null,
                        guestName: p.guestName || null,
                        amountOwed: p.amountOwed,
                    })),
                },
            },
            include: {
                participants: {
                    include: { person: true },
                },
                expense: { include: { category: true } },
            },
        });
        if (method === "by-item" && itemAssignments && itemAssignments.length > 0) {
            await db_1.default.billItemAssignment.createMany({
                data: itemAssignments.map((a) => ({
                    billSplitId: billSplit.id,
                    participantId: billSplit.participants[a.participantIndex].id,
                    itemIndex: a.itemIndex,
                    quantity: a.quantity,
                    unitPrice: a.unitPrice,
                    amount: a.amount,
                    splitRatio: a.splitRatio || null,
                })),
            });
        }
        res.status(201).json(billSplit);
    }
    catch (error) {
        console.error("Failed to create bill split:", error);
        res.status(500).json({ error: "Failed to create bill split" });
    }
});
router.get("/", async (req, res) => {
    try {
        const { expenseId } = req.query;
        const where = expenseId ? { expenseId: expenseId } : {};
        const billSplits = await db_1.default.billSplit.findMany({
            where,
            include: {
                participants: {
                    include: { person: true },
                },
                expense: { include: { category: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(billSplits);
    }
    catch (error) {
        console.error("Failed to fetch bill splits:", error);
        res.status(500).json({ error: "Failed to fetch bill splits" });
    }
});
router.get("/:id/assignments", async (req, res) => {
    try {
        const { id } = req.params;
        const billSplit = await db_1.default.billSplit.findUnique({ where: { id } });
        if (!billSplit) {
            res.status(404).json({ error: "Bill split not found" });
            return;
        }
        const assignments = await db_1.default.billItemAssignment.findMany({
            where: { billSplitId: id },
            include: { participant: { include: { person: true } } },
        });
        res.json(assignments);
    }
    catch (error) {
        console.error("Failed to fetch assignments:", error);
        res.status(500).json({ error: "Failed to fetch bill item assignments" });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { method, participants, itemAssignments, taxesAndCharges } = req.body;
        const existing = await db_1.default.billSplit.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Bill split not found" });
            return;
        }
        if (!isWithinEditWindow(existing.createdAt)) {
            res.status(403).json({ error: "Bill split can only be edited within 24 hours of creation" });
            return;
        }
        if (method) {
            const validMethods = ["equal", "percentage", "custom", "by-item"];
            if (!validMethods.includes(method)) {
                res.status(400).json({ error: `method must be one of: ${validMethods.join(", ")}` });
                return;
            }
        }
        const expense = await db_1.default.expense.findUnique({ where: { id: existing.expenseId } });
        if (!expense) {
            res.status(404).json({ error: "Associated expense not found" });
            return;
        }
        const updateData = {};
        if (method)
            updateData.method = method;
        const resolvedMethod = method || existing.method;
        if (participants) {
            if (participants.length < 2) {
                res.status(400).json({ error: "At least 2 participants are required" });
                return;
            }
            if (participants.some((p) => !p.personId && !p.guestName)) {
                res.status(400).json({ error: "Each participant must have a personId or guestName" });
                return;
            }
            if (resolvedMethod === "equal") {
                const share = expense.amount / participants.length;
                participants.forEach((p) => { p.amountOwed = Math.round(share * 100) / 100; });
                const totalAssigned = participants.reduce((sum, p) => sum + p.amountOwed, 0);
                const diff = Math.round((expense.amount - totalAssigned) * 100) / 100;
                if (Math.abs(diff) > 0.001) {
                    participants[participants.length - 1].amountOwed = Math.round((participants[participants.length - 1].amountOwed + diff) * 100) / 100;
                }
            }
            if (resolvedMethod === "percentage") {
                const totalPct = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
                if (Math.abs(totalPct - 100) > 0.01) {
                    res.status(400).json({ error: "Percentages must add up to 100" });
                    return;
                }
                participants.forEach((p) => {
                    p.amountOwed = Math.round((expense.amount * p.amountOwed / 100) * 100) / 100;
                });
            }
            if (resolvedMethod === "custom") {
                const totalCustom = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
                if (Math.abs(totalCustom - expense.amount) > 0.01) {
                    res.status(400).json({ error: `Custom amounts (${totalCustom}) must equal expense amount (${expense.amount})` });
                    return;
                }
            }
            if (resolvedMethod === "by-item") {
                if (hasUnassignedItems(expense.receiptItems, itemAssignments)) {
                    res.status(400).json({ error: "Every receipt item must be assigned to at least one person" });
                    return;
                }
                const taxPerPerson = taxesAndCharges && taxesAndCharges > 0
                    ? Math.round((taxesAndCharges / participants.length) * 100) / 100
                    : 0;
                participants.forEach((p, i) => {
                    const itemTotal = (itemAssignments || [])
                        .filter((a) => a.participantIndex === i)
                        .reduce((sum, a) => sum + a.amount, 0);
                    p.amountOwed = Math.round((itemTotal + taxPerPerson) * 100) / 100;
                });
            }
            await db_1.default.billItemAssignment.deleteMany({ where: { billSplitId: id } });
            await db_1.default.billParticipant.deleteMany({ where: { billSplitId: id } });
            const createdParticipants = await db_1.default.$transaction(participants.map((p) => db_1.default.billParticipant.create({
                data: {
                    billSplitId: id,
                    personId: p.personId || null,
                    guestName: p.guestName || null,
                    amountOwed: p.amountOwed,
                },
            })));
            if (resolvedMethod === "by-item" && itemAssignments && itemAssignments.length > 0) {
                await db_1.default.billItemAssignment.createMany({
                    data: itemAssignments.map((a) => ({
                        billSplitId: id,
                        participantId: createdParticipants[a.participantIndex].id,
                        itemIndex: a.itemIndex,
                        quantity: a.quantity,
                        unitPrice: a.unitPrice,
                        amount: a.amount,
                        splitRatio: a.splitRatio || null,
                    })),
                });
            }
        }
        const billSplit = await db_1.default.billSplit.update({
            where: { id },
            data: updateData,
            include: {
                participants: {
                    include: { person: true },
                },
                expense: { include: { category: true } },
            },
        });
        res.json(billSplit);
    }
    catch (error) {
        console.error("Failed to update bill split:", error);
        res.status(500).json({ error: "Failed to update bill split" });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db_1.default.billSplit.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Bill split not found" });
            return;
        }
        await db_1.default.billItemAssignment.deleteMany({ where: { billSplitId: id } });
        await db_1.default.billParticipant.deleteMany({ where: { billSplitId: id } });
        await db_1.default.billSplit.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Failed to delete bill split:", error);
        res.status(500).json({ error: "Failed to delete bill split" });
    }
});
router.patch("/:id/participants/:participantId/pay", async (req, res) => {
    try {
        const { id, participantId } = req.params;
        const billSplit = await db_1.default.billSplit.findUnique({ where: { id } });
        if (!billSplit) {
            res.status(404).json({ error: "Bill split not found" });
            return;
        }
        const participant = await db_1.default.billParticipant.findUnique({
            where: { id: participantId },
        });
        if (!participant || participant.billSplitId !== id) {
            res.status(404).json({ error: "Participant not found" });
            return;
        }
        const updated = await db_1.default.billParticipant.update({
            where: { id: participantId },
            data: { paid: !participant.paid },
            include: { person: true },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Failed to toggle payment status:", error);
        res.status(500).json({ error: "Failed to toggle payment status" });
    }
});
exports.default = router;
//# sourceMappingURL=bill-splits.js.map