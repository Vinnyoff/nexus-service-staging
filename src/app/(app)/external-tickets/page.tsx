
"use client"

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, LayoutDashboard, List, RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewExternalTicketForm, NewExternalTicketFormValues } from "@/components/external-tickets/new-external-ticket-form";
import { ExternalTicket, Sector, User, Technician, Comment, Checklist, ChecklistTaskState } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { ExternalTicketCard } from "@/components/external-tickets/external-ticket-card";
import { ExternalTicketsFilterBar, StatusFilter } from "@/components/external-tickets/external-tickets-filter-bar";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, getDocs, doc, updateDoc, deleteField, writeBatch, onSnapshot, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { isToday, parseISO, isPast } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ExternalTicketsTable } from "@/components/external-tickets/external-tickets-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { sendWhatsappMessage } from "@/lib/services/notification-service";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


type ConfirmationState = {
    isOpen: boolean;
    action: 'reopen' | 'cancel' | 'take' | null;
    ticket: ExternalTicket | null;
    reason?: string;
};

const STATUS_FILTER_STORAGE_KEY = 'external_tickets_status_filter';
const VIEW_MODE_STORAGE_KEY = 'external_tickets_view_mode';

type ViewMode = 'kanban' | 'list';

export default function ExternalTicketsPage() {
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);
  const [tickets, setTickets] = useState<ExternalTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ isOpen: false, action: null, ticket: null, reason: '' });
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem(STATUS_FILTER_STORAGE_KEY) as StatusFilter) || 'pendente';
    }
    return 'pendente';
  });
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [contractOnly, setContractOnly] = useState(false);
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);
  
  useEffect(() => {
    const storedViewMode = sessionStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
    if (isMobile) {
      setViewMode('kanban');
    } else {
      setViewMode(storedViewMode || 'kanban');
    }
  }, [isMobile]);

  useEffect(() => {
    setLoading(true);
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
            const userData = { id: doc.id, ...doc.data() } as User;
             if ((userData as any).sectorId && !userData.sectorIds) {
                userData.sectorIds = [(userData as any).sectorId];
            } else if (!userData.sectorIds) {
                userData.sectorIds = [];
            }
            return userData;
        });
        setUsers(usersData);
    }, () => setUsers([]));
    
    const unsubSectors = onSnapshot(collection(db, "sectors"), (snapshot) => {
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
    }, () => setSectors([]));
    
    const unsubTechs = onSnapshot(collection(db, "technicians"), (snapshot) => {
        setTechnicians(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician)));
    }, () => setTechnicians([]));

    const unsubTickets = onSnapshot(collection(db, "external-tickets"), (snapshot) => {
        setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket)));
        setPullDistance(0);
    }, () => setTickets([]));
    
    const unsubChecklists = onSnapshot(collection(db, "checklists"), (snapshot) => {
        setChecklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist)));
    }, () => setChecklists([]));

    // Failsafe to turn off loading
    const timer = setTimeout(() => setLoading(false), 3000);

    return () => {
        unsubUsers();
        unsubSectors();
        unsubTechs();
        unsubTickets();
        unsubChecklists();
        clearTimeout(timer);
    };
}, []);

  
  // Persist status filter to session storage
  useEffect(() => {
    sessionStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter);
  }, [statusFilter]);
  
  // Persist view mode
  useEffect(() => {
    if (!isMobile) {
        sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode, isMobile]);
  
  // Set "myTicketsOnly" to true by default for certain statuses, unless a tech is filtered.
  useEffect(() => {
    if ((statusFilter === 'em andamento' || statusFilter === 'concluído') && technicianFilter === 'all') {
      setMyTicketsOnly(true);
    } else {
      setMyTicketsOnly(false);
    }
    
    // Reset technician filter when switching to 'pendente'
    if (statusFilter === 'pendente') {
      setTechnicianFilter('all');
    }
  }, [statusFilter, technicianFilter]);

  // Uncheck "myTicketsOnly" if a technician is selected from the filter
  useEffect(() => {
    if (technicianFilter !== 'all') {
      setMyTicketsOnly(false);
    }
  }, [technicianFilter]);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && pullStartY > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0) {
        e.preventDefault(); // Prevent browser's default pull-to-refresh
        setPullDistance(Math.min(distance, 150));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 100) {
        // With real-time, manual refresh is less critical, but we can keep it as a backup.
        // The listener will handle the updates, so we just reset the visual.
        setPullDistance(0);
    } else {
      setPullDistance(0);
    }
    setPullStartY(0);
  };


  const handleAddTicket = async (values: NewExternalTicketFormValues & { type: 'padrão' | 'contrato' | 'urgente' | 'agendado' | 'retorno', slaExpiresAt?: string, priority?: string }) => {
    if (!user) return;
  
    const newTicketData: Partial<ExternalTicket> = {
      client: {
        id: '', // Will be filled if clientId exists
        name: values.clientName,
        phone: values.contact || '',
        isWhats: values.isWhatsapp,
      },
      sectorId: values.sectorId,
      creatorId: user.id,
      description: values.description,
      type: values.type,
      status: 'pendente' as const, // Default status
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(values.priority && { priority: values.priority as any }),
    };
  
    if (values.clientId) {
      newTicketData.client.id = values.clientId;
    }
  
    if (values.address?.street) {
      newTicketData.client.address = `${values.address.street}, ${values.address.number || 'S/N'} - ${values.address.neighborhood}, ${values.address.city} - ${values.address.state}`;
    }
  
    if (values.requesterName) {
      newTicketData.requesterName = values.requesterName;
    }
  
    if (values.assigneeId) {
      newTicketData.technicianId = values.assigneeId;
      newTicketData.status = 'em andamento';
    }
  
    if (values.scheduledToDate) {
      const timePart = values.scheduledToTime || '00:00:00';
      const datePart = values.scheduledToDate.toISOString().split('T')[0];
      newTicketData.scheduledTo = `${datePart}T${timePart}`;
    }
  
    if (values.slaExpiresAt) {
      newTicketData.slaExpiresAt = values.slaExpiresAt;
    }

    if (values.checklistId) {
      const selectedChecklist = checklists.find(c => c.id === values.checklistId);
      if(selectedChecklist) {
          newTicketData.checklistId = values.checklistId;
          newTicketData.checklist = selectedChecklist.tasks.map(task => ({ taskId: task.id, completed: false, observation: '', photo: '' }));
      }
    }
  
    try {
      const docRef = await addDoc(collection(db, "external-tickets"), newTicketData);
      
      const sector = sectors.find(s => s.id === newTicketData.sectorId);
      const sectorGroupId = sector?.whatsappGroupId;
      
      let messageStatusText = `*Status:* ${newTicketData.status === 'pendente' ? 'Pendente' : `Em andamento por ${user.name}`}`;
      const assignedTechnician = technicians.find(t => t.id === newTicketData.technicianId);

      if (newTicketData.technicianId && assignedTechnician) {
          messageStatusText = `*Status:* Em andamento por ${assignedTechnician.name}`;
      }
      
      let message = `⚠️ Novo Chamado Criado ⚠️\n\n`
          + `*Cliente:* ${newTicketData.client.name}\n`
          + `*Contato:* ${newTicketData.client.phone || 'N/A'}\n`
          + `*Solicitante:* ${newTicketData.requesterName || 'N/A'}\n`
          + `*Endereço:* ${newTicketData.client.address || 'N/A'}\n\n`
          + `*Descrição:* ${newTicketData.description}\n\n`
          + `*Tipo:* ${newTicketData.type}`;

      if (newTicketData.type === 'contrato' && newTicketData.priority) {
        message += `\n*Prioridade do Contrato:* 🚨${newTicketData.priority}`;
      }

      message += `\n*Atribuído por:* ${user.name}\n\n`
               + `${messageStatusText}`;

      if (newTicketData.technicianId) {
        const techUser = users.find(u => u.id === assignedTechnician?.userId);
        if (techUser?.phone) {
            await sendWhatsappMessage(techUser.phone, message, techUser.id, `/external-tickets/${docRef.id}`);
        }
      }
      // Sempre notifica o grupo, se houver
      if (sectorGroupId) {
          await sendWhatsappMessage(sectorGroupId, message);
      }

      await addDoc(collection(db, "system-logs"), {
        userId: user.id,
        event: 'EXTERNAL_TICKET_CREATED',
        timestamp: new Date().toISOString(),
        details: {
            ticketId: docRef.id,
            clientName: values.clientName,
        }
      });
      
      setIsNewTicketDialogOpen(false);
      toast({
        title: 'Chamado criado com sucesso!',
        description: `O chamado para ${values.clientName} foi aberto.`,
      });
  
    } catch (error) {
       console.error("Error adding ticket: ", error);
       toast({
        variant: "destructive",
        title: "Erro ao criar chamado",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
      });
      // Re-throw to inform the form
      throw error;
    }
  }
  
  const handleViewDetails = (ticketId: string) => {
    router.push(`/external-tickets/${ticketId}`);
  };

  const handleStatusChange = async (id: string, status: ExternalTicket['status']) => {
    const ticketRef = doc(db, "external-tickets", id);
    try {
      await updateDoc(ticketRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error updating status for ticket ${id}:`, error);
       toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o chamado. Tente novamente.",
      });
    }
  };

  const handleAssignTicket = async (id: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
        const ticket = tickets.find(t => t.id === id);
        if (ticket) {
            await updateDoc(ticketRef, {
                technicianId: user.id,
                status: 'em andamento',
                updatedAt: new Date().toISOString(),
            });
            
            const sector = sectors.find(s => s.id === ticket.sectorId);
            const sectorGroupId = sector?.whatsappGroupId;
            
            const message = `🏃‍♂️ Chamado em Andamento 🏃‍♂️\n\n*Cliente:* ${ticket.client.name}\n*Status:* Em andamento por ${user.name}`;
            if (sectorGroupId) {
                await sendWhatsappMessage(sectorGroupId, message);
            }
        }

        toast({ title: 'Chamado Atribuído!', description: `Você pegou o chamado #${id.substring(0,4)}.` });
    } catch (error) {
        console.error(`Error assigning ticket ${id}:`, error);
        toast({ variant: 'destructive', title: 'Erro ao atribuir chamado.' });
    }
  }
  
  const handleSetEnRoute = async (ticketId: string) => {
    if (!user || user.role !== 'tecnico') return;

    const batch = writeBatch(db);
    let targetTicket: ExternalTicket | undefined;

    const enRouteTime = new Date().toISOString();

    tickets.forEach(t => {
        if (t.technicianId === user.id) {
            const isTarget = t.id === ticketId;
            if (t.enRoute && !isTarget) {
                const ticketRef = doc(db, "external-tickets", t.id);
                batch.update(ticketRef, { enRoute: deleteField(), enRouteAt: deleteField() });
            }
            if (isTarget) {
                const ticketRef = doc(db, "external-tickets", ticketId);
                batch.update(ticketRef, { enRoute: true, enRouteAt: enRouteTime });
                targetTicket = { ...t, enRoute: true, enRouteAt: enRouteTime };
            }
        }
    });

    try {
        await batch.commit();
        if (targetTicket) {
            toast({
                title: 'A caminho!',
                description: `Próximo destino: ${targetTicket.client.name}.`,
            });
        }
    } catch (error) {
        console.error("Error setting en-route status:", error);
        toast({ variant: "destructive", title: "Erro ao marcar rota", description: "Não foi possível atualizar o status. Tente novamente." });
    }
};

  const handleReopenTicket = async (id: string, reason: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
      const comment: Comment = {
        id: `comment-${Date.now()}`,
        authorId: user.id,
        content: `**Chamado Reaberto:** ${reason}`,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(ticketRef, {
        status: 'pendente',
        type: 'retorno',
        technicianId: deleteField(),
        updatedAt: new Date().toISOString(),
        comments: arrayUnion(comment)
      });
      toast({
        title: 'Chamado Reaberto com Sucesso!',
        description: `O chamado #${id.substring(0,4)} foi movido para pendentes como retorno.`,
      });
    } catch (error) {
      console.error("Error reopening ticket: ", error);
       toast({
        variant: "destructive",
        title: "Erro ao reabrir chamado",
        description: "Não foi possível atualizar o chamado. Tente novamente.",
      });
    }
  };
  
  const handleCancelTicket = async (id: string, reason: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
        const comment: Comment = {
            id: `comment-${Date.now()}`,
            authorId: user.id,
            content: `**Chamado Cancelado:** ${reason}`,
            createdAt: new Date().toISOString(),
        };

        await updateDoc(ticketRef, {
            status: 'cancelado',
            updatedAt: new Date().toISOString(),
            comments: arrayUnion(comment),
        });

        toast({
            title: 'Chamado Cancelado',
            description: `O chamado #${id.substring(0,4)} foi cancelado.`,
        });

    } catch (error) {
        console.error("Error cancelling ticket: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao cancelar chamado",
            description: "Não foi possível atualizar o chamado. Tente novamente.",
        });
    }
  };

  const handleConfirmAction = (action: 'reopen' | 'cancel' | 'take', ticket: ExternalTicket) => {
    setConfirmation({ isOpen: true, action, ticket, reason: '' });
  };

  const executeConfirmedAction = async () => {
    if (!confirmation.ticket || !confirmation.action) return;

    const { ticket, action, reason } = confirmation;

    if (action === 'reopen' || action === 'cancel') {
        if (!reason) {
            toast({ variant: 'destructive', title: 'Justificativa obrigatória' });
            return;
        }
        if (action === 'reopen') {
            await handleReopenTicket(ticket.id, reason);
        } else {
            await handleCancelTicket(ticket.id, reason);
        }
    } else if (action === 'take') {
        await handleAssignTicket(ticket.id);
    }

    setConfirmation({ isOpen: false, action: null, ticket: null });
  };
  
  const getConfirmationContent = () => {
    switch (confirmation.action) {
      case 'reopen': return (
        <>
            <AlertDialogTitle>Reabrir Chamado</AlertDialogTitle>
            <AlertDialogDescription>
                Por favor, informe o motivo para reabrir este chamado. A justificativa será adicionada aos comentários.
            </AlertDialogDescription>
            <div className="py-4">
                <Label htmlFor="reopen-reason">Justificativa</Label>
                <Textarea 
                    id="reopen-reason"
                    placeholder="Ex: O problema persistiu..."
                    value={confirmation.reason}
                    onChange={(e) => setConfirmation(c => ({ ...c, reason: e.target.value }))}
                />
            </div>
        </>
      );
      case 'cancel': return (
        <>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
                Informe o motivo do cancelamento. Essa informação será salva nos comentários do chamado.
            </AlertDialogDescription>
            <div className="py-4">
                <Label htmlFor="cancel-reason">Justificativa</Label>
                <Textarea 
                    id="cancel-reason"
                    placeholder="Ex: Cliente solicitou o cancelamento..."
                    value={confirmation.reason}
                    onChange={(e) => setConfirmation(c => ({ ...c, reason: e.target.value }))}
                />
            </div>
        </>
      );
       case 'take': return (
        <>
            <AlertDialogTitle>Confirmar Atribuição</AlertDialogTitle>
            <AlertDialogDescription>
                Você tem certeza que deseja pegar este chamado?
            </AlertDialogDescription>
        </>
      );
      default: return null;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    // Role-based visibility pre-filter
    if (user?.role === 'encarregado' || user?.role === 'tecnico') {
        if (!user.sectorIds?.includes(ticket.sectorId)) return false;
    }
    
    // Search Query Filter
    const query = searchQuery.toLowerCase();
    if (query && 
        !ticket.client.name.toLowerCase().includes(query) &&
        !ticket.description.toLowerCase().includes(query) &&
        !(ticket.requesterName && ticket.requesterName.toLowerCase().includes(query))
    ) {
        return false;
    }

    // UI Filter
    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false;
    }
    if (technicianFilter !== 'all' && ticket.technicianId !== technicianFilter) {
        return false;
    }
    if (sectorFilter !== 'all' && ticket.sectorId !== sectorFilter) {
        return false;
    }
    if (contractOnly && ticket.type !== 'contrato') {
      return false;
    }
    if (myTicketsOnly && user && ticket.technicianId !== user.id) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    // Regra para 'Concluído': mais recentes primeiro
    if (statusFilter === 'concluído') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    
    // Regra para 'Todos': mais recentes primeiro
    if (statusFilter === 'all') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    // Regra para 'Em Andamento' com rota definida
    if (statusFilter === 'em andamento' && user?.routeOrder && user.routeOrder.length > 0) {
        const routeOrder = user.routeOrder;
        const indexA = routeOrder.indexOf(a.id);
        const indexB = routeOrder.indexOf(b.id);
  
        // Se ambos estiverem na rota, ordene pela rota
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // Se apenas A estiver na rota, ele vem primeiro
        if (indexA !== -1) return -1;
        // Se apenas B estiver na rota, ele vem primeiro
        if (indexB !== -1) return 1;
        // Se nenhum estiver na rota, cai para a ordenação padrão abaixo
    }

    // Ordenação padrão por prioridade (para Pendente, Em Andamento sem rota, etc.)
    const priorityOrder = {
      'agendado-atrasado': -1,
      'agendado-hoje': 0,
      'retorno': 1,
      'contrato': 2,
      'urgente': 3,
      'padrão': 4,
      'agendado-futuro': 5,
    };

    const getPriority = (ticket: ExternalTicket) => {
      if (ticket.type === 'agendado' && ticket.scheduledTo) {
          const scheduledDate = parseISO(ticket.scheduledTo);
          if (isPast(scheduledDate) && !isToday(scheduledDate)) {
              return priorityOrder['agendado-atrasado'];
          }
          if (isToday(scheduledDate)) {
              return priorityOrder['agendado-hoje'];
          }
          return priorityOrder['agendado-futuro'];
      }
      return priorityOrder[ticket.type as keyof typeof priorityOrder] ?? 99;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Se a prioridade for a mesma, ordene por data de criação (mais antigos primeiro)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  
  const hasActiveRoute = tickets.some(t => t.technicianId === user?.id && t.enRoute);


  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
    <Dialog open={isNewTicketDialogOpen} onOpenChange={setIsNewTicketDialogOpen}>
      <PageHeader title="Chamados Externos" description="Gerencie os chamados de clientes externos.">
        <div className="flex items-center gap-2">
            {!isMobile && (
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                    <ToggleGroupItem value="kanban" aria-label="Kanban view"><LayoutDashboard className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
            )}
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Chamado
                </Button>
            </DialogTrigger>
        </div>
      </PageHeader>
      
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div
            className="flex items-center justify-center p-4 text-muted-foreground transition-all duration-300"
            style={{ height: pullDistance / 2, opacity: Math.min(pullDistance / 100, 1) }}
        >
            <RefreshCcw className={`h-6 w-6 ${pullDistance > 100 ? 'animate-spin' : ''}`} />
        </div>

        <div className="py-4">
            <ExternalTicketsFilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            technicianFilter={technicianFilter}
            onTechnicianChange={setTechnicianFilter}
            sectorFilter={sectorFilter}
            onSectorChange={setSectorFilter}
            contractOnly={contractOnly}
            onContractOnlyChange={setContractOnly}
            myTicketsOnly={myTicketsOnly}
            onMyTicketsOnlyChange={setMyTicketsOnly}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentUser={user}
            sectors={sectors}
            />
        </div>

        {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTickets.map(ticket => (
                <ExternalTicketCard 
                    key={ticket.id} 
                    ticket={ticket}
                    users={users}
                    sectors={sectors}
                    currentUser={user}
                    hasActiveRoute={hasActiveRoute}
                    onViewDetails={() => handleViewDetails(ticket.id)}
                    onConfirmAction={handleConfirmAction}
                    onAssignToMe={() => handleConfirmAction('take', ticket)}
                    onSetEnRoute={() => handleSetEnRoute(ticket.id)}
                    onStatusChange={handleStatusChange}
                />
                ))}
                {filteredTickets.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    Nenhum chamado encontrado com os filtros selecionados.
                </div>
                )}
            </div>
        ) : (
            <ExternalTicketsTable 
              data={filteredTickets} 
              users={users} 
              sectors={sectors} 
              currentUser={user}
              hasActiveRoute={hasActiveRoute}
              onSetEnRoute={handleSetEnRoute}
              onViewDetails={handleViewDetails}
            />
        )}
      </div>

       <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
            <DialogTitle>Novo Chamado Externo</DialogTitle>
            </DialogHeader>
            <NewExternalTicketForm 
                onFinished={() => setIsNewTicketDialogOpen(false)} 
                onSave={async (values) => {
                    await handleAddTicket(values);
                }}
            />
        </DialogContent>

        <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
            <DialogTrigger asChild>
                <Button size="icon" className="rounded-full h-14 w-14 shadow-lg">
                    <PlusCircle className="h-6 w-6" />
                    <span className="sr-only">Novo Chamado</span>
                </Button>
            </DialogTrigger>
        </div>


       <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => !open && setConfirmation({isOpen: false, action: null, ticket: null})}>
        <AlertDialogContent>
            <AlertDialogHeader>
                {getConfirmationContent()}
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={executeConfirmedAction} disabled={(confirmation.action === 'reopen' || confirmation.action === 'cancel') && !confirmation.reason}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
    </>
  );
}
