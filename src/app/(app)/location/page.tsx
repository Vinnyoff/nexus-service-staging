

'use client';

import { PageHeader } from "@/components/page-header";
import { TechnicianRouteCard } from "@/components/location/technician-route-card";
import { db } from "@/firebase/config";
import { ExternalTicket, Sector, User } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LocationFilterBar } from "@/components/location/location-filter-bar";
import { isToday, parseISO } from "date-fns";

export default function LocationPage() {
  const [allTickets, setAllTickets] = useState<ExternalTicket[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [sectorFilter, setSectorFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    const ticketsQuery = query(collection(db, "external-tickets"), where("status", "in", ["em andamento", "concluído"]));
    
    const unsubscribes = [
        onSnapshot(ticketsQuery, snapshot => {
            setAllTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket)));
        }, () => setAllTickets([])),
        onSnapshot(collection(db, "users"), snapshot => {
            setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        }, () => setAllUsers([])),
        onSnapshot(collection(db, 'sectors'), snapshot => {
            setAllSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
            setLoading(false); // Set loading to false after sectors are fetched as it's the last one
        }, () => {
            setAllSectors([]);
            setLoading(false);
        }),
    ];

    // Failsafe to turn off loading
    const timer = setTimeout(() => {
        if(loading) setLoading(false)
    }, 3000);

    return () => {
        unsubscribes.forEach(unsub => unsub())
        clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const techniciansOnRoute = useMemo(() => {
    if (!user) return [];
  
    let visibleUsers: User[];
    if (user.role === 'admin' || user.role === 'gerente') {
      visibleUsers = allUsers.filter(u => u.role === 'tecnico' || u.role === 'encarregado');
    } else if (user.role === 'encarregado' && user.sectorIds) {
      visibleUsers = allUsers.filter(u =>
        (u.role === 'tecnico' || u.role === 'encarregado') && u.sectorIds?.some(sectorId => user.sectorIds!.includes(sectorId))
      );
    } else {
      visibleUsers = allUsers.filter(u => u.id === user.id);
    }
  
    if (sectorFilter !== 'all') {
      visibleUsers = visibleUsers.filter(u =>
        u.sectorIds?.includes(sectorFilter)
      );
    }
  
    // FIX: A technician is only "on route" if they have a saved route or an active enRoute ticket.
    const techniciansOnRoute = visibleUsers.filter(u =>
      (u.routeOrder && u.routeOrder.length > 0) || allTickets.some(t => t.technicianId === u.id && t.enRoute)
    );
    
    return techniciansOnRoute.map(u => {
      // The rest of the logic remains the same, as it correctly categorizes tickets for the card.
      // The main issue was displaying technicians who shouldn't be there in the first place.
      const allUserTickets = allTickets.filter(t => {
        if (t.technicianId !== u.id) return false;
        if (t.status === 'em andamento') return true;
        if (t.status === 'concluído' && t.updatedAt && isToday(parseISO(t.updatedAt))) return true;
        return false;
      });
      
      const routeOrder = u.routeOrder || [];
      const enRouteTicket = allUserTickets.find(t => t.enRoute);

      let ticketsOnRoute = allUserTickets.filter(t => 
        routeOrder.includes(t.id) ||
        t.enRoute ||
        (t.status === 'concluído' && (t.enRoute || routeOrder.includes(t.id)))
      );
      
      if (routeOrder.length > 0) {
        ticketsOnRoute.sort((a, b) => {
            const indexA = routeOrder.indexOf(a.id);
            const indexB = routeOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA === -1) return 1;  
            if (indexB === -1) return -1; 
            return 0;
        });
      } else {
         ticketsOnRoute.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      
      if (enRouteTicket && ticketsOnRoute.some(t => t.id === enRouteTicket.id)) {
          const enRouteIndex = ticketsOnRoute.findIndex(t => t.id === enRouteTicket.id);
          const lastCompletedIndex = ticketsOnRoute.map(t => t.status === 'concluído').lastIndexOf(true);
          
          if (enRouteIndex !== lastCompletedIndex + 1) {
              const [ticketToMove] = ticketsOnRoute.splice(enRouteIndex, 1);
              ticketsOnRoute.splice(lastCompletedIndex + 1, 0, ticketToMove);
          }
      }
      
      let otherTickets = allUserTickets.filter(t => 
        t.status === 'em andamento' && 
        !ticketsOnRoute.some(tr => tr.id === t.id)
      );
      
      const ticketsWithoutAddress = otherTickets.filter(t => !t.client.address);
      const offRouteTickets = otherTickets.filter(t => !!t.client.address);

      return {
        technician: u,
        ticketsWithAddress: ticketsOnRoute,
        ticketsWithoutAddress: ticketsWithoutAddress,
        offRouteTickets: offRouteTickets,
      };
    });
  }, [allTickets, allUsers, user, sectorFilter]);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Localização da Equipe" 
        description="Acompanhe o progresso das rotas dos técnicos em tempo real."
      />

       <div className="py-4">
        <LocationFilterBar
          allSectors={allSectors}
          currentUser={user}
          sectorFilter={sectorFilter}
          onSectorChange={setSectorFilter}
        />
      </div>

      <div className="mt-6 space-y-8">
        {techniciansOnRoute.length > 0 ? (
          techniciansOnRoute.map(({ technician, ticketsWithAddress, ticketsWithoutAddress, offRouteTickets }) => (
            <TechnicianRouteCard 
              key={technician.id} 
              technician={technician} 
              ticketsWithAddress={ticketsWithAddress}
              ticketsWithoutAddress={ticketsWithoutAddress}
              offRouteTickets={offRouteTickets}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-10 rounded-lg border bg-card">
              Nenhum técnico em rota no setor selecionado.
          </div>
        )}
      </div>
    </>
  );
}
