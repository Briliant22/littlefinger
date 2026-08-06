'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, Receipt, CalendarDays, HandCoins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  PeriodSelector,
  presetRange,
  type PeriodPreset,
} from '@/components/dashboard/period-selector'
import { SpendingTrend } from '@/components/dashboard/spending-trend'
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown'
import { TopMerchants } from '@/components/dashboard/top-merchants'
import { IouSummary } from '@/components/dashboard/iou-summary'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { AiReport } from '@/components/dashboard/ai-report'
import {
  fetchExpenses,
  fetchDebts,
  fetchCategories,
  fetchCurrentUser,
  type Expense,
  type Debt,
  type Category,
  type User,
} from '@/lib/api'
import { formatCurrency, getCurrencySymbol } from '@/lib/currency'
import {
  getUserNetAmount,
  detectPrimaryCurrency,
  isExpenseInRange,
  chooseBucket,
  groupByPeriod,
  groupByCategory,
  topMerchants,
  iouTotals,
  averagePerDay,
} from '@/lib/dashboard'

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [currency, setCurrency] = useState('')
  const [reportOpen, setReportOpen] = useState(true)

  const loadData = useCallback(() => {
    setLoadError(null)
    setLoading(true)
    Promise.all([
      fetchExpenses().catch(() => [] as Expense[]),
      fetchDebts().catch(() => [] as Debt[]),
      fetchCategories().catch(() => [] as Category[]),
      fetchCurrentUser().catch(() => null as User | null),
    ])
      .then(([expensesData, debtsData, categoriesData, userData]) => {
        setExpenses(expensesData)
        setDebts(debtsData)
        setUser(userData)
        if (categoriesData.length === 0) {
          setLoadError('Categories could not be loaded. Make sure the backend is running and seeded.')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadData()
  }, [loadData])
  /* eslint-enable react-hooks/set-state-in-effect */

  const primaryCurrency = useMemo(
    () => detectPrimaryCurrency(expenses, user?.defaultCurrency || 'IDR'),
    [expenses, user]
  )

  const activeCurrency = currency || primaryCurrency

  const range = useMemo(() => {
    if (preset === 'custom') {
      return {
        from: customFrom ? new Date(customFrom) : null,
        to: customTo ? new Date(customTo) : null,
      }
    }
    return presetRange(preset)
  }, [preset, customFrom, customTo])

  const effectiveFrom = useMemo(() => {
    if (range.from) return range.from
    if (expenses.length) {
      return new Date(Math.min(...expenses.map((e) => new Date(e.date).getTime())))
    }
    return new Date()
  }, [range.from, expenses])

  const effectiveTo = range.to ?? new Date()

  const bucket = chooseBucket(effectiveFrom, effectiveTo)

  const rangedExpenses = useMemo(
    () => expenses.filter((e) => isExpenseInRange(e, range.from, range.to)),
    [expenses, range.from, range.to]
  )

  const currencyExpenses = useMemo(
    () => rangedExpenses.filter((e) => e.currency === activeCurrency),
    [rangedExpenses, activeCurrency]
  )

  const totalSpent = useMemo(
    () => currencyExpenses.reduce((s, e) => s + getUserNetAmount(e), 0),
    [currencyExpenses]
  )

  const txCount = currencyExpenses.length

  const avgPerDay = averagePerDay(totalSpent, effectiveFrom, effectiveTo)

  const trendPoints = useMemo(
    () => groupByPeriod(rangedExpenses, activeCurrency, bucket),
    [rangedExpenses, activeCurrency, bucket]
  )

  const categoryData = useMemo(
    () => groupByCategory(rangedExpenses, activeCurrency),
    [rangedExpenses, activeCurrency]
  )

  const merchants = useMemo(
    () => topMerchants(rangedExpenses, activeCurrency, 5),
    [rangedExpenses, activeCurrency]
  )

  const ious = useMemo(() => iouTotals(debts, activeCurrency), [debts, activeCurrency])

  const recentExpenses = useMemo(
    () =>
      rangedExpenses
        .map((e) => ({ ...e, amount: getUserNetAmount(e) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [rangedExpenses]
  )

  const uniqueCurrencies = useMemo(() => {
    const codes = new Set<string>()
    codes.add(primaryCurrency)
    for (const e of expenses) codes.add(e.currency)
    for (const d of debts) codes.add(d.currency)
    return Array.from(codes).sort((a, b) => {
      if (a === primaryCurrency) return -1
      if (b === primaryCurrency) return 1
      return a.localeCompare(b)
    })
  }, [expenses, debts, primaryCurrency])

  const isLoading = loading && expenses.length === 0

  return (
    <div className="page-surface min-h-screen">
      <div className="mx-auto max-w-screen-xl px-6 py-8 lg:py-12">
        {loadError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of your spending and IOUs</p>
        </div>

        {isLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="mt-6 h-72 animate-pulse rounded-xl bg-muted" />
            <div className="mt-6 h-72 animate-pulse rounded-xl bg-muted" />
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-muted-foreground">Currency</span>
                <Select
                  value={activeCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full sm:w-40"
                >
                  <option value={primaryCurrency}>
                    {getCurrencySymbol(primaryCurrency)} {primaryCurrency} · auto
                  </option>
                  {uniqueCurrencies
                    .filter((c) => c !== primaryCurrency)
                    .map((c) => (
                      <option key={c} value={c}>
                        {getCurrencySymbol(c)} {c}
                      </option>
                    ))}
                </Select>
              </div>
              <PeriodSelector
                preset={preset}
                onPresetChange={setPreset}
                customFrom={customFrom}
                customTo={customTo}
                onCustomChange={(from, to) => {
                  setCustomFrom(from)
                  setCustomTo(to)
                }}
                className="w-full lg:w-auto"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total spent"
                value={formatCurrency(totalSpent, activeCurrency)}
                icon={Wallet}
                sub={activeCurrency}
              />
              <StatCard label="Transactions" value={String(txCount)} icon={Receipt} />
              <StatCard
                label="Avg per day"
                value={formatCurrency(avgPerDay, activeCurrency)}
                icon={CalendarDays}
              />
              <StatCard
                label="Owed to you"
                value={formatCurrency(ious.grandTotal, activeCurrency)}
                icon={HandCoins}
                sub={
                  ious.totals.length > 0
                    ? `${ious.totals.length} ${ious.totals.length === 1 ? 'person' : 'people'}`
                    : undefined
                }
              />
            </div>

            <div className="mt-6 lg:grid lg:items-start lg:gap-6 lg:grid-cols-5">
              <div className={cn("lg:row-start-1", reportOpen ? "lg:col-span-2 lg:col-start-4" : "lg:col-span-1 lg:col-start-5")}>
                <div className="lg:sticky lg:top-8">
                  <AiReport open={reportOpen} onOpenChange={setReportOpen} />
                </div>
              </div>

              <div className={cn("min-w-0 lg:row-start-1 lg:col-start-1", reportOpen ? "lg:col-span-3" : "lg:col-span-4")}>
                <div className="mt-6 lg:mt-0">
                  <SpendingTrend points={trendPoints} currency={activeCurrency} />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <CategoryBreakdown categories={categoryData} currency={activeCurrency} />
                  <TopMerchants merchants={merchants} currency={activeCurrency} />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <RecentActivity expenses={recentExpenses} currency={activeCurrency} />
                  <IouSummary ious={ious.totals} grandTotal={ious.grandTotal} currency={activeCurrency} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}