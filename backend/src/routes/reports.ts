import { Router } from "express";
import prisma from "../db";

const router = Router();

type ReportType = "weekly" | "monthly";

interface ReportStats {
  totalSpent: number;
  txCount: number;
  topCategory: string | null;
  topMerchant: string | null;
  largestExpense: { amount: number; merchant: string } | null;
  unpaidIouTotal: number;
  currency: string;
  vsPreviousPercent: number | null;
}

async function getDefaultUserId(): Promise<string> {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found. Run db seed first.");
  return user.id;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getExpectedPeriod(
  type: ReportType
): { periodStart: Date; periodEnd: Date; label: string } {
  const now = new Date();
  if (type === "weekly") {
    const monday = getMonday(now);
    const periodStart = new Date(monday);
    periodStart.setDate(periodStart.getDate() - 7);
    const periodEnd = new Date(monday);
    periodEnd.setDate(periodEnd.getDate() - 1);
    const fmt = { month: "short", day: "numeric" } as const;
    const label = `${periodStart.toLocaleDateString("en-US", fmt)} – ${periodEnd.toLocaleDateString(
      "en-US",
      fmt
    )}`;
    return { periodStart, periodEnd, label };
  }
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const label = periodStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return { periodStart, periodEnd, label };
}

function getPreviousPeriodBounds(
  type: ReportType,
  periodStart: Date,
  periodEnd: Date
): { periodStart: Date; periodEnd: Date } {
  if (type === "weekly") {
    const prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(periodEnd);
    prevEnd.setDate(prevEnd.getDate() - 7);
    return { periodStart: prevStart, periodEnd: prevEnd };
  }
  return {
    periodStart: new Date(periodStart.getFullYear(), periodStart.getMonth() - 1, 1),
    periodEnd: new Date(periodStart.getFullYear(), periodStart.getMonth(), 0),
  };
}

function isYou(p: { guestName: string | null; person: { name: string } | null }): boolean {
  const name = (p.guestName || p.person?.name || "").trim().toLowerCase();
  return name === "you";
}

function netExpenseAmount(expense: {
  amount: number;
  billSplit: { participants: Array<{ amountOwed: number }> } | null;
}): number {
  if (!expense.billSplit) return round2(expense.amount);
  const othersTotal = expense.billSplit.participants.reduce((sum, p) => sum + p.amountOwed, 0);
  return round2(Math.max(expense.amount - othersTotal, 0));
}

function maxKey(map: Map<string, number>): string | null {
  let best: string | null = null;
  let bestValue = -Infinity;
  map.forEach((value, key) => {
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  });
  return best;
}

async function getPeriodStats(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  totalSpent: number;
  txCount: number;
  topCategory: string | null;
  topMerchant: string | null;
  largestExpense: { amount: number; merchant: string } | null;
}> {
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: periodStart, lt: periodEnd } },
    include: { category: true, billSplit: { include: { participants: true } } },
  });

  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  let totalSpent = 0;
  let largestExpense: { amount: number; merchant: string } | null = null;

  for (const expense of expenses) {
    const net = netExpenseAmount(expense);
    totalSpent += net;
    byCategory.set(expense.category.name, (byCategory.get(expense.category.name) || 0) + net);
    byMerchant.set(expense.merchant, (byMerchant.get(expense.merchant) || 0) + net);
    if (!largestExpense || expense.amount > largestExpense.amount) {
      largestExpense = { amount: expense.amount, merchant: expense.merchant };
    }
  }

  return {
    totalSpent: round2(totalSpent),
    txCount: expenses.length,
    topCategory: maxKey(byCategory),
    topMerchant: maxKey(byMerchant),
    largestExpense,
  };
}

