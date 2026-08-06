'use client'

import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'
import type { IouTotal } from '@/lib/dashboard'

interface IouSummaryProps {
  ious: IouTotal[]
  grandTotal: number
  currency: string
}

const MAX_VISIBLE = 6

export function IouSummary({ ious, grandTotal, currency }: IouSummaryProps) {
  const router = useRouter()
  const visible = ious.slice(0, MAX_VISIBLE)
  const hiddenCount = ious.length - visible.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owed to you</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => router.push('/debts')}>
            View debts
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">Total outstanding</p>
        <p
          className={
            grandTotal === 0
              ? 'font-mono text-2xl font-medium tabular-nums text-muted-foreground'
              : 'font-mono text-2xl font-medium tabular-nums'
          }
        >
          {formatCurrency(grandTotal, currency)}
        </p>
        {ious.length > 0 ? (
          <div className="mt-4 space-y-3">
            {visible.map((iou) => (
              <div key={iou.person} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User size={14} className="text-muted-foreground" />
                  </div>
                  <span className="truncate text-sm font-medium">{iou.person}</span>
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums">
                  {formatCurrency(iou.total, currency)}
                </span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <p className="text-xs text-muted-foreground">+{hiddenCount} more people</p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">No outstanding IOUs — nice work.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 -ml-2"
              onClick={() => router.push('/debts')}
            >
              View debts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
