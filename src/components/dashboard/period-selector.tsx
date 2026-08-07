'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DateInput } from '@/components/ui/date-input'

export type PeriodPreset = '7d' | '30d' | 'month' | 'all' | 'custom'

export function presetRange(preset: PeriodPreset): { from: Date | null; to: Date | null } {
  const now = new Date()
  switch (preset) {
    case '7d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      return { from, to: now }
    }
    case '30d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      return { from, to: now }
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to: now }
    }
    default:
      return { from: null, to: null }
  }
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]

interface PeriodSelectorProps {
  preset: PeriodPreset
  onPresetChange: (p: PeriodPreset) => void
  customFrom: string
  customTo: string
  onCustomChange: (from: string, to: string) => void
  className?: string
}

export function PeriodSelector({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomChange,
  className,
}: PeriodSelectorProps) {
  return (
    <div className={cn('space-y-3 min-w-0', className)}>
      <div className="sm:hidden">
        <Select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as PeriodPreset)}
          aria-label="Time range"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <Tabs value={preset} onValueChange={(v) => onPresetChange(v as PeriodPreset)}>
        <TabsList className="hidden w-full overflow-x-auto sm:flex sm:w-auto sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRESETS.map((p) => (
            <TabsTrigger key={p.value} value={p.value} className="flex-1 whitespace-nowrap sm:flex-none">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {preset === 'custom' && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground sm:hidden">From</span>
            <DateInput
              value={customFrom}
              onChange={(e) => onCustomChange(e.target.value, customTo)}
            />
          </div>
          <span className="hidden text-center text-xs text-muted-foreground sm:block sm:px-1">to</span>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground sm:hidden">To</span>
            <DateInput
              value={customTo}
              onChange={(e) => onCustomChange(customFrom, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
