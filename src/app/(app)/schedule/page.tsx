'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/hooks/use-auth';
import type { CalendarEvent, ExternalTicket, InternalTicket, User } from '@/lib/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2, Calendar as CalendarIcon, List, Clock, Wrench } from 'lucide-react';
import { Calendar, momentLocalizer, Views, NavigateAction, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import '../../calendar.css';
import { parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const messages = {
  allDay: 'Dia todo',
  previous: '<',
  next: '>',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há eventos neste período.',
  showMore: (total: any) => `+ Ver mais (${total})`,
};

export default function SchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [externalTickets, setExternalTickets] = useState<ExternalTicket[]>([]);
  const [internalTickets, setInternalTickets] = useState<InternalTicket[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

  useEffect(() => {
    setLoading(true);

    const unsubscribes = [
      onSnapshot(collection(db, 'external-tickets'), (snapshot) => {
        setExternalTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ExternalTicket)));
      }),
      onSnapshot(collection(db, 'internal-tickets'), (snapshot) => {
        setInternalTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InternalTicket)));
      }),
      onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User)));
      }),
    ];

    setLoading(false);
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);
  
  const events = useMemo(() => {
    if (!user) return [];

    let visibleExternalTickets = externalTickets;
    let visibleInternalTickets = internalTickets;

    if (user.role === 'encarregado') {
      visibleExternalTickets = externalTickets.filter(ticket => 
        user.sectorIds?.includes(ticket.sectorId)
      );
      visibleInternalTickets = internalTickets.filter(ticket => 
        ticket.sectorId && user.sectorIds?.includes(ticket.sectorId)
      );
    } else if (user.role === 'tecnico') {
      visibleExternalTickets = externalTickets.filter(ticket =>
        ticket.technicianId === user.id
      );
      visibleInternalTickets = internalTickets.filter(ticket =>
        ticket.assigneeId === user.id
      );
    }

    const externalEvents: CalendarEvent[] = visibleExternalTickets
      .filter(ticket => ticket.scheduledTo)
      .map(ticket => ({
        title: `${ticket.client.name}`,
        start: parseISO(ticket.scheduledTo!),
        end: parseISO(ticket.scheduledTo!),
        resource: ticket,
        type: 'external'
      }));
      
    const internalEvents: CalendarEvent[] = visibleInternalTickets
        .filter(ticket => ticket.scheduledTo)
        .map(ticket => ({
            title: ticket.title,
            start: parseISO(ticket.scheduledTo!),
            end: parseISO(ticket.scheduledTo!),
            resource: ticket,
            type: 'internal'
        }));

    return [...externalEvents, ...internalEvents];
  }, [externalTickets, internalTickets, user]);

  const onNavigate = useCallback((newDate: Date) => setCurrentDate(newDate), [setCurrentDate])
  const onView = useCallback((newView: View) => setCurrentView(newView), [setCurrentView])

  const onSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.type === 'external') {
      router.push(`/external-tickets/${event.resource.id}`);
    } else {
      // Potentially open a dialog for internal tickets in the future
      console.log('Internal ticket selected:', event.resource);
    }
  }, [router]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let style = {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
    };
    if (event.type === 'internal') {
      style.backgroundColor = 'hsl(var(--secondary))';
      style.color = 'hsl(var(--secondary-foreground))';
    }
    if ((event.resource as ExternalTicket).status === 'concluído') {
      style.backgroundColor = 'hsl(var(--muted))';
      style.color = 'hsl(var(--muted-foreground))';
    }
    return { style };
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Visualize todos os atendimentos agendados."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 xl:col-span-2 h-[75vh] bg-card p-4 rounded-lg border">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                messages={messages}
                onNavigate={onNavigate}
                onView={onView}
                date={currentDate}
                view={currentView}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventStyleGetter}
            />
        </div>
        <Card className="lg:col-span-3 xl:col-span-1 h-auto xl:h-[75vh] flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <List className="mr-2 h-5 w-5" />
                    Eventos do Mês
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                    {events
                        .filter(e => moment(e.start).isSame(currentDate, 'month'))
                        .sort((a,b) => a.start.getTime() - b.start.getTime())
                        .map((event, index) => {
                           const user = allUsers.find(u => u.id === (event.resource as ExternalTicket).technicianId)
                           return (
                            <div key={`${event.resource.id}-${index}`} className="flex items-start gap-4 p-3 rounded-md border bg-muted/50 hover:bg-muted cursor-pointer" onClick={() => onSelectEvent(event)}>
                                <div className="flex flex-col items-center justify-center w-12">
                                    <span className="text-sm font-bold text-primary">{moment(event.start).format('DD')}</span>
                                    <span className="text-xs text-muted-foreground">{moment(event.start).format('MMM')}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{event.title}</p>
                                    <p className="text-xs text-muted-foreground flex items-center">
                                       {event.type === 'external' ? <Wrench className="h-3 w-3 mr-1.5" /> : <Clock className="h-3 w-3 mr-1.5" />}
                                       {user ? `Téc: ${user.name}` : (event.resource as InternalTicket).creatorId ? `Criador: ${allUsers.find(u => u.id === (event.resource as InternalTicket).creatorId)?.name}` : ''}
                                    </p>
                                </div>
                                <Badge variant={event.resource.status === 'concluído' ? 'outline' : 'default'} className="capitalize text-xs">{event.resource.status}</Badge>
                            </div>
                           )
                        })
                    }
                     {events.filter(e => moment(e.start).isSame(currentDate, 'month')).length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-10">
                            Nenhum evento agendado para este mês.
                        </div>
                     )}
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
