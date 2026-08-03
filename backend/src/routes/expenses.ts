import { Router } from "express";
import prisma from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        category: true,
        billSplit: {
          include: {
            participants: {
              include: { person: true },
            },
            itemAssignments: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
    res.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { amount, date, merchant, categoryId, notes, currency, receiptItems } = req.body;

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

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      res.status(400).json({ error: "category not found" });
      return;
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      res.status(400).json({
        error:
          "No user found. Please run the database seed to create a default user.",
      });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        userId: defaultUser.id,
        amount: parsedAmount,
        date: new Date(date),
        merchant,
        categoryId,
        notes: notes || null,
        receiptItems: receiptItems ? JSON.stringify(receiptItems) : null,
        source: "manual",
        currency: currency || defaultUser.defaultCurrency || "IDR",
      },
      include: {
        category: true,
        billSplit: {
          include: {
            participants: {
              include: { person: true },
            },
            itemAssignments: true,
          },
        },
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Failed to create expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const { expenses } = req.body;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      res.status(400).json({ error: "expenses must be a non-empty array" });
      return;
    }

    for (const [i, item] of expenses.entries()) {
      const { amount, date, merchant, categoryId } = item;
      if (!amount || !date || !merchant || !categoryId) {
        res.status(400).json({
          error: `Row ${i + 1}: amount, date, merchant, and categoryId are required`,
          row: i,
        });
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({
          error: `Row ${i + 1}: amount must be a positive number`,
          row: i,
        });
        return;
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        res.status(400).json({
          error: `Row ${i + 1}: category not found`,
          row: i,
        });
        return;
      }
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      res.status(400).json({
        error: "No user found. Please run the database seed to create a default user.",
      });
      return;
    }

    const created = await prisma.$transaction(
      expenses.map((item: { amount: string; date: string; merchant: string; categoryId: string; notes?: string; currency?: string }) =>
        prisma.expense.create({
          data: {
            userId: defaultUser.id,
            amount: parseFloat(item.amount),
            date: new Date(item.date),
            merchant: item.merchant,
            categoryId: item.categoryId,
            notes: item.notes || null,
            source: "manual",
            currency: item.currency || defaultUser.defaultCurrency || "IDR",
          },
          include: {
            category: true,
            billSplit: {
              include: {
                participants: {
                  include: { person: true },
                },
                itemAssignments: true,
              },
            },
          },
        })
      )
    );

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create expenses in bulk:", error);
    res.status(500).json({ error: "Failed to create expenses in bulk" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, merchant, categoryId, notes, currency } = req.body;

    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { billSplit: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    if (existing.billSplit) {
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;
      if (existing.billSplit.createdAt.getTime() <= cutoff) {
        res.status(403).json({ error: "Expense with bill split can only be edited within 24 hours of creation" });
        return;
      }
    }

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" });
        return;
      }
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        res.status(400).json({ error: "category not found" });
        return;
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(merchant !== undefined && { merchant }),
        ...(categoryId !== undefined && { categoryId }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(currency !== undefined && { currency }),
      },
      include: {
        category: true,
        billSplit: {
          include: {
            participants: {
              include: { person: true },
            },
            itemAssignments: true,
          },
        },
      },
    });

    res.json(expense);
  } catch (error) {
    console.error("Failed to update expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const billSplit = await prisma.billSplit.findUnique({ where: { expenseId: id } });
    if (billSplit) {
      await prisma.billItemAssignment.deleteMany({ where: { billSplitId: billSplit.id } });
      await prisma.billParticipant.deleteMany({ where: { billSplitId: billSplit.id } });
      await prisma.billSplit.delete({ where: { id: billSplit.id } });
    }
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
