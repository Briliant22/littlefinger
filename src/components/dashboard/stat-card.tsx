import type { ComponentType } from 'react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon?: ComponentType<{ size?: number; className?: string }>
}

export function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <div className="data-card rounded-xl p-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <Icon size={16} className="text-muted-foreground" />
          </div>
        )}
        <p className="data-label">{label}</p>
      </div>
      <div className="mt-2 font-mono tabular-nums text-lg font-medium sm:text-xl">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
