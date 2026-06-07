
"use client";

import type { ExternalTicket, RouteHistoryEntry } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Truck, CheckCircle, Home, Flag } from "lucide-react";
import { Badge } from "../ui/badge";

interface RouteHistoryDisplayProps {
    historyEntries: (RouteHistoryEntry & { technicianName: string, technicianId: string })[];
    allTickets: ExternalTicket[];
}

export function RouteHistoryDisplay({ historyEntries, allTickets }: RouteHistoryDisplayProps) {
    
    if (historyEntries.length === 0) {
        return (
            <div className="flex items-center justify-center rounded-lg border min-h-[400px] bg-card text-center text-muted-foreground p-8">
                <p>Nenhum histórico de rota encontrado para os filtros selecionados.</p>
            </div>
        );
    }

    const getTicketById = (id: string) => {
        // We search both completed and other tickets, as a route might have had pending tickets.
        return allTickets.find(t => t.id === id);
    };
    
    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        return format(parseISO(isoString), 'HH:mm');
    };

    return (
        <div className="w-full space-y-4 pt-4">
             <Accordion type="single" collapsible className="w-full">
                {historyEntries.map((entry, index) => {
                    const routeTickets = entry.routeOrder.map(getTicketById).filter(Boolean) as ExternalTicket[];
                    return (
                        <AccordionItem value={`item-${index}`} key={`${entry.technicianId}-${entry.date}`}>
                            <AccordionTrigger>
                               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full pr-4 gap-1 sm:gap-4 min-w-0">
                                    <div className="flex flex-col text-left min-w-0">
                                        <span className="font-semibold truncate">{format(parseISO(entry.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                                        <span className="text-sm text-muted-foreground truncate">{entry.technicianName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                         {entry.finishedAt && (
                                            <Badge variant="secondary" className="text-xs">às {formatTime(entry.finishedAt)}</Badge>
                                         )}
                                         <Badge variant="outline" className="text-xs">{routeTickets.length} paradas</Badge>
                                    </div>
                               </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pl-4 border-l-2 ml-2">
                                     <div className="relative pl-8">
                                         <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                                         <p className="font-medium">Início da Rota (Empresa)</p>
                                     </div>
                                     {routeTickets.length > 0 ? routeTickets.map((ticket) => (
                                        <div key={ticket.id} className="relative pl-8">
                                            <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                                            <p className="font-medium">{ticket.client.name}</p>
                                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                                                <MapPin className="h-3 w-3 mr-1.5" />
                                                <span className="truncate">{ticket.client.address || 'Endereço não informado'}</span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center">
                                                    <Truck className="h-3 w-3 mr-1.5 text-blue-500"/>
                                                    <span>A caminho: {formatTime(ticket.enRouteAt)}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <Home className="h-3 w-3 mr-1.5 text-amber-500"/>
                                                    <span>Check-in: {formatTime(ticket.checkIn?.timestamp)}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <CheckCircle className="h-3 w-3 mr-1.5 text-green-500"/>
                                                    <span>Finalizado: {formatTime(ticket.checkOut?.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="pl-6 text-sm text-muted-foreground">Nenhum chamado encontrado para esta rota.</p>
                                    )}
                                     <div className="relative pl-8">
                                         <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                                         <p className="font-medium">Fim da Rota</p>
                                         {entry.finishedAt && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <Flag className="h-3 w-3 mr-1.5 text-red-500"/>
                                                <span>Rota finalizada às {formatTime(entry.finishedAt)}</span>
                                            </div>
                                         )}
                                     </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
}
