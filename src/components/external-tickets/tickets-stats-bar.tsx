"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import { isToday, isPast, parseISO } from "date-fns"
import { Clock, Wrench, CheckCircle, AlertTriangle } from "lucide-react"
import type { ExternalTicket } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TicketsStatsBarProps {
  tickets: ExternalTicket[]
}

interface StatItemProps {
  icon: ReactNode
  label: string
  mobileLabel: string
  value: number
  colorClass: string
  bgClass: string
  borderClass: string
  pulse?: boolean
}

function StatItem({ icon, label, mobileLabel, value, colorClass, bgClass, borderClass, pulse }: StatItemProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border p-2.5 md:p-3 md:gap-3", bgClass, borderClass)}>
      <div className="p-1 md:p-1.5 rounded-md bg-background/60 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] md:text-xs text-muted-foreground truncate leading-none mb-0.5">
          <span className="md:hidden">{mobileLabel}</span>
          <span className="hidden md:inline">{label}</span>
        </p>
        <p className={cn("text-lg md:text-xl font-bold tabular-nums leading-tight", colorClass, pulse && "animate-pulse")}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function TicketsStatsBar({ tickets }: TicketsStatsBarProps) {
  const stats = useMemo(() => {
    return {
      pending: tickets.filter(t => t.status === 'pendente').length,
      inProgress: tickets.filter(t => t.status === 'em andamento').length,
      concludedToday: tickets.filter(t =>
        t.status === 'concluído' && t.updatedAt && isToday(parseISO(t.updatedAt))
      ).length,
      slaViolated: tickets.filter(t =>
        t.slaExpiresAt &&
        (t.status === 'pendente' || t.status === 'em andamento') &&
        isPast(parseISO(t.slaExpiresAt))
      ).length,
    }
  }, [tickets])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      <StatItem
        icon={<Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-500" />}
        label="Pendentes"
        mobileLabel="Pendentes"
        value={stats.pending}
        colorClass="text-foreground"
        bgClass="bg-indigo-500/5"
        borderClass="border-indigo-500/20"
      />
      <StatItem
        icon={<Wrench className="h-3.5 w-3.5 md:h-4 md:w-4 text-brand-orange" />}
        label="Em Andamento"
        mobileLabel="Andamento"
        value={stats.inProgress}
        colorClass="text-foreground"
        bgClass="bg-brand-orange/5"
        borderClass="border-brand-orange/20"
      />
      <StatItem
        icon={<CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500" />}
        label="Concluídos Hoje"
        mobileLabel="Conc. Hoje"
        value={stats.concludedToday}
        colorClass="text-foreground"
        bgClass="bg-emerald-500/5"
        borderClass="border-emerald-500/20"
      />
      <StatItem
        icon={<AlertTriangle className={cn("h-3.5 w-3.5 md:h-4 md:w-4", stats.slaViolated > 0 ? 'text-destructive' : 'text-muted-foreground')} />}
        label="SLA Violado"
        mobileLabel="SLA"
        value={stats.slaViolated}
        colorClass={stats.slaViolated > 0 ? 'text-destructive' : 'text-foreground'}
        bgClass={stats.slaViolated > 0 ? 'bg-destructive/5' : 'bg-muted/30'}
        borderClass={stats.slaViolated > 0 ? 'border-destructive/25' : 'border-border'}
        pulse={stats.slaViolated > 0}
      />
    </div>
  )
}
