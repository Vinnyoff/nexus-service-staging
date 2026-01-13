
import type { ExternalTicket, Sector, User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInHours, formatDistanceToNowStrict, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { MoreHorizontal, Calendar, UserSquare, MapPin, Hand, History, XCircle, Truck, Copy, Clock, AlertTriangle, Building2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useEffect, useState } from "react";

interface SlaTimerProps {
    expiresAt: string;
}

const SlaTimer: React.FC<SlaTimerProps> = ({ expiresAt }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // Atualiza o estado a cada minuto para o cronômetro funcionar
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000 * 60); 
        return () => clearInterval(interval);
    }, []);

    const expirationDate = parseISO(expiresAt);
    
    // Verifica se a data de expiração já passou
    if (isAfter(now, expirationDate)) {
        return (
             <div className="flex items-center text-xs text-red-600 dark:text-red-500 pt-2 font-medium">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                <span className="font-semibold mr-1">SLA Violado</span>
            </div>
        )
    }

    const colorClass = "text-green-600 dark:text-green-500";

    return (
        <div className={cn("flex items-center text-xs pt-2 font-medium", colorClass)}>
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            <span className="font-semibold mr-1">SLA:</span>
            {formatDistanceToNowStrict(expirationDate, { locale: ptBR, addSuffix: true })}
        </div>
    );
};


interface ExternalTicketCardProps {
  ticket: ExternalTicket;
  users: User[];
  sectors: Sector[];
  onViewDetails: () => void;
  onAssignToMe: () => void;
  onSetEnRoute: () => void;
  onStatusChange: (ticketId: string, status: ExternalTicket['status']) => void;
  onConfirmAction: (action: 'reopen' | 'cancel' | 'take', ticket: ExternalTicket) => void;
  currentUser: User | null;
  hasActiveRoute: boolean;
}

