
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { ExternalTicket, OptimizedRoute, Technician, RouteHistoryEntry } from '@/lib/types';
import { optimizeTechnicianRoutes } from '@/ai/flows/optimize-technician-routes';
import { OptimizedRouteList } from './optimized-route-list';
import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { format } from 'date-fns';


interface RouteOptimizerProps {
    tickets: ExternalTicket[];
}

export function RouteOptimizer({ tickets }: RouteOptimizerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRouteSaved, setIsRouteSaved] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleOptimizeRoute = () => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Erro de Autenticação",
            description: "Usuário não encontrado. Faça login novamente.",
        });
        return;
    }
  
    setIsLoading(true);
    setOptimizedRoute(null);
    setIsRouteSaved(false);

    const ticketsToOptimize = tickets.filter(ticket => {
        const isMyTicket = ticket.technicianId === user.id;
        const isInProgress = ticket.status === 'em andamento';
        const hasAddress = !!ticket.client.address;

        return isMyTicket && isInProgress && hasAddress;
    });

    if (ticketsToOptimize.length === 0) {
        toast({
            title: "Nenhum chamado encontrado",
            description: "Você não possui chamados 'em andamento' com endereço para otimizar.",
        });
        setIsLoading(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        const ticketAddresses = ticketsToOptimize.map(t => ({
            ticketId: t.id,
            address: t.client.address || ''
        }));

        try {
          const result = await optimizeTechnicianRoutes({
            currentLocation: { latitude, longitude },
            ticketAddresses: ticketAddresses,
            userId: user.id
          });

          const finalOptimizedRoute: OptimizedRoute = {
            ...result,
            tickets: result.optimizedRoute.map(routeItem => {
                return ticketsToOptimize.find(t => t.id === routeItem.ticketId)!;
            })
          };
          setOptimizedRoute(finalOptimizedRoute);

        } catch (error) {
            console.error("Error optimizing route with AI: ", error);
            toast({
                variant: "destructive",
                title: "Erro na Otimização",
                description: "Não foi possível otimizar a rota. Tente novamente.",
            });
        } finally {
            setIsLoading(false);
        }

      },
      (error) => {
        console.error("Geolocation error: ", error);
        toast({
          variant: "destructive",
          title: "Erro de Localização",
          description: "Não foi possível obter sua localização. Verifique as permissões de localização do seu navegador para este site.",
        });
        setIsLoading(false);
      }
    );
  };
  
  const handleRouteReorder = (reorderedTickets: ExternalTicket[]) => {
    if (optimizedRoute) {
        setOptimizedRoute({
            ...optimizedRoute,
            tickets: reorderedTickets,
        });
        setIsRouteSaved(false); // Mark as unsaved if reordered
    }
  }

  const handleDeleteTicketFromRoute = (ticketId: string) => {
      if (!optimizedRoute) return;

      const updatedTickets = optimizedRoute.tickets.filter(t => t.id !== ticketId);
      const updatedRouteItems = optimizedRoute.optimizedRoute.filter(item => item.ticketId !== ticketId);

      setOptimizedRoute({
          ...optimizedRoute,
          tickets: updatedTickets,
          optimizedRoute: updatedRouteItems,
      });
      setIsRouteSaved(false); // Mark as unsaved if modified
  }

  const handleSaveRoute = async () => {
    if (!user || !optimizedRoute) return;

    setIsSaving(true);
    const routeOrder = optimizedRoute.tickets.map(ticket => ticket.id);
    const technicianRef = doc(db, 'technicians', user.id);

    try {
        await updateDoc(technicianRef, {
            routeOrder: routeOrder,
        });
        toast({
            title: "Rota Salva!",
            description: "A nova ordem de atendimentos foi salva e está visível para seu encarregado."
        });
        setIsRouteSaved(true);
    } catch (error) {
        console.error("Error saving route:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar Rota",
            description: "Não foi possível salvar a ordem da rota. Tente novamente."
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleClearRoute = async () => {
    if (!user) return;
    setIsClearing(true);
    const technicianRef = doc(db, 'technicians', user.id);
    
    try {
        const techDoc = await getDoc(technicianRef);
        if (techDoc.exists()) {
            const techData = techDoc.data() as Technician;
            const currentRouteOrder = techData.routeOrder;

            // Archive the route before clearing it
            if (currentRouteOrder && currentRouteOrder.length > 0) {
                const historyEntry: RouteHistoryEntry = {
                    date: format(new Date(), 'yyyy-MM-dd'),
                    routeOrder: currentRouteOrder,
                    finishedAt: new Date().toISOString(),
                };
                
                await updateDoc(technicianRef, {
                    routeHistory: arrayUnion(historyEntry),
                    routeOrder: [], // Clear the current route
                });
            } else {
                 // If there's no current route, just ensure it's cleared.
                await updateDoc(technicianRef, {
                    routeOrder: [],
                });
            }
        }

        toast({
            title: "Rota Limpa e Arquivada!",
            description: "Sua rota foi salva no histórico e limpa para o próximo dia."
        });
        setOptimizedRoute(null);
        setIsRouteSaved(false);
    } catch (error) {
        console.error("Error clearing and archiving route:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Limpar Rota",
            description: "Não foi possível limpar e arquivar sua rota. Tente novamente."
        });
    } finally {
        setIsClearing(false);
    }
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Planejamento de Rota</CardTitle>
        <CardDescription>
          Otimize a sequência de todos os seus chamados "em andamento" que possuem endereço.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-4 items-center">
          <Button onClick={handleOptimizeRoute} disabled={isLoading || isSaving || isClearing}>
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Otimizando...
                </>
            ) : (
                <>
                    <Map className="mr-2 h-4 w-4" />
                    Otimizar Rota com IA
                </>
            )}
          </Button>
          <Button variant="destructive" onClick={handleClearRoute} disabled={isClearing || isLoading}>
            {isClearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="mr-2 h-4 w-4" />
            )}
            Limpar Rota Salva
          </Button>
        </div>

        <div className="border rounded-lg min-h-[300px] flex items-center justify-center p-6 bg-background/50">
            {isLoading ? (
                 <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-lg font-medium">Analisando seus chamados e sua localização...</p>
                    <p>Isso pode levar alguns instantes.</p>
                 </div>
            ) : optimizedRoute ? (
                <OptimizedRouteList 
                    route={optimizedRoute} 
                    onReorder={handleRouteReorder}
                    onDeleteTicket={handleDeleteTicketFromRoute}
                    onSaveRoute={handleSaveRoute}
                    isSaving={isSaving}
                    isRouteSaved={isRouteSaved}
                />
            ) : (
                <div className="text-center text-muted-foreground">
                    <Map className="mx-auto h-12 w-12 mb-4" />
                    <p>Clique no botão para gerar uma rota otimizada para seus atendimentos.</p>
                    <p className="text-xs mt-2">A IA usará sua localização atual como ponto de partida.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
