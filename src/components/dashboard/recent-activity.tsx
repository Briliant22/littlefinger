'use client'

import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Film,
  ShoppingBag,
  Heart,
  Home,
  Plane,
  Repeat,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'
import type { Expense } from '@/lib/api'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
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

const MAX_ITEMS = 8

interface RecentActivityProps {
  expenses: Expense[]
  currency: string
}

export function RecentActivity({ expenses, currency }: RecentActivityProps) {
  const router = useRouter()
  const recent = expenses
    .filter((e) => e.currency === currency)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_ITEMS)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => router.push('/expenses')}>
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity in this period</p>
        ) : (
          <div className="space-y-3">
            {recent.map((e) => {
              const Icon = CATEGORY_ICONS[e.category.icon] || MoreHorizontal
              return (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {e.category.name}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                    {formatCurrency(e.amount, e.currency)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
