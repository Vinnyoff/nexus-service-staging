"use client"

import { useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  format, parseISO, eachDayOfInterval, eachMonthOfInterval,
  startOfToday, endOfToday, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays
} from "date-fns"
import { ptBR } from "date-fns/locale"
import type { ExternalTicket } from "@/lib/types"

interface TrendChartProps {
  tickets: ExternalTicket[]
  period: string
}

export function TrendChart({ tickets, period }: TrendChartProps) {
  const data = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date
    let groupBy: 'day' | 'month' = 'day'

    if (period === 'this-year') {
      start = startOfYear(now)
      end = endOfYear(now)
      groupBy = 'month'
    } else if (period === 'today') {
      start = subDays(startOfToday(), 6)
      end = endOfToday()
    } else if (period === 'this-week') {
      start = startOfWeek(now, { locale: ptBR })
      end = endOfWeek(now, { locale: ptBR })
    } else if (period === 'this-month') {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else if (period.startsWith('month-')) {
      const monthIndex = parseInt(period.split('-')[1], 10)
      const base = new Date(now.getFullYear(), monthIndex, 1)
      start = startOfMonth(base)
      end = endOfMonth(base)
    } else {
      start = startOfMonth(now)
      end = endOfMonth(now)
    }

    const intervals = groupBy === 'month'
      ? eachMonthOfInterval({ start, end })
      : eachDayOfInterval({ start, end })

    return intervals.map(date => {
      const dayKey = format(date, 'yyyy-MM-dd')
      const monthKey = format(date, 'yyyy-MM')
      const label = groupBy === 'month'
        ? format(date, 'MMM', { locale: ptBR })
        : format(date, 'dd/MM', { locale: ptBR })

      const created = tickets.filter(t => {
        if (!t.createdAt) return false
        const key = groupBy === 'month'
          ? format(parseISO(t.createdAt), 'yyyy-MM')
          : format(parseISO(t.createdAt), 'yyyy-MM-dd')
        return key === (groupBy === 'month' ? monthKey : dayKey)
      }).length

      const resolved = tickets.filter(t => {
        if (t.status !== 'concluído' || !t.updatedAt) return false
        const key = groupBy === 'month'
          ? format(parseISO(t.updatedAt), 'yyyy-MM')
          : format(parseISO(t.updatedAt), 'yyyy-MM-dd')
        return key === (groupBy === 'month' ? monthKey : dayKey)
      }).length

      return { label, Abertos: created, Concluídos: resolved }
    })
  }, [tickets, period])

  const hasData = data.some(d => d.Abertos > 0 || d.Concluídos > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendência de Chamados</CardTitle>
        <CardDescription>Volume de chamados abertos vs concluídos no período</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
            Nenhum dado para exibir no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendAbertos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(243,75%,62%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(243,75%,62%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="trendConcluidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158,64%,44%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(158,64%,44%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--card-foreground))"
                }}
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Area
                type="monotone"
                dataKey="Abertos"
                stroke="hsl(243,75%,62%)"
                strokeWidth={2}
                fill="url(#trendAbertos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="Concluídos"
                stroke="hsl(158,64%,44%)"
                strokeWidth={2}
                fill="url(#trendConcluidos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
