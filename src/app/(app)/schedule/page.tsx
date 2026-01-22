
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/hooks/use-auth';
import type { CalendarEvent, ExternalTicket, InternalTicket, User, ServiceContract, ProjectedEventResource, Sector } from '@/lib/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2, Calendar as CalendarIcon, List, Clock, Wrench, CalendarCheck } from 'lucide-react';
import { Calendar, momentLocalizer, Views, NavigateAction, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import '../../calendar.css';
import { addDays, parseISO, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

  useEffect(() => {
    setLoading(true);

    const collectionsToFetch = [
      { name: 'external-tickets', setter: setExternalTickets },
      { name: 'internal-tickets', setter: setInternalTickets },
      { name: 'users', setter: setAllUsers },
      { name: 'serviceContracts', setter: setContracts },
      { name: 'sectors', setter: setAllSectors },
    ];

    let loadedCount = 0;
    const totalCollections = collectionsToFetch.length;

    const unsubscribes = collectionsToFetch.map(({ name, setter }) => {
      return onSnapshot(collection(db, name),
        (snapshot) => {
          setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
          loadedCount++;
          if (loadedCount === totalCollections) {
            setLoading(false);
          }
        },
        (error) => {
          console.error(`Error fetching ${name}:`, error);
          setter([]);
          loadedCount++;
          if (loadedCount === totalCollections) {
            setLoading(false);
          }
        }
      );
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);
  
  const events = useMemo(() => {
    if (!user) return [];

    let visibleExternalTickets = externalTickets;
    let visibleInternalTickets = internalTickets;
    let visibleContracts = contracts.filter(c => c.status === 'active');

    if (user.role === 'encarregado') {
      visibleExternalTickets = externalTickets.filter(ticket => user.sectorIds?.includes(ticket.sectorId));
      visibleInternalTickets = internalTickets.filter(ticket => ticket.sectorId && user.sectorIds?.includes(ticket.sectorId));
      visibleContracts = visibleContracts.filter(c => c.sectorIds.some(sId => user.sectorIds?.includes(sId)));
    } else if (user.role === 'tecnico') {
      visibleExternalTickets = externalTickets.filter(ticket => ticket.technicianId === user.id);
      visibleInternalTickets = internalTickets.filter(ticket => ticket.assigneeId === user.id);
      visibleContracts = []; // Técnicos não veem preventivas futuras
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
    
    const projectedEvents: CalendarEvent[] = [];
    visibleContracts.forEach(contract => {
        const visibleSectorsForContract = user.role === 'encarregado' 
            ? contract.sectorIds.filter(sId => user.sectorIds!.includes(sId))
            : contract.sectorIds;

        visibleSectorsForContract.forEach(sectorId => {
            const lastTicket = externalTickets
                .filter(t => t.client.id === contract.clientId && t.sectorId === sectorId && t.type === 'contrato' && t.status === 'concluído')
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                [0];
            
            const baseDate = lastTicket ? parseISO(lastTicket.updatedAt) : parseISO(contract.createdAt);
            let nextDueDate = addDays(baseDate, contract.frequencyDays);
            
            const today = startOfDay(new Date());
            while (nextDueDate < today) {
                nextDueDate = addDays(nextDueDate, contract.frequencyDays);
            }

            projectedEvents.push({
                title: `Preventiva: ${contract.clientName}`,
                start: nextDueDate,
                end: nextDueDate,
                type: 'projected',
                resource: {
                    id: `proj-${contract.id}-${sectorId}`,
                    clientName: contract.clientName,
                    clientId: contract.clientId,
                    sectorId: sectorId,
                    status: 'previsto',
                }
            });
        });
    });


    return [...externalEvents, ...internalEvents, ...projectedEvents];
  }, [externalTickets, internalTickets, user, contracts, allSectors]);

  const onNavigate = useCallback((newDate: Date) => setCurrentDate(newDate), [setCurrentDate])
  const onView = useCallback((newView: View) => setCurrentView(newView), [setCurrentView])

  const onSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.type === 'external') {
      router.push(`/external-tickets/${event.resource.id}`);
    } else if (event.type === 'internal') {
      // Potentially open a dialog for internal tickets in the future
      console.log('Internal ticket selected:', event.resource);
    }
  }, [router]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const style: React.CSSProperties = {
      borderRadius: '4px',
      opacity: 0.95,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
    };

    if ((event.resource as ExternalTicket).status === 'concluído') {
      style.backgroundColor = 'hsl(var(--muted))';
      style.color = 'hsl(var(--muted-foreground))';
      style.textDecoration = 'line-through';
      style.opacity = 0.6;
      style.borderColor = 'hsl(var(--border))';
      return { style };
    }

    switch (event.type) {
        case 'external':
            const ticket = event.resource as ExternalTicket;
            switch (ticket.type) {
                case 'urgente':
                    style.backgroundColor = 'hsl(var(--destructive))';
                    style.color = 'hsl(var(--destructive-foreground))';
                    style.borderColor = 'hsl(var(--destructive) / 0.5)';
                    break;
                case 'contrato':
                    style.backgroundColor = 'hsl(var(--chart-2))';
                    style.color = 'hsl(var(--accent-foreground))';
                    style.borderColor = 'hsl(var(--chart-2) / 0.5)';
                    break;
                case 'retorno':
                    style.backgroundColor = 'hsl(var(--chart-5))';
                    style.color = 'hsl(var(--accent-foreground))';
                    style.borderColor = 'hsl(var(--chart-5) / 0.5)';
                    break;
                default: // padrão, agendado
                    style.backgroundColor = 'hsl(var(--primary))';
                    style.color = 'hsl(var(--primary-foreground))';
                    style.borderColor = 'hsl(var(--primary) / 0.5)';
            }
            break;
        case 'internal':
            style.backgroundColor = 'hsl(var(--secondary))';
            style.color = 'hsl(var(--secondary-foreground))';
            style.borderColor = 'hsl(var(--border))';
            break;
        case 'projected':
            style.backgroundColor = 'transparent';
            style.color = 'hsl(var(--muted-foreground))';
            style.borderStyle = 'dashed';
            style.borderColor = 'hsl(var(--border))';
            break;
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
                popup
            />
        </div>
        <Card className="lg:col-span-3 xl:col-span-1 h-auto xl:h-[75vh] flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <List className="mr-2 h-5 w-5" />
                    Eventos do Mês
                </CardTitle>
            </CardHeader>
             <CardContent className="flex-1 overflow-y-auto p-2">
                <div className="space-y-2">
                    {events
                        .filter(e => moment(e.start).isSame(currentDate, 'month'))
                        .sort((a,b) => a.start.getTime() - b.start.getTime())
                        .map((event, index) => {
                            const isConcluded = event.resource.status === 'concluído';
                            const isProjected = event.type === 'projected';
                            
                            const eventStyle = eventStyleGetter(event).style;
                            const listItemStyle: React.CSSProperties = {
                                backgroundColor: isConcluded || isProjected ? 'hsl(var(--muted) / 0.3)' : `${eventStyle.backgroundColor}1A`, // 10% opacity
                                borderLeftColor: eventStyle.backgroundColor,
                                borderLeftWidth: '4px',
                            };
                            
                            let icon = <Wrench className="h-4 w-4" />;
                            if(isProjected) icon = <CalendarCheck className="h-4 w-4" />;
                            else if(event.type === 'internal') icon = <Clock className="h-4 w-4" />;
                            
                            const assignee = allUsers.find(u => u.id === (event.resource as ExternalTicket).technicianId)
                            const creator = allUsers.find(u => u.id === (event.resource as InternalTicket).creatorId)

                            return (
                            <div key={`${event.resource.id}-${index}`} style={listItemStyle} className={cn("flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted", isConcluded && "opacity-70")} onClick={() => !isProjected && onSelectEvent(event)}>
                                <div className="flex flex-col items-center justify-center text-center w-12">
                                    <span className="font-bold text-lg leading-none">{moment(event.start).format('DD')}</span>
                                    <span className="text-xs text-muted-foreground uppercase">{moment(event.start).format('MMM')}</span>
                                </div>
                                <div className="flex-1 space-y-0.5 overflow-hidden">
                                    <p className={cn("font-semibold text-sm truncate", isConcluded && "line-through")}>{event.title}</p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            {icon}
                                            <span>{isProjected ? `Setor: ${allSectors.find(s => s.id === (event.resource as ProjectedEventResource).sectorId)?.name}` : (assignee ? assignee.name.split(' ')[0] : (creator ? `Por: ${creator.name.split(' ')[0]}`: 'N/A'))}</span>
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={isConcluded ? 'outline' : 'default'} style={isConcluded ? {} : {backgroundColor: eventStyle.backgroundColor, color: eventStyle.color}} className="capitalize text-xs whitespace-nowrap">
                                    {isProjected ? 'Previsto' : event.resource.status}
                                </Badge>
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
