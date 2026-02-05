
'use client';

import { PageHeader } from "@/components/page-header";
import { RouteOptimizer } from "@/components/routes/route-optimizer";
import { db } from "@/firebase/config";
import { ExternalTicket } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function RoutesPage() {
  const [tickets, setTickets] = useState<ExternalTicket[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTickets([]);
      return;
    }

    const ticketsQuery = query(
      collection(db, "external-tickets"),
      where("technicianId", "==", user.id),
      where("status", "==", "em andamento")
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket));
      setTickets(ticketsData);
    }, (error) => {
      console.error("Error fetching tickets in real-time:", error);
      setTickets([]);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <>
      <PageHeader
        title="Otimizar Minha Rota"
        description="Planeje a rota para seus atendimentos 'em andamento'."
      />
      <div className="mt-6">
        {user && <RouteOptimizer tickets={tickets} />}
      </div>
    </>
  );
}
