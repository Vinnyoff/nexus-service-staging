
"use client"

import type { ExternalTicket, Sector, Technician } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusChart } from "./status-chart"
import { Clock, Users, Wrench } from "lucide-react"

interface SectorStatsCardProps {
    sector: Sector
    tickets: ExternalTicket[]
    technicians: Technician[]
}

export function SectorStatsCard({ sector, tickets, technicians }: SectorStatsCardProps) {
    const pendingTickets = tickets.filter(t => t.status === 'pendente').length;
    const inProgressTickets = tickets.filter(t => t.status === 'em andamento').length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{sector.name}</CardTitle>
                <CardDescription>Visão geral do setor de {sector.name.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                       <div>
                           <p className="text-sm font-medium text-muted-foreground">Chamados Pendentes</p>
                           <p className="text-2xl font-bold">{pendingTickets}</p>
                       </div>
                       <Clock className="h-6 w-6 text-indigo-500" />
                   </div>
                   <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                       <div>
                           <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                           <p className="text-2xl font-bold">{inProgressTickets}</p>
                       </div>
                       <Wrench className="h-6 w-6 text-orange-500" />
                   </div>
                   <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                       <div>
                           <p className="text-sm font-medium text-muted-foreground">Técnicos no Setor</p>
                           <p className="text-2xl font-bold">{technicians.length}</p>
                       </div>
                       <Users className="h-6 w-6 text-muted-foreground" />
                   </div>
                </div>
                <div className="min-h-[250px]">
                    <StatusChart 
                        title="Chamados por Status"
                        description="Distribuição dos chamados do setor."
                        data={tickets}
                        type="external"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
