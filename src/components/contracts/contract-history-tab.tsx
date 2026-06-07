"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { ExternalTicket, Sector, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface ContractHistoryTabProps {
  contractId: string;
  sectors: Sector[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "concluído": "default",
  "em andamento": "secondary",
  "cancelado": "destructive",
  "pendente": "outline",
};

export function ContractHistoryTab({ contractId, sectors }: ContractHistoryTabProps) {
  const [tickets, setTickets] = useState<ExternalTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [ticketsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, "external-tickets"), where("contractId", "==", contractId))),
        getDocs(collection(db, "users")),
      ]);

      const ticketData = ticketsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as ExternalTicket))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTickets(ticketData);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      setLoading(false);
    }
    fetchData();
  }, [contractId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <p className="text-muted-foreground text-sm p-4 text-center">
        Nenhum chamado encontrado para este contrato.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr>
            <th className="text-left p-2 font-medium text-muted-foreground">Abertura</th>
            <th className="text-left p-2 font-medium text-muted-foreground">Setor</th>
            <th className="text-left p-2 font-medium text-muted-foreground">Técnico</th>
            <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
            <th className="text-left p-2 font-medium text-muted-foreground">Conclusão</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => {
            const sector = sectors.find(s => s.id === ticket.sectorId);
            const tech = users.find(u => u.id === ticket.technicianId);
            return (
              <tr key={ticket.id} className="border-b hover:bg-muted/50">
                <td className="p-2 whitespace-nowrap">
                  {format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="p-2">
                  {sector
                    ? <Badge variant="secondary">{sector.name}</Badge>
                    : <Badge variant="outline" className="text-muted-foreground">Aguardando setor</Badge>
                  }
                </td>
                <td className="p-2 text-muted-foreground">
                  {tech?.name ?? "Não atribuído"}
                </td>
                <td className="p-2">
                  <Badge variant={statusVariant[ticket.status] ?? "outline"}>
                    {ticket.status}
                  </Badge>
                </td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">
                  {ticket.status === "concluído"
                    ? format(new Date(ticket.updatedAt), "dd/MM/yyyy", { locale: ptBR })
                    : "—"
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
