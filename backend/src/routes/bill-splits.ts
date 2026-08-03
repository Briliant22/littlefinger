import { Router } from "express";
import prisma from "../db";

interface ParticipantInput {
  personId?: string;
  guestName?: string;
  amountOwed: number;
}

interface ItemAssignmentInput {
  participantIndex: number;
  itemIndex: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  splitRatio?: string;
}

const router = Router();

function isWithinEditWindow(createdAt: Date): boolean {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return createdAt.getTime() > cutoff;
}

function parseReceiptItems(receiptItems: string | null): Array<Record<string, unknown>> {
  if (!receiptItems) return [];
  try {
    const parsed = JSON.parse(receiptItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasUnassignedItems(
  receiptItems: string | null,
  itemAssignments: ItemAssignmentInput[] | undefined
): boolean {
  const count = parseReceiptItems(receiptItems).length;
  if (count === 0) return false;
  const assignedIndexes = new Set((itemAssignments || []).map((a) => a.itemIndex));
  for (let i = 0; i < count; i++) {
    if (!assignedIndexes.has(i)) return true;
  }
  return false;
}

router.post("/", async (req, res) => {
  try {
    const { expenseId, method, participants, itemAssignments, taxesAndCharges } = req.body as {
      expenseId: string;
      method: string;
      participants: ParticipantInput[];
      itemAssignments?: ItemAssignmentInput[];
      taxesAndCharges?: number;
    };

    if (!expenseId || !method || !Array.isArray(participants) || participants.length < 2) {
      res.status(400).json({ error: "expenseId, method, and at least 2 participants are required" });
      return;
    }

    const validMethods = ["equal", "percentage", "custom", "by-item"] as const;
    if (!validMethods.includes(method as typeof validMethods[number])) {
      res.status(400).json({ error: `method must be one of: ${validMethods.join(", ")}` });
      return;
    }

    const expense = await prisma.expense.findUnique({
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

    const billSplit = await prisma.billSplit.create({
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
      await prisma.billItemAssignment.createMany({
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
  } catch (error) {
    console.error("Failed to create bill split:", error);
    res.status(500).json({ error: "Failed to create bill split" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { expenseId } = req.query;
    const where = expenseId ? { expenseId: expenseId as string } : {};

    const billSplits = await prisma.billSplit.findMany({
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
  } catch (error) {
    console.error("Failed to fetch bill splits:", error);
    res.status(500).json({ error: "Failed to fetch bill splits" });
  }
});

router.get("/:id/assignments", async (req, res) => {
  try {
    const { id } = req.params;

    const billSplit = await prisma.billSplit.findUnique({ where: { id } });
    if (!billSplit) {
      res.status(404).json({ error: "Bill split not found" });
      return;
    }

    const assignments = await prisma.billItemAssignment.findMany({
      where: { billSplitId: id },
      include: { participant: { include: { person: true } } },
    });

    res.json(assignments);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    res.status(500).json({ error: "Failed to fetch bill item assignments" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { method, participants, itemAssignments, taxesAndCharges } = req.body as {
      method?: string;
      participants?: ParticipantInput[];
      itemAssignments?: ItemAssignmentInput[];
      taxesAndCharges?: number;
    };

    const existing = await prisma.billSplit.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Bill split not found" });
      return;
    }

    if (!isWithinEditWindow(existing.createdAt)) {
      res.status(403).json({ error: "Bill split can only be edited within 24 hours of creation" });
      return;
    }

    if (method) {
      const validMethods = ["equal", "percentage", "custom", "by-item"] as const;
      if (!validMethods.includes(method as typeof validMethods[number])) {
        res.status(400).json({ error: `method must be one of: ${validMethods.join(", ")}` });
        return;
      }
    }

    const expense = await prisma.expense.findUnique({ where: { id: existing.expenseId } });
    if (!expense) {
      res.status(404).json({ error: "Associated expense not found" });
      return;
    }

    const updateData: Record<string, string> = {};
    if (method) updateData.method = method;
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

      await prisma.billItemAssignment.deleteMany({ where: { billSplitId: id } });
      await prisma.billParticipant.deleteMany({ where: { billSplitId: id } });

      const createdParticipants = await prisma.$transaction(
        participants.map((p) =>
          prisma.billParticipant.create({
            data: {
              billSplitId: id,
              personId: p.personId || null,
              guestName: p.guestName || null,
              amountOwed: p.amountOwed,
            },
          })
        )
      );

      if (resolvedMethod === "by-item" && itemAssignments && itemAssignments.length > 0) {
        await prisma.billItemAssignment.createMany({
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

    const billSplit = await prisma.billSplit.update({
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
  } catch (error) {
    console.error("Failed to update bill split:", error);
    res.status(500).json({ error: "Failed to update bill split" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.billSplit.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Bill split not found" });
      return;
    }

    await prisma.billItemAssignment.deleteMany({ where: { billSplitId: id } });
    await prisma.billParticipant.deleteMany({ where: { billSplitId: id } });
    await prisma.billSplit.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete bill split:", error);
    res.status(500).json({ error: "Failed to delete bill split" });
  }
});

router.patch("/:id/participants/:participantId/pay", async (req, res) => {
  try {
    const { id, participantId } = req.params;

    const billSplit = await prisma.billSplit.findUnique({ where: { id } });
    if (!billSplit) {
      res.status(404).json({ error: "Bill split not found" });
      return;
    }

    const participant = await prisma.billParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant || participant.billSplitId !== id) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }

    const updated = await prisma.billParticipant.update({
      where: { id: participantId },
      data: { paid: !participant.paid },
      include: { person: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("Failed to toggle payment status:", error);
    res.status(500).json({ error: "Failed to toggle payment status" });
  }
});

export default router;
