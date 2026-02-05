

'use client';

import type { ExternalTicket, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CheckCircle, Circle, MapPin, Truck, Home, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Separator } from "../ui/separator";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";

interface TechnicianWithAvatar extends User {
    avatarUrl?: string;
}

interface TechnicianRouteCardProps {
    technician: TechnicianWithAvatar;
    ticketsWithAddress: ExternalTicket[];
    ticketsWithoutAddress: ExternalTicket[];
    offRouteTickets: ExternalTicket[];
}

export function TechnicianRouteCard({ technician, ticketsWithAddress, ticketsWithoutAddress, offRouteTickets }: TechnicianRouteCardProps) {
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const [isRouteFinished, setIsRouteFinished] = useState(false);

    const getStatusForStop = (stop: any, allPreviousCompleted: boolean) => {
        if (isRouteFinished && stop.type === 'company' && stop.id === 'end-company') return 'completed';
        if (stop.type === 'company' && stop.id === 'start-company') return 'completed';
        if (stop.status === 'concluído') return 'completed';
        if (stop.checkIn) return 'on-site';
        if (stop.enRoute) return 'en-route-dest';
        return 'pending';
    };

    const handleFinishRoute = () => {
        // Here you would typically make an API call to clear the technician's route,
        // for now, we just update the local state for visual feedback.
        setIsRouteFinished(true);
    };

    // Memoize the processed route stops to avoid re-calculation on every render
    const { routeStops, remainingTicketsWithoutAddress } = useMemo(() => {
        let ticketsOnRoute = [...ticketsWithAddress];
        let otherTickets = [...ticketsWithoutAddress];

        const enRouteTicket = [...ticketsOnRoute, ...otherTickets, ...offRouteTickets].find(t => t.enRoute);

        // If an en-route ticket exists and it's from the "other" lists, move it
        if (enRouteTicket && !ticketsOnRoute.some(t => t.id === enRouteTicket.id)) {
            ticketsOnRoute.push(enRouteTicket);
            otherTickets = otherTickets.filter(t => t.id !== enRouteTicket.id);
        }
        
        // Sort the route based on the saved order
        if (technician.routeOrder && technician.routeOrder.length > 0) {
            ticketsOnRoute.sort((a, b) => {
                const indexA = technician.routeOrder!.indexOf(a.id);
                const indexB = technician.routeOrder!.indexOf(b.id);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }
        
        // If there's an en-route ticket, move it to be after the last completed one
        if (enRouteTicket && ticketsOnRoute.some(t => t.id === enRouteTicket.id)) {
            const enRouteIndex = ticketsOnRoute.findIndex(t => t.id === enRouteTicket.id);
            const lastCompletedIndex = ticketsOnRoute.map(t => t.status === 'concluído').lastIndexOf(true);
            
            // Do not move if it's already in the right place
            if (enRouteIndex !== lastCompletedIndex + 1) {
                const [ticketToMove] = ticketsOnRoute.splice(enRouteIndex, 1);
                ticketsOnRoute.splice(lastCompletedIndex + 1, 0, ticketToMove);
            }
        }
        
        const finalRouteStops = [
            { id: 'start-company', type: 'company', client: { name: 'Empresa (Partida)' }, status: 'concluído' }, // Always completed
            ...ticketsOnRoute,
            { id: 'end-company', type: 'company', client: { name: 'Retorno (Empresa)' } }
        ];

        return { routeStops: finalRouteStops, remainingTicketsWithoutAddress: otherTickets };
    }, [ticketsWithAddress, ticketsWithoutAddress, offRouteTickets, technician.routeOrder]);
    
    const allStopsCompleted = useMemo(() => {
        return ticketsWithAddress.every(t => t.status === 'concluído');
    }, [ticketsWithAddress]);


    return (
        <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={technician.avatarUrl} alt={technician.name} />
                    <AvatarFallback>{getInitials(technician.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle>{technician.name}</CardTitle>
                    <CardDescription>{ticketsWithAddress.length + ticketsWithoutAddress.length + offRouteTickets.length} chamados no dia</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Timeline for tickets */}
                <div className="flex items-start flex-wrap gap-y-4">
                    {routeStops.map((stop, index) => {
                        const allPreviousCompleted = routeStops.slice(1, index).every(s => (s as ExternalTicket).status === 'concluído');
                        const status = getStatusForStop(stop, allPreviousCompleted);
                        const previousStopStatus = index > 0 ? getStatusForStop(routeStops[index - 1], true) : 'none';
                        const isEnRouteConnector = status === 'en-route-dest' && (previousStopStatus === 'completed' || previousStopStatus === 'on-site');

                        const getIcon = () => {
                            if (stop.id === 'end-company' && allStopsCompleted) return <CheckCircle className="h-5 w-5" />;
                            if (status === 'completed') return <CheckCircle className="h-5 w-5" />;
                            if (stop.type === 'company') return <Home className="h-5 w-5" />;
                            if (!(stop as ExternalTicket).client.address) return <Circle className="h-5 w-5" />;
                            return <MapPin className="h-5 w-5" />;
                        };
                        
                        const isFinalStop = stop.id === 'end-company';
                        const canFinishRoute = allStopsCompleted && !isRouteFinished;

                        return (
                            <div key={stop.id} className="flex items-center">
                                {/* Connector line */}
                                {index > 0 && (
                                     <div className={cn(
                                        "relative flex-1 w-12 h-0.5",
                                        (previousStopStatus === 'completed' || (isRouteFinished && index === routeStops.length -1)) ? 'bg-primary' : 'bg-border'
                                    )}>
                                        {isEnRouteConnector && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Truck className="h-6 w-6 text-amber-500" />
                                                        </TooltipTrigger>
                                                         <TooltipContent>
                                                            <p>A caminho para {stop.client.name}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Stop Point */}
                                {isFinalStop && canFinishRoute ? (
                                    <div className="flex flex-col items-center">
                                        <Button onClick={handleFinishRoute} size="sm" className="flex h-8 w-auto items-center justify-center rounded-md border-2 border-primary bg-primary text-primary-foreground px-3">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Finalizar Rota
                                        </Button>
                                         <p className="text-xs text-center mt-2 w-28 truncate font-medium">{stop.client.name}</p>
                                    </div>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center">
                                                    <div className={cn(
                                                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                                                        status === 'completed' && "bg-green-500 border-green-600 text-white",
                                                        status === 'on-site' && "bg-blue-500 border-blue-600 text-white ring-4 ring-blue-500/30",
                                                        status === 'en-route-dest' && "bg-amber-500 border-amber-600 text-white",
                                                        status === 'pending' && "bg-muted border-border text-muted-foreground",
                                                    )}>
                                                        {getIcon()}
                                                    </div>
                                                    <p className="text-xs text-center mt-2 w-28 truncate font-medium">{stop.client.name}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-bold">{stop.client.name}</p>
                                                {(stop as ExternalTicket).client.address && <p className="text-sm text-muted-foreground">{(stop as ExternalTicket).client.address}</p>}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Section for remaining tickets without address */}
                {remainingTicketsWithoutAddress.length > 0 && (
                    <>
                        <Separator className="my-6"/>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-4">Chamados Remotos / Sem Endereço</h4>
                            <div className="flex flex-wrap gap-4">
                                {remainingTicketsWithoutAddress.map(ticket => (
                                     <TooltipProvider key={ticket.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed bg-muted text-muted-foreground">
                                                        <Circle className="h-5 w-5" />
                                                    </div>
                                                    <p className="text-xs text-center mt-2 w-28 truncate font-medium">{ticket.client.name}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-bold">{ticket.client.name}</p>
                                                <p className="text-sm text-muted-foreground">Atendimento remoto ou sem endereço.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                 {/* Section for new tickets not in the route */}
                {offRouteTickets.length > 0 && (
                    <>
                        <Separator className="my-6"/>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-4">Novos Chamados (Fora da Rota)</h4>
                            <div className="flex flex-wrap gap-4">
                                {offRouteTickets.map(ticket => (
                                     <TooltipProvider key={ticket.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                                                        <AlertTriangle className="h-5 w-5" />
                                                    </div>
                                                    <p className="text-xs text-center mt-2 w-28 truncate font-medium">{ticket.client.name}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-bold">{ticket.client.name}</p>
                                                <p className="text-sm text-muted-foreground">Novo chamado não planejado na rota.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
