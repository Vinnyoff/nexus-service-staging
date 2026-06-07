"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, Clock, UserX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { differenceInHours, differenceInDays, isPast, parseISO } from "date-fns"
import type { ExternalTicket } from "@/lib/types"

interface AlertPanelProps {
  tickets: ExternalTicket[]
}

interface AlertRowProps {
  icon: ReactNode
  label: string
  colorClass: string
}

function AlertRow({ icon, label, colorClass }: AlertRowProps) {
  return (
    <div className={`flex items-center gap-2 text-xs ${colorClass}`}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

export function AlertPanel({ tickets }: AlertPanelProps) {
  const alerts = useMemo(() => {
    const now = new Date()
    const active = tickets.filter(t => t.status !== 'concluído' && t.status !== 'cancelado')

    const slaBreached = active.filter(t => {
      if (!t.slaExpiresAt) return false
      return isPast(parseISO(t.slaExpiresAt))
    })

    const slaExpiring = active.filter(t => {
      if (!t.slaExpiresAt) return false
      const hoursLeft = differenceInHours(parseISO(t.slaExpiresAt), now)
      return hoursLeft >= 0 && hoursLeft <= 4
    })

    const overdueScheduled = active.filter(t => {
      if (!t.scheduledTo) return false
      return isPast(parseISO(t.scheduledTo))
    })

    const abandonedPending = active.filter(t => {
      if (t.status !== 'pendente' || t.technicianId) return false
      const daysOpen = differenceInDays(now, parseISO(t.createdAt))
      return daysOpen >= 1
    })

    return { slaBreached, slaExpiring, overdueScheduled, abandonedPending }
  }, [tickets])

  const total = alerts.slaBreached.length + alerts.slaExpiring.length + alerts.overdueScheduled.length + alerts.abandonedPending.length

  if (total === 0) return null

  return (
    <Card className="border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/[0.07]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Alertas Operacionais</span>
          <Badge className="ml-auto bg-orange-500 hover:bg-orange-500 text-white text-xs px-1.5 py-0">
            {total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3">
        {alerts.slaBreached.length > 0 && (
          <AlertRow
            icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
            label={`${alerts.slaBreached.length} chamado(s) com SLA vencido`}
            colorClass="text-destructive"
          />
        )}
        {alerts.slaExpiring.length > 0 && (
          <AlertRow
            icon={<Clock className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
            label={`${alerts.slaExpiring.length} chamado(s) com SLA vencendo em menos de 4h`}
            colorClass="text-orange-600 dark:text-orange-400"
          />
        )}
        {alerts.overdueScheduled.length > 0 && (
          <AlertRow
            icon={<Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
            label={`${alerts.overdueScheduled.length} chamado(s) agendado(s) em atraso`}
            colorClass="text-amber-600 dark:text-amber-400"
          />
        )}
        {alerts.abandonedPending.length > 0 && (
          <AlertRow
            icon={<UserX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            label={`${alerts.abandonedPending.length} chamado(s) pendente(s) há mais de 1 dia sem técnico`}
            colorClass="text-muted-foreground"
          />
        )}
        <div className="pt-1">
          <Link href="/external-tickets" className="text-xs font-medium text-primary hover:underline underline-offset-2">
            Ver todos os chamados →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
