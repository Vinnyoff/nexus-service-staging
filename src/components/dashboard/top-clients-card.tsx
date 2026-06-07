"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { ExternalTicket } from "@/lib/types"

interface TopClientsCardProps {
  tickets: ExternalTicket[]
}

export function TopClientsCard({ tickets }: TopClientsCardProps) {
  const topClients = useMemo(() => {
    const counts: Record<string, { name: string; count: number; concluded: number }> = {}

    tickets.forEach(t => {
      const name = t.client?.name
      if (!name) return
      const key = name
      if (!counts[key]) counts[key] = { name, count: 0, concluded: 0 }
      counts[key].count++
      if (t.status === 'concluído') counts[key].concluded++
    })

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [tickets])

  const maxCount = topClients[0]?.count || 1

  const rankColors = [
    "bg-primary",
    "bg-primary/80",
    "bg-primary/60",
    "bg-primary/45",
    "bg-primary/30",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Clientes</CardTitle>
        <CardDescription>Clientes com mais chamados no período</CardDescription>
      </CardHeader>
      <CardContent>
        {topClients.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Nenhum chamado no período.
          </div>
        ) : (
          <div className="space-y-4">
            {topClients.map((client, i) => (
              <div key={client.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 text-right">{i + 1}.</span>
                    <span className="text-sm font-medium truncate">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">
                      {client.concluded}/{client.count}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{client.count}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${rankColors[i] ?? "bg-primary/20"}`}
                    style={{ width: `${(client.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              Formato: concluídos / total
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
