const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface User {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: string;
  confidence: number;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  date: string;
  merchant: string;
  notes: string | null;
  source: string;
  createdAt: string;
  receiptItems: string | null;
  category: { id: string; name: string; icon: string };
  billSplit?: BillSplit | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_URL}/api/user/me`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch(`${API_URL}/api/expenses`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(data: {
  amount: number;
  date: string;
  merchant: string;
  categoryId: string;
  currency: string;
  notes?: string;
  receiptItems?: ReceiptItem[];
}): Promise<Expense> {
  const res = await fetch(`${API_URL}/api/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create expense" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function createExpensesBulk(data: {
  expenses: Array<{
    amount: number;
    date: string;
    merchant: string;
    categoryId: string;
    currency: string;
    notes?: string;
  }>;
}): Promise<Expense[]> {
  const res = await fetch(`${API_URL}/api/expenses/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create expenses" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function updateExpense(
  id: string,
  data: {
    amount?: number;
    date?: string;
    merchant?: string;
    categoryId?: string;
    currency?: string;
    notes?: string;
  }
): Promise<Expense> {
  const res = await fetch(`${API_URL}/api/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update expense" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/expenses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete expense" }));
    throw new Error(err.error);
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  contactInfo: string | null;
}

export async function fetchPeople(): Promise<Person[]> {
  const res = await fetch(`${API_URL}/api/people`);
  if (!res.ok) throw new Error("Failed to fetch people");
  return res.json();
}

export async function createPerson(data: { name: string; contactInfo?: string }): Promise<Person> {
  const res = await fetch(`${API_URL}/api/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create person" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function updatePerson(id: string, data: { name?: string; contactInfo?: string }): Promise<Person> {
  const res = await fetch(`${API_URL}/api/people/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update person" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function deletePerson(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/people/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete person" }));
    throw new Error(err.error);
  }
}

export interface BillSplit {
  id: string;
  expenseId: string;
  method: string;
  totalAmount: number;
  createdAt: string;
  participants: BillParticipant[];
  itemAssignments?: BillItemAssignment[];
}

export interface BillParticipant {
  id: string;
  billSplitId: string;
  personId: string | null;
  guestName: string | null;
  amountOwed: number;
  paid: boolean;
  person: Person | null;
}

export interface BillItemAssignment {
  id: string;
  billSplitId: string;
  participantId: string;
  itemIndex: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  splitRatio: string | null;
  participant: BillParticipant;
}

export async function fetchBillItemAssignments(splitId: string): Promise<BillItemAssignment[]> {
  const res = await fetch(`${API_URL}/api/bill-splits/${splitId}/assignments`);
  if (!res.ok) throw new Error("Failed to fetch bill item assignments");
  return res.json();
}

export async function createBillSplit(data: {
  expenseId: string;
  method: string;
  participants: Array<{ personId?: string; guestName?: string; amountOwed: number }>;
  itemAssignments?: Array<{
    participantIndex: number;
    itemIndex: number;
    quantity: number;
    unitPrice: number;
    amount: number;
    splitRatio?: string;
  }>;
  taxesAndCharges?: number;
}): Promise<BillSplit> {
  const res = await fetch(`${API_URL}/api/bill-splits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create bill split" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function fetchBillSplits(expenseId?: string): Promise<BillSplit[]> {
  const params = expenseId ? `?expenseId=${encodeURIComponent(expenseId)}` : "";
  const res = await fetch(`${API_URL}/api/bill-splits${params}`);
  if (!res.ok) throw new Error("Failed to fetch bill splits");
  return res.json();
}

export async function updateBillSplit(id: string, data: {
  method?: string;
  participants?: Array<{ personId?: string; guestName?: string; amountOwed: number }>;
  itemAssignments?: Array<{
    participantIndex: number;
    itemIndex: number;
    quantity: number;
    unitPrice: number;
    amount: number;
    splitRatio?: string;
  }>;
  taxesAndCharges?: number;
}): Promise<BillSplit> {
  const res = await fetch(`${API_URL}/api/bill-splits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update bill split" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function deleteBillSplit(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/bill-splits/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete bill split" }));
    throw new Error(err.error);
  }
}

export async function toggleParticipantPaid(splitId: string, participantId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/bill-splits/${splitId}/participants/${participantId}/pay`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to toggle payment status" }));
    throw new Error(err.error);
  }
}

export interface ReceiptScanResult {
  receiptId: string;
  merchant: string;
  date: string;
  currency: string;
  total: number;
  taxAmount: number;
  roundingAdjustment: number;
  items: ReceiptItem[];
}

export async function scanReceipt(file: File): Promise<ReceiptScanResult> {
  const formData = new FormData();
  formData.append("receipt", file);
  const res = await fetch(`${API_URL}/api/receipts/scan`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to scan receipt" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function fetchReceipt(receiptId: string): Promise<{
  id: string;
  imagePath: string;
  rawOcrData: string | null;
  confidenceScores: string | null;
}> {
  const res = await fetch(`${API_URL}/api/receipts/${receiptId}`);
  if (!res.ok) throw new Error("Failed to fetch receipt");
  return res.json();
}

export interface Debt {
  id: string;
  source: "bill" | "manual";
  personId: string | null;
  guestName: string | null;
  personName: string;
  amount: number;
  currency: string;
  paid: boolean;
  createdAt: string;
  billSplitId?: string;
  expenseId?: string;
  merchant?: string;
  note?: string | null;
}

export async function fetchDebts(): Promise<Debt[]> {
  const res = await fetch(`${API_URL}/api/debts`);
  if (!res.ok) throw new Error("Failed to fetch debts");
  return res.json();
}

export async function createDebt(data: {
  personId?: string;
  guestName?: string;
  amount: number;
  currency: string;
  note?: string;
}): Promise<Debt> {
  const res = await fetch(`${API_URL}/api/debts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create debt" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function updateDebt(
  id: string,
  data: { personId?: string; guestName?: string; amount?: number; currency?: string; note?: string }
): Promise<Debt> {
  const res = await fetch(`${API_URL}/api/debts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update debt" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function toggleManualDebtPaid(id: string): Promise<Debt> {
  const res = await fetch(`${API_URL}/api/debts/${id}/pay`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to toggle debt payment" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function deleteDebt(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/debts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete debt" }));
    throw new Error(err.error);
  }
}

export interface InsightReport {
  id: string;
  userId: string;
  periodType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  summaryText: string;
  statsJson: string;
  createdAt: string;
  parsed: AiReportContent;
}

export interface AiReportContent {
  summary?: string;
  highlights?: string[];
  stats?: {
    totalSpent?: string;
    vsPrevious?: string;
    topCategory?: string;
    topMerchant?: string;
  };
  recommendations?: string[];
}

export async function fetchReport(
  type: "weekly" | "monthly"
): Promise<InsightReport> {
  const res = await fetch(`${API_URL}/api/reports?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}
