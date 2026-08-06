import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'
import type { MerchantTotal } from '@/lib/dashboard'

interface TopMerchantsProps {
  merchants: MerchantTotal[]
  currency: string
}

export function TopMerchants({ merchants, currency }: TopMerchantsProps) {
  const maxTotal = merchants.length > 0 ? Math.max(...merchants.map((m) => m.total)) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top merchants</CardTitle>
        <CardDescription>Where your money goes</CardDescription>
      </CardHeader>
      <CardContent>
        {merchants.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No merchant data in this period
          </p>
        ) : (
          <div className="space-y-3">
            {merchants.map((m) => (
              <div key={m.merchant}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{m.merchant}</span>
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {formatCurrency(m.total, currency)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-1"
                    style={{ width: `${maxTotal > 0 ? (m.total / maxTotal) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.count} transaction{m.count === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
