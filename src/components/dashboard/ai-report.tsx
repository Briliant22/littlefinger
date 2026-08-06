"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, RefreshCw, TrendingUp, Tag, Store, ChevronDown, Loader2, Receipt, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { fetchReport, type InsightReport } from "@/lib/api"

type ReportType = "weekly" | "monthly"

interface AiReportProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function formatPeriodLabel(report: InsightReport): string {
  const start = new Date(report.periodStart)
  const end = new Date(report.periodEnd)
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

export function AiReport({ open = true, onOpenChange }: AiReportProps) {
  const [type, setType] = useState<ReportType>("weekly")
  const [reports, setReports] = useState<Record<ReportType, InsightReport | undefined>>({
    weekly: undefined,
    monthly: undefined,
  })
  const [loadingType, setLoadingType] = useState<ReportType | null>("weekly")
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(true)

  const load = useCallback((reportType: ReportType, force = false) => {
    if (!force && reports[reportType]) return
    setLoadingType(reportType)
    setError(null)
    fetchReport(reportType)
      .then((report) => {
        setReports((prev) => ({ ...prev, [reportType]: report }))
      })
      .catch(() => {
        setError("Couldn't load the AI report right now.")
      })
      .finally(() => setLoadingType(null))
  }, [reports])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load("weekly")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeReport = reports[type]
  const loading = loadingType === type

  const body = (() => {
    if (loading && !activeReport) {
      return (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )
    }
    if (!activeReport) {
      return (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Receipt size={20} className="text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Your AI report will land here
          </h3>
          <p className="mt-1.5 max-w-[280px] text-sm leading-6 text-muted-foreground">
            You&apos;ll see an AI-generated recap of your weekly and monthly activity once you&apos;ve
            started logging expenses or split bills.
          </p>
          {error ? (
            <Button size="sm" variant="outline" className="mt-4" onClick={() => load(type, true)}>
              <RefreshCw size={14} />
              Try again
            </Button>
          ) : null}
        </div>
      )
    }
    return (
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Report period</p>
            <p className="truncate text-sm font-medium">{formatPeriodLabel(activeReport)}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => load(type, true)}
            disabled={!!loadingType}
            className="shrink-0"
            aria-label="Regenerate report"
          >
            {loadingType === type ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </Button>
        </div>

        {activeReport.parsed.summary && (
          <p className="text-sm leading-6 text-foreground/90">{activeReport.parsed.summary}</p>
        )}

        {activeReport.parsed.stats && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Total spent</p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-medium">
                {activeReport.parsed.stats.totalSpent || "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">vs previous</p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-medium">
                {activeReport.parsed.stats.vsPrevious || "n/a"}
              </p>
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-muted/60 p-3">
              <Store size={14} className="shrink-0 text-muted-foreground" />
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                Top merchant: <span className="font-medium text-foreground">{activeReport.parsed.stats.topMerchant || "—"}</span>
              </p>
            </div>
          </div>
        )}

        {activeReport.parsed.highlights && activeReport.parsed.highlights.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <TrendingUp size={13} className="text-primary" />
              Highlights
            </p>
            <ul className="space-y-1.5">
              {activeReport.parsed.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm leading-5 text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeReport.parsed.recommendations && activeReport.parsed.recommendations.length > 0 && (
          <div className="mt-4 rounded-lg border border-border/60 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Tag size={13} className="text-primary" />
              Suggestions
            </p>
            <ul className="space-y-1.5">
              {activeReport.parsed.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm leading-5 text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  })()

  return (
    <>
      {!open && (
        <div className="card-surface hidden w-full flex-col items-center gap-3 overflow-hidden rounded-xl px-3 py-5 lg:flex">
          <button
            type="button"
            onClick={() => onOpenChange?.(true)}
            className="flex w-full flex-col items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Expand AI report"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Sparkles size={16} className="text-primary" />
            </span>
            <span className="max-w-full truncate text-xs font-semibold text-foreground">AI Report</span>
            <PanelLeftOpen size={18} className="mt-1.5" />
            <span className="text-[11px] font-medium">Expand</span>
          </button>
        </div>
      )}

      <div className={cn("card-surface overflow-hidden rounded-xl", !open && "lg:hidden")}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles size={14} className="text-primary" />
          </div>
          <p className="truncate text-sm font-semibold">AI Report</p>
        </div>
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Collapse report"
            title="Collapse report"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={collapsed ? "Expand report" : "Collapse report"}
        >
          <ChevronDown size={16} className={cn("transition-transform", collapsed ? "" : "rotate-180")} />
        </button>
      </div>

      <div className={cn("lg:block", collapsed ? "hidden" : "block")}>
        <div className="px-4 pt-3">
          <Tabs value={type} onValueChange={(v) => setType(v as ReportType)}>
            <TabsList className="w-full">
              <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {body}
      </div>
    </div>
    </>
  )
}
