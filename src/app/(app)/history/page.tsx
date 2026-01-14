

'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { HistoryFilterBar, HistoryFilters } from '@/components/history/history-filter-bar';
import { HistoryTable } from '@/components/history/history-table';
import { useAuth } from '@/hooks/use-auth';
import type { ExternalTicket, Sector, User, RouteHistoryEntry } from '@/lib/types';
import { isWithinInterval, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2 } from 'lucide-react';
import { VisibilityState } from '@tanstack/react-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RouteHistoryDisplay } from '@/components/history/route-history-display';

export default function HistoryPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<HistoryFilters>({
    startDate: undefined,
    endDate: undefined,
    technicianId: 'all',
  });
  const [tickets, setTickets] = useState<ExternalTicket[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    id: false,
    description: false,
    createdAt: false,
    type: false,
  });

  useEffect(() => {
    setLoading(true);

    const ticketsQuery = query(collection(db, "external-tickets"), where("status", "==", "concluído"));
    
    const unsubscribes = [
      onSnapshot(ticketsQuery, snapshot => {
        setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket)));
        setLoading(false);
      }),
      onSnapshot(collection(db, "sectors"), snapshot => {
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
      }),
      onSnapshot(collection(db, "users"), snapshot => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      }),
    ];

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const filteredTickets = useMemo(() => {
    let data: ExternalTicket[] = tickets;

    if (user?.role === 'tecnico' || user?.role === 'encarregado') {
        data = data.filter((ticket) => ticket.technicianId === user.id);
    } else if (filters.technicianId && filters.technicianId !== 'all') {
      data = data.filter(
        (ticket) => ticket.technicianId === filters.technicianId
      );
    }
    
    if (filters.startDate && filters.endDate) {
       const start = startOfDay(filters.startDate);
       const end = endOfDay(filters.endDate);
       data = data.filter((ticket) => {
         const ticketDate = parseISO(ticket.updatedAt);
         return isWithinInterval(ticketDate, { start, end });
       });
    } else if (filters.startDate) {
        const start = startOfDay(filters.startDate);
        data = data.filter((ticket) => parseISO(ticket.updatedAt) >= start);
    } else if (filters.endDate) {
        const end = endOfDay(filters.endDate);
        data = data.filter((ticket) => parseISO(ticket.updatedAt) <= end);
    }

    return data;
  }, [filters, user, tickets]);

  const filteredRouteHistory = useMemo(() => {
    let usersToFilter = users.filter(u => u.role === 'tecnico' || u.role === 'encarregado');
    if (user?.role === 'tecnico' || user?.role === 'encarregado') {
      usersToFilter = usersToFilter.filter(u => u.id === user.id);
    } else if (filters.technicianId && filters.technicianId !== 'all') {
      usersToFilter = usersToFilter.filter(u => u.id === filters.technicianId);
    }

    const history: (RouteHistoryEntry & { technicianName: string, technicianId: string })[] = [];
    usersToFilter.forEach(u => {
      if (u.routeHistory) {
        u.routeHistory.forEach(entry => {
          const entryDate = parseISO(entry.date);
          let include = true;
          if (filters.startDate && entryDate < startOfDay(filters.startDate)) {
            include = false;
          }
          if (filters.endDate && entryDate > endOfDay(filters.endDate)) {
            include = false;
          }
          if (include) {
            history.push({ ...entry, technicianName: u.name, technicianId: u.id });
          }
        });
      }
    });
    
    return history.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [filters, user, users]);
  

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Visualize o histórico de atendimentos e rotas da sua equipe."
      />
      
      <div className="space-y-6">
        <HistoryFilterBar 
          filters={filters} 
          onFilterChange={setFilters}
          allUsers={users}
        />
        {loading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList>
              <TabsTrigger value="tickets">Histórico de Atendimentos</TabsTrigger>
              <TabsTrigger value="routes">Histórico de Rotas</TabsTrigger>
            </TabsList>
            <TabsContent value="tickets">
              <HistoryTable 
                data={filteredTickets} 
                sectors={sectors} 
                users={users}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
              />
            </TabsContent>
            <TabsContent value="routes">
                <RouteHistoryDisplay 
                  historyEntries={filteredRouteHistory}
                  allTickets={tickets}
                />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
