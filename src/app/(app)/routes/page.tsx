
'use client';

import { PageHeader } from "@/components/page-header";
import { RouteOptimizer } from "@/components/routes/route-optimizer";
import { db } from "@/firebase/config";
import { ExternalTicket } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function RoutesPage() {
  const [tickets, setTickets] = useState<ExternalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    setLoading(true);
    const ticketsQuery = query(
        collection(db, "external-tickets"), 
        where("technicianId", "==", user.id),
        where("status", "==", "em andamento")
    );
    
    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket));
        setTickets(ticketsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching tickets in real-time:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <>
      <PageHeader 
        title="Otimizar Minha Rota" 
        description="Planeje a rota para seus atendimentos 'em andamento'."
      />
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="mt-6">
          <RouteOptimizer tickets={tickets} />
        </div>
      )}
    </>
  );
}