async function getUnpaidIouTotal(userId: string): Promise<number> {
  const [manual, participants] = await Promise.all([
    prisma.debt.findMany({ where: { userId, paid: false } }),
    prisma.billParticipant.findMany({
      where: { paid: false, amountOwed: { gt: 0 } },
      include: { person: true },
    }),
  ]);
  const manualTotal = manual.reduce((sum, d) => sum + d.amount, 0);
  const participantTotal = participants
    .filter((p) => !isYou(p))
    .reduce((sum, p) => sum + p.amountOwed, 0);
  return round2(manualTotal + participantTotal);
}

function computePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function computeStats(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  type: ReportType,
  currency: string
): Promise<ReportStats> {
  const prev = getPreviousPeriodBounds(type, periodStart, periodEnd);
  const [current, previous] = await Promise.all([
    getPeriodStats(userId, periodStart, periodEnd),
    getPeriodStats(userId, prev.periodStart, prev.periodEnd),
  ]);
  const unpaidIouTotal = await getUnpaidIouTotal(userId);
  return {
    totalSpent: current.totalSpent,
    txCount: current.txCount,
    topCategory: current.topCategory,
    topMerchant: current.topMerchant,
    largestExpense: current.largestExpense,
    unpaidIouTotal,
    currency,
    vsPreviousPercent: computePercent(current.totalSpent, previous.totalSpent),
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  IDR: "Rp",
  SGD: "S$",
  EUR: "€",
  GBP: "£",
  MYR: "RM",
};

async function generateReport(
  stats: ReportStats,
  label: string,
  type: ReportType,
  currency: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://littlefinger.app",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful personal finance assistant. Respond with valid JSON only, no markdown fences, no commentary.",
        },
        {
          role: "user",
          content: `Generate a financial report recap for the ${label} period (${type} report) in ${symbol} ${currency}. Here is the raw stats data:\n${JSON.stringify(
            stats
          )}\n\nReturn EXACTLY this JSON shape, no markdown fences, no extra fields:\n{\n  "summary": "1-2 sentence narrative of the period",\n  "highlights": ["3-5 bullet insights, each concise"],\n  "stats": { "totalSpent": "formatted string", "vsPrevious": "e.g. +12% or 'n/a'", "topCategory": "name", "topMerchant": "name" },\n  "recommendations": ["1-3 actionable suggestions"]\n}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error (openrouter/free): ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content from LLM (openrouter/free)");
  }

  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Failed to parse LLM response");
  }
  const cleaned = content
    .slice(jsonStart, jsonEnd + 1)
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse LLM response");
  }
}

function isLlmError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("OPENROUTER_API_KEY") ||
    error.message.includes("LLM API error") ||
    error.message.includes("No content from LLM") ||
    error.message.includes("Failed to parse LLM response")
  );
}

router.get("/", async (req, res) => {
  try {
    const type = req.query.type;
    if (type !== "weekly" && type !== "monthly") {
      res.status(400).json({ error: "Invalid report type. Must be 'weekly' or 'monthly'." });
      return;
    }

    const userId = await getDefaultUserId();
    const { periodStart, periodEnd, label } = getExpectedPeriod(type);

    const existing = await prisma.insightReport.findFirst({
      where: { userId, periodType: type, periodStart },
    });

    if (existing) {
      try {
        const parsed = JSON.parse(existing.summaryText);
        res.json({ ...existing, parsed });
        return;
      } catch {
        // stale summaryText — fall through and regenerate
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currency = user?.defaultCurrency || "IDR";
    const stats = await computeStats(userId, periodStart, periodEnd, type, currency);

    const parsedReport = await generateReport(stats, label, type, currency);

    const report = await prisma.insightReport.create({
      data: {
        userId,
        periodType: type,
        periodStart,
        periodEnd,
        summaryText: JSON.stringify(parsedReport),
        statsJson: JSON.stringify(stats),
        createdAt: new Date(),
      },
    });

    res.json({ ...report, parsed: parsedReport });
  } catch (error) {
    console.error("Failed to generate report:", error);
    if (isLlmError(error)) {
      res.status(503).json({ error: "Failed to generate report" });
    } else {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  }
});

export default router;
