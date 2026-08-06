'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PeriodPoint } from '@/lib/dashboard'
import { formatCurrency } from '@/lib/currency'

const chartConfig = {
  spending: {
    label: 'Spent',
    color: 'var(--chart-1)',
  },
}

function formatAxisTick(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000000) return `${(value / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}M`
  if (abs >= 1000) return `${(value / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return String(value)
}

interface SpendingTrendProps {
  points: PeriodPoint[]
  currency: string
}

export function SpendingTrend({ points, currency }: SpendingTrendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending trend</CardTitle>
        <CardDescription>Net spending over the selected period</CardDescription>
      </CardHeader>
      <div className="px-4">
        {points.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No spending in this period</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill-spending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-spending)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-spending)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              {points.length > 1 && (
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => formatAxisTick(v)}
                />
              )}
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(value as number, currency)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="total"
                name="spent"
                stroke="var(--color-spending)"
                fill="url(#fill-spending)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </Card>
  )
}
