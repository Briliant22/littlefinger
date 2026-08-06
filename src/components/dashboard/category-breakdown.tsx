'use client'

import type { ComponentType } from 'react'
import {
  Car,
  Film,
  Heart,
  Home,
  MoreHorizontal,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Zap,
} from 'lucide-react'
import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryTotal } from '@/lib/dashboard'
import { formatCurrency } from '@/lib/currency'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
]

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  zap: Zap,
  film: Film,
  'shopping-bag': ShoppingBag,
  heart: Heart,
  home: Home,
  plane: Plane,
  repeat: Repeat,
  'more-horizontal': MoreHorizontal,
}

interface CategoryBreakdownProps {
  categories: CategoryTotal[]
  currency: string
}

export function CategoryBreakdown({ categories, currency }: CategoryBreakdownProps) {
  const chartConfig = Object.fromEntries(
    categories.map((c, i) => [
      c.categoryId,
      { label: c.name, color: CHART_COLORS[i % CHART_COLORS.length] },
    ])
  )

  const donutData = categories.slice(0, 5).map((c, i) => ({
    categoryId: c.categoryId,
    name: c.name,
    total: c.total,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const listData = categories.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>By category</CardTitle>
        <CardDescription>Share of spending</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-4">
        {categories.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No spending in this period</p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-52 aspect-auto">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(value as number, currency)}
                    />
                  }
                />
                <Pie
                  data={donutData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="95%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.categoryId} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="max-h-56 overflow-y-auto">
              <div className="space-y-2.5 pb-1">
                {listData.map((c, i) => {
                  const Icon = CATEGORY_ICONS[c.icon]
                  return (
                    <div key={c.categoryId} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        {Icon && <Icon size={14} className="shrink-0 text-muted-foreground" />}
                        <span className="truncate text-sm">{c.name}</span>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2">
                        <span className="font-mono tabular-nums text-sm">
                          {formatCurrency(c.total, currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.share}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