export function ExternalTicketCard({ 
    ticket, 
    onViewDetails, 
    onConfirmAction, 
    onAssignToMe,
    onSetEnRoute,
    onStatusChange, 
    users, 
    sectors,
    currentUser,
    hasActiveRoute,
}: ExternalTicketCardProps) {
  const creator = users.find((u) => u.id === ticket.creatorId);
  const assignee = users.find((u) => u.id === ticket.technicianId);
  const sector = sectors.find(s => s.id === ticket.sectorId);
  const isCurrentUserAssigned = currentUser?.id === ticket.technicianId;
  const hasComments = ticket.comments && ticket.comments.length > 0;

  const isUserInSector = currentUser?.role === 'encarregado' && ticket.sectorId && currentUser.sectorIds?.includes(ticket.sectorId);

  const canUserIntervene = currentUser && (
    isCurrentUserAssigned ||
    currentUser.role === 'admin' ||
    currentUser.role === 'gerente' ||
    isUserInSector
  );


  const getStatusVariant = (status: ExternalTicket['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'concluído':
        return 'default';
      case 'em andamento':
        return 'secondary';
      case 'cancelado':
        return 'destructive';
      case 'pendente':
      default:
        return 'outline';
    }
  }
  
  const getTypeVariant = (type: ExternalTicket['type']): "default" | "secondary" | "destructive" | "outline" => {
      switch (type) {
          case 'contrato':
              return 'secondary';
          case 'urgente':
              return 'destructive';
          case 'retorno':
              return 'outline';
          case 'agendado':
              return 'default';
          case 'padrão':
          default:
              return 'default';
      }
  }

  const getCardClasses = (type: ExternalTicket['type']) => {
    const typeClass = {
        'padrão': 'bg-card hover:bg-muted/50 border-l-4 border-l-transparent',
        'contrato': 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200/70 dark:hover:bg-blue-900/60 border-l-4 border-l-blue-500 dark:border-l-blue-400',
        'urgente': 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200/70 dark:hover:bg-red-900/60 border-l-4 border-l-red-500 dark:border-l-red-400',
        'agendado': 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200/70 dark:hover:bg-green-900/60 border-l-4 border-l-green-500 dark:border-l-green-400',
        'retorno': 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200/70 dark:hover:bg-orange-900/60 border-l-4 border-l-orange-500 dark:border-l-orange-400',
    }[type];

    return cn(
        "flex flex-col transition-colors cursor-pointer",
        typeClass
    );
  }
  
  const getPriorityVariant = (priority: 'Normal' | 'Alta' | 'Extrema'): "secondary" | "default" | "destructive" => {
    switch (priority) {
        case 'Extrema':
            return 'destructive';
        case 'Alta':
            return 'default';
        case 'Normal':
        default:
            return 'secondary';
    }
  }

  const renderTechnicianStatus = () => {
    const technicianName = assignee?.name.split(' ')[0] || 'Técnico';
    switch (ticket.status) {
        case 'concluído':
            return `Finalizado por ${technicianName}`;
        case 'em andamento':
            return `Em andamento por ${technicianName}`;
        case 'pendente':
            return assignee ? `Aguardando atendimento por ${technicianName}` : 'Aguardando atribuição';
        case 'cancelado':
            return 'Cancelado';
        default:
            return assignee ? `Atribuído a ${technicianName}` : "Sem técnico atribuído";
    }
  }
  
  const showGrabButton = ticket.status === 'pendente' && !ticket.technicianId && (currentUser?.role === 'tecnico' || currentUser?.role === 'encarregado');
  const showReopenButton = ticket.status === 'concluído' && canUserIntervene;
  const canBeCancelled = (ticket.status === 'pendente' || ticket.status === 'em andamento') && canUserIntervene;
  
  // New logic for "En Route" button visibility
  const isEnRoute = ticket.enRoute === true;
  const showEnRouteButton = isCurrentUserAssigned && ticket.status === 'em andamento' && !ticket.checkIn && !hasActiveRoute && !isEnRoute;

  const truncatedClientName = ticket.client.name.length > 27
    ? `${ticket.client.name.substring(0, 27)}...`
    : ticket.client.name;

  return (
    <Card className={getCardClasses(ticket.type)} onClick={onViewDetails}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{truncatedClientName}</CardTitle>
                {ticket.type === 'contrato' && ticket.priority && (
                   <Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                )}
                {hasComments && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <MessageSquare className="h-5 w-5 text-primary fill-primary/20" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Este chamado possui comentários.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            {ticket.requesterName && <CardDescription className="text-xs">Solicitado por: {ticket.requesterName}</CardDescription>}
            <CardDescription className="pt-1">{renderTechnicianStatus()}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={onViewDetails}>Ver Detalhes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ticket.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar ID do Chamado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {showReopenButton && (
                  <DropdownMenuItem onClick={() => onConfirmAction('reopen', ticket)} className='border border-transparent'>
                    <History className="mr-2 h-4 w-4" />
                    Reabrir Chamado
                  </DropdownMenuItem>
              )}
               {canBeCancelled && (
                  <DropdownMenuItem onClick={() => onConfirmAction('cancel', ticket)} className="text-destructive focus:text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 py-2 flex flex-col">
        <div className="border rounded-md p-3 bg-background/50 flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-3">{ticket.description}</p>
        </div>
        
        {ticket.slaExpiresAt && ticket.status === 'pendente' && <SlaTimer expiresAt={ticket.slaExpiresAt} />}
        
        {ticket.scheduledTo && (
            <div className="flex items-center text-xs text-red-600 dark:text-red-500 pt-2 font-medium">
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                <span className="font-semibold mr-1">Agendado:</span>
                {format(parseISO(ticket.scheduledTo), 'dd/MM/yyyy HH:mm', {locale: ptBR})}
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 mt-auto border-t pt-4">
         <div className="w-full space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center">
                <UserSquare className="mr-2 h-3.5 w-3.5" />
                <span>{creator?.name || 'Desconhecido'}</span>
            </div>
            <div className="flex items-center">
                <Calendar className="mr-2 h-3.5 w-3.5" />
                <span>{format(new Date(ticket.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
             {sector && (
                <div className="flex items-center">
                    <Building2 className="mr-2 h-3.5 w-3.5" />
                    <span>{sector.name}</span>
                </div>
            )}
            {ticket.client.address && (
                <div className="flex items-center">
                    <MapPin className="mr-2 h-3.5 w-3.5" />
                    <span className="truncate">{ticket.client.address}</span>
                </div>
            )}
        </div>
        
        <div className="w-full pt-2 flex flex-col gap-2">
            <div className="flex justify-between items-center w-full">
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger>
                        <Badge
                        variant={getTypeVariant(ticket.type)}
                        className="capitalize"
                        >
                        {ticket.type}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Tipo de chamado</p>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Badge
                    variant={getStatusVariant(ticket.status)}
                    className="capitalize"
                >
                    {ticket.status}
                </Badge>
            </div>
            
            {showGrabButton && (
                <Button className="w-full" onClick={(e) => { e.stopPropagation(); onAssignToMe(); }}>
                    <Hand className="mr-2 h-4 w-4" />
                    Pegar Chamado
                </Button>
            )}

            {showEnRouteButton && (
                 <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); onSetEnRoute(); }}>
                    <Truck className="mr-2 h-4 w-4" />
                    A Caminho
                </Button>
            )}
            
            {isEnRoute && (
                <div className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-blue-600 text-white">
                    <Truck className="h-4 w-4" />
                    Destino Atual
                </div>
            )}

            {showReopenButton && (
                <Button className="w-full border" variant="secondary" onClick={(e) => { e.stopPropagation(); onConfirmAction('reopen', ticket); }}>
                    <History className="mr-2 h-4 w-4" />
                    Reabrir Chamado
                </Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}
